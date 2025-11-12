// script.js

// Variável global do banco de dados (acessada via window.db, definido em firebase-init.js)
const db = window.db; 

// 1. VARIÁVEIS GLOBAIS DA TABELA
const table = document.getElementById('editable-table');
const headerRow = document.getElementById('table-header');
const tbody = table.querySelector('tbody');
let draggedCol = null;

// =========================================================================
// A. LÓGICA DA TABELA DINÂMICA
// =========================================================================

// --- FUNÇÕES DE SETUP E MANIPULAÇÃO DA TABELA (MANTIDAS) ---

// Função para adicionar uma nova linha
document.getElementById('add-row').addEventListener('click', () => {
    const newRow = tbody.insertRow();
    const colCount = headerRow.cells.length;

    for (let i = 0; i < colCount; i++) {
        const cell = newRow.insertCell(i);
        if (i < colCount - 1) { 
            cell.setAttribute('contenteditable', 'true');
            cell.textContent = '0.00';
        } else { 
            cell.innerHTML = '<button class="delete-row">Excluir</button>';
        }
    }
});

// Delega o evento para excluir a linha
tbody.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-row')) {
        e.target.closest('tr').remove();
    }
});

// Funções de Drag and Drop e addColumn (MANTIDAS)
function setupDragListeners(header) {
    header.addEventListener('dragstart', (e) => {
        draggedCol = header;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => header.classList.add('dragging'), 0); 
    });
    header.addEventListener('dragend', () => {
        draggedCol = null;
        header.classList.remove('dragging');
    });
    header.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        if (draggedCol && draggedCol !== header && header.textContent !== 'Ações') {
            header.classList.add('drag-over');
        }
    });
    header.addEventListener('dragleave', () => {
        header.classList.remove('drag-over');
    });
    header.addEventListener('drop', (e) => {
        e.preventDefault();
        header.classList.remove('drag-over');

        if (draggedCol && draggedCol !== header && header.textContent !== 'Ações' && draggedCol.textContent !== 'Ações') {
            const fromIndex = Array.from(headerRow.cells).indexOf(draggedCol);
            const toIndex = Array.from(headerRow.cells).indexOf(header);
            if (fromIndex < toIndex) {
                headerRow.insertBefore(draggedCol, header.nextElementSibling);
            } else {
                headerRow.insertBefore(draggedCol, header);
            }
            Array.from(tbody.rows).forEach(row => {
                const cellToMove = row.cells[fromIndex];
                const targetCell = row.cells[toIndex];
                if (fromIndex < toIndex) {
                    row.insertBefore(cellToMove, targetCell.nextElementSibling);
                } else {
                    row.insertBefore(cellToMove, targetCell);
                }
            });
        }
    });
}
Array.from(headerRow.cells).forEach(th => {
    if (th.textContent !== 'Ações') { 
        setupDragListeners(th);
    }
});
function addColumn(insertBeforeIndex) {
    const newHeader = document.createElement('th');
    newHeader.setAttribute('contenteditable', 'true');
    newHeader.setAttribute('draggable', 'true');
    newHeader.textContent = 'Nova Coluna';
    setupDragListeners(newHeader); 
    let targetIndex = insertBeforeIndex ? 0 : headerRow.cells.length - 1;
    headerRow.insertBefore(newHeader, headerRow.cells[targetIndex]);
    Array.from(tbody.rows).forEach(row => {
        const newCell = row.insertCell(targetIndex);
        newCell.setAttribute('contenteditable', 'true');
        newCell.textContent = 'Novo Dado';
    });
}
document.getElementById('add-column-right').addEventListener('click', () => addColumn(false));
document.getElementById('add-column-left').addEventListener('click', () => addColumn(true));

// =========================================================================
// B. PERSISTÊNCIA DE DADOS (CARREGAMENTO e SALVAMENTO)
// =========================================================================

/**
 * Função utilitária para limpar a string (chave do Firebase).
 */
function sanitizeKey(str) {
    let sanitized = str.toLowerCase();
    sanitized = sanitized.replace(/[^a-z0-9]+/g, '_'); 
    sanitized = sanitized.replace(/^_+|_+$/g, ''); 
    return sanitized;
}


// --- 1. FUNÇÃO DE SALVAMENTO (MANTIDA) ---

document.getElementById('save-table').addEventListener('click', () => {
    if (!db) {
        alert("Erro: O Firebase não foi inicializado corretamente. Verifique o console.");
        return;
    }

    const tableData = [];
    const sanitizedHeaders = [];
    const rows = table.querySelectorAll('tbody tr');

    headerRow.querySelectorAll('th').forEach(th => {
        if (th.textContent !== 'Ações') {
            const originalHeader = th.textContent.trim();
            const sanitized = sanitizeKey(originalHeader);
            
            if (sanitized) {
                 sanitizedHeaders.push(sanitized); 
            } else {
                sanitizedHeaders.push(`coluna_${sanitizedHeaders.length + 1}`);
            }
        }
    });

    rows.forEach(row => {
        const rowData = {};
        const cells = row.querySelectorAll('td');

        cells.forEach((cell, index) => {
            if (index < sanitizedHeaders.length) {
                const sanitizedKey = sanitizedHeaders[index]; 
                rowData[sanitizedKey] = cell.textContent.trim();
            }
        });
        tableData.push(rowData);
    });

    // 4. Estrutura e envia para o Firebase, recarrega a tabela após sucesso
    const dataToSave = {
        data_salvamento: new Date().toISOString(),
        tabela_investimentos: tableData,
        // Salva os nomes originais dos cabeçalhos para recriar a tabela
        nomes_cabecalhos: Array.from(headerRow.cells).slice(0, -1).map(th => th.textContent.trim()) 
    };

    const tableRef = db.ref('tabelas_personalizadas');
    tableRef.push(dataToSave)
        .then(() => {
            alert("Tabela de investimentos salva com sucesso!");
            // 🚨 NOVO: Recarrega a tabela para exibir a versão atualizada
            loadTableData(); 
        })
        .catch((error) => {
            console.error("Erro ao salvar a tabela:", error);
            alert("Erro ao salvar a tabela. Verifique o console.");
        });
});


// --- 2. FUNÇÃO DE RENDERIZAÇÃO E CARREGAMENTO (NOVO) ---

/**
 * Limpa e reconstrói o cabeçalho e as linhas da tabela com base nos dados do Firebase.
 * @param {object} latestRecord - O objeto de dados lido do Firebase (tabela_investimentos e nomes_cabecalhos).
 */
function renderTable(latestRecord) {
    const tableData = latestRecord.tabela_investimentos || [];
    const headerNames = latestRecord.nomes_cabecalhos || [];
    
    // Limpa o corpo da tabela
    tbody.innerHTML = '';
    
    // 1. Limpa e reconstrói o cabeçalho (TH)
    headerRow.innerHTML = '';
    
    headerNames.forEach(name => {
        const newHeader = document.createElement('th');
        newHeader.setAttribute('contenteditable', 'true');
        newHeader.setAttribute('draggable', 'true');
        newHeader.textContent = name;
        setupDragListeners(newHeader); // Re-associa os listeners de drag
        headerRow.appendChild(newHeader);
    });
    // Adiciona o cabeçalho 'Ações' fixo
    headerRow.innerHTML += '<th>Ações</th>';


    // 2. Preenche o corpo da tabela (TD)
    tableData.forEach(rowData => {
        const newRow = tbody.insertRow();
        
        // Itera sobre as chaves (sanitizadas) do objeto de dados
        headerNames.forEach(originalName => {
            const sanitizedKey = sanitizeKey(originalName);
            const cell = newRow.insertCell();
            cell.setAttribute('contenteditable', 'true');
            // Busca o valor usando a chave limpa salva
            cell.textContent = rowData[sanitizedKey] || ''; 
        });
        
        // Adiciona o botão de exclusão na última célula
        const deleteCell = newRow.insertCell();
        deleteCell.innerHTML = '<button class="delete-row">Excluir</button>';
    });
}


/**
 * Busca o último registro de 'tabelas_personalizadas' no Firebase.
 */
function loadTableData() {
    if (!db) return; // Sai se o DB não estiver pronto

    const tableRef = db.ref('tabelas_personalizadas');
    
    // Busca o último registro, ordenado por chave ($key) e limitado a 1.
    // Você pode usar orderByChild('data_salvamento') se quiser garantir o último
    // por data, mas orderByValue/Key geralmente funciona para o último push.
    tableRef.limitToLast(1).once('value', snapshot => {
        if (snapshot.exists()) {
            const latestRecordKey = Object.keys(snapshot.val())[0];
            const latestRecord = snapshot.val()[latestRecordKey];
            
            // Renderiza a tabela com os dados lidos
            renderTable(latestRecord);
        } else {
            console.log("Nenhum dado de tabela encontrado no Firebase. Usando estrutura HTML padrão.");
            // Opcional: manter o cabeçalho e a linha de exemplo do HTML se nada for encontrado.
            
        }
    })
    .catch(error => {
        console.error("Erro ao carregar dados do Firebase:", error);
    });
}

// 3. PONTO DE ENTRADA: Carrega os dados assim que o script terminar de carregar
window.onload = function() {
    // Certifica-se que o firebase-init.js rodou e definiu window.db
    if (window.db) {
        loadTableData();
    } else {
        // Adiciona um listener para garantir que o loadTableData seja chamado após a inicialização
        setTimeout(loadTableData, 500); 
    }
};
