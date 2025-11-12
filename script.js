// script.js

// 🚨 CORREÇÃO: A linha de import do Firebase FOI REMOVIDA para corrigir o SyntaxError.

// Variável global do banco de dados (acessada via window.db, definido em firebase-init.js)
const db = window.db; 

// 2. VARIÁVEIS GLOBAIS DA TABELA
const table = document.getElementById('editable-table');
const headerRow = document.getElementById('table-header');
const tbody = table.querySelector('tbody');
let draggedCol = null;

// =========================================================================
// A. LÓGICA DA CALCULADORA DE JUROS COMPOSTOS (E SALVAMENTO NO FIREBASE)
// =========================================================================

document.getElementById('calculator-form').addEventListener('submit', function(e) {
    e.preventDefault(); 

    // Coletar e validar os valores de entrada
    const initialInvestment = parseFloat(document.getElementById('initial-investment').value);
    const monthlyContribution = parseFloat(document.getElementById('monthly-contribution').value);
    const annualRate = parseFloat(document.getElementById('annual-rate').value) / 100; 
    const years = parseFloat(document.getElementById('years').value);

    const months = years * 12; 
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

    // Cálculo do Valor Futuro (VF)
    const fv_initial = initialInvestment * Math.pow(1 + monthlyRate, months);
    const fv_contributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    const finalAmount = fv_initial + fv_contributions;

    // Exibir o resultado
    const resultElement = document.getElementById('final-amount');
    
    if (isNaN(finalAmount)) {
        resultElement.textContent = "Por favor, insira valores válidos.";
        resultElement.style.color = 'red';
        return; 
    } else {
         const formattedAmount = finalAmount.toLocaleString('pt-BR', {
             style: 'currency',
             currency: 'BRL'
         });
         resultElement.textContent = formattedAmount;
         resultElement.style.color = '#28a745';
    }

    // 3. Armazenar os dados no Firebase (USANDO .ref() e .push() do DB)
    const calculationData = {
        data_registro: new Date().toISOString(),
        investimento_inicial: initialInvestment,
        aportes_mensais: monthlyContribution,
        taxa_anual_pct: annualRate * 100,
        anos: years,
        valor_final_calculado: finalAmount
    };

    const calculationsRef = db.ref('calculos_juros_compostos'); 
    calculationsRef.push(calculationData)
        .then(() => {
            console.log("Cálculo armazenado com sucesso no Firebase!");
        })
        .catch((error) => {
            console.error("Erro ao escrever no Firebase:", error);
            alert("Erro ao salvar o cálculo no Firebase.");
        });
});

// =========================================================================
// B. LÓGICA DA TABELA DINÂMICA
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

// Função para configurar os ouvintes de Drag and Drop (arrastar e soltar)
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
// C. SALVAMENTO DA TABELA NO FIREBASE
// =========================================================================

document.getElementById('save-table').addEventListener('click', () => {
    if (!db) {
        alert("Erro: O Firebase não foi inicializado corretamente. Verifique o console.");
        return;
    }

    const tableData = [];
    const headers = [];
    const rows = table.querySelectorAll('tbody tr');

    // 1. Coleta os cabeçalhos (THs)
    headerRow.querySelectorAll('th').forEach(th => {
        if (th.textContent !== 'Ações') {
            headers.push(th.textContent.trim());
        }
    });

    // 2. Coleta os dados de cada linha
    rows.forEach(row => {
        const rowData = {};
        const cells = row.querySelectorAll('td');

        cells.forEach((cell, index) => {
            if (index < headers.length) {
                const headerName = headers[index];
                rowData[headerName] = cell.textContent.trim();
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
            alert("Erro ao salvar a tabela. Verifique o console.");
        });
});
