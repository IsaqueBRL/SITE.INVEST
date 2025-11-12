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

// Funções de Drag and Drop (arrastar e soltar) mantidas
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

            // Mover o cabeçalho (TH)
            if (fromIndex < toIndex) {
                headerRow.insertBefore(draggedCol, header.nextElementSibling);
            } else {
                headerRow.insertBefore(draggedCol, header);
            }

            // Mover as células (TD) em cada linha
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

// Inicializa os ouvintes de Drag and Drop para os cabeçalhos existentes
Array.from(headerRow.cells).forEach(th => {
    if (th.textContent !== 'Ações') { 
        setupDragListeners(th);
    }
});

// Função principal para adicionar nova coluna
function addColumn(insertBeforeIndex) {
    const newHeader = document.createElement('th');
    newHeader.setAttribute('contenteditable', 'true');
    newHeader.setAttribute('draggable', 'true');
    newHeader.textContent = 'Nova Coluna';
    setupDragListeners(newHeader); 

    let targetIndex = insertBeforeIndex ? 0 : headerRow.cells.length - 1;
    
    // Adiciona o cabeçalho (TH)
    headerRow.insertBefore(newHeader, headerRow.cells[targetIndex]);

    // Adiciona a célula (TD) em cada linha
    Array.from(tbody.rows).forEach(row => {
        const newCell = row.insertCell(targetIndex);
        newCell.setAttribute('contenteditable', 'true');
        newCell.textContent = 'Novo Dado';
    });
}

// Eventos de clique para adicionar coluna
document.getElementById('add-column-right').addEventListener('click', () => addColumn(false));
document.getElementById('add-column-left').addEventListener('click', () => addColumn(true));


// =========================================================================
// B. SALVAMENTO DA TABELA NO FIREBASE (CORRIGIDO)
// =========================================================================

/**
 * Função utilitária APRIMORADA para limpar a string, removendo TODOS os caracteres
 * inválidos para chaves do Firebase.
 * Troca espaços por underscore e remove caracteres especiais.
 * @param {string} str - O nome do cabeçalho original.
 * @returns {string} - A chave limpa.
 */
function sanitizeKey(str) {
    // 1. Converte para minúsculas
    let sanitized = str.toLowerCase();
    
    // 2. Remove todos os caracteres que NÃO são letras (a-z) ou números (0-9)
    // O '+' agrupa múltiplos caracteres não-válidos em um único '_'
    sanitized = sanitized.replace(/[^a-z0-9]+/g, '_'); 
    
    // 3. Remove underscores do início e do fim, caso existam
    sanitized = sanitized.replace(/^_+|_+$/g, ''); 
    
    return sanitized;
}


document.getElementById('save-table').addEventListener('click', () => {
    if (!db) {
        alert("Erro: O Firebase não foi inicializado corretamente. Verifique o console.");
        return;
    }

    const tableData = [];
    const sanitizedHeaders = []; // Apenas chaves limpas são necessárias para o Firebase
    const rows = table.querySelectorAll('tbody tr');

    // 1. Coleta e LIMPA os cabeçalhos (THs)
    headerRow.querySelectorAll('th').forEach(th => {
        if (th.textContent !== 'Ações') {
            const originalHeader = th.textContent.trim();
            const sanitized = sanitizeKey(originalHeader);
            
            // Certifica-se de que a chave limpa não está vazia
            if (sanitized) {
                 sanitizedHeaders.push(sanitized); 
            } else {
                // Se a coluna for apenas de símbolos e ficar vazia, use um nome genérico
                sanitizedHeaders.push(`coluna_${sanitizedHeaders.length + 1}`);
            }
        }
    });

    // 2. Coleta os dados de cada linha, usando as chaves limpas (CORREÇÃO DE USO)
    rows.forEach(row => {
        const rowData = {};
        const cells = row.querySelectorAll('td');

        cells.forEach((cell, index) => {
            // Usa o índice para mapear o conteúdo da célula para a chave limpa
            if (index < sanitizedHeaders.length) {
                const sanitizedKey = sanitizedHeaders[index]; 
                rowData[sanitizedKey] = cell.textContent.trim();
            }
        });
        tableData.push(rowData);
    });

    // 3. Estrutura e envia para o Firebase
    const dataToSave = {
        data_salvamento: new Date().toISOString(),
        tabela_investimentos: tableData
    };

    const tableRef = db.ref('tabelas_personalizadas');
    tableRef.push(dataToSave)
        .then(() => {
            alert("Tabela de investimentos salva com sucesso!");
        })
        .catch((error) => {
            console.error("Erro ao salvar a tabela:", error);
            alert("Erro ao salvar a tabela. Verifique o console ou a autenticação do Firebase (Regras de Leitura/Escrita).");
        });
});
