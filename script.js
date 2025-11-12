// Obtém referências para os elementos principais
const table = document.getElementById('editable-table');
const headerRow = document.getElementById('table-header');
const tbody = table.querySelector('tbody');

// Variáveis para Drag and Drop
let draggedCol = null;

// --- A. Funções de Adicionar/Excluir Linha/Coluna ---

// Adiciona uma nova linha
document.getElementById('add-row').addEventListener('click', () => {
    const newRow = tbody.insertRow();
    const colCount = headerRow.cells.length;

    for (let i = 0; i < colCount; i++) {
        const cell = newRow.insertCell(i);
        if (i < colCount - 1) { // Para todas as células exceto a de Ações
            cell.setAttribute('contenteditable', 'true');
            cell.textContent = 'Novo Valor';
        } else { // Célula de Ações
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

/**
 * Adiciona uma nova coluna
 * @param {boolean} insertBeforeAction - Se verdadeiro, insere antes da coluna 'Ações'.
 */
function addColumn(insertBeforeAction) {
    // 1. Adiciona o cabeçalho
    const newHeader = document.createElement('th');
    newHeader.setAttribute('contenteditable', 'true');
    newHeader.setAttribute('draggable', 'true');
    newHeader.textContent = 'Nova Coluna';

    // Para o drag and drop (será configurado mais abaixo)
    setupDragListeners(newHeader); 

    let insertionIndex = headerRow.cells.length - 1; // Padrão: antes da coluna 'Ações'

    if (!insertBeforeAction) {
        // Se for à direita, deve ser inserido antes da coluna "Ações"
        headerRow.insertBefore(newHeader, headerRow.cells[insertionIndex]);
    } else {
        // Se for à esquerda (padrão), insere antes da segunda coluna (índice 1)
        headerRow.insertBefore(newHeader, headerRow.cells[0]);
        insertionIndex = 0;
    }

    // 2. Adiciona a célula para cada linha existente
    Array.from(tbody.rows).forEach(row => {
        const newCell = row.insertCell(insertionIndex);
        newCell.setAttribute('contenteditable', 'true');
        newCell.textContent = '0.00';
    });
}

document.getElementById('add-column-right').addEventListener('click', () => addColumn(false));
document.getElementById('add-column-left').addEventListener('click', () => addColumn(true));


// --- B. Funções de Movimentação (Drag and Drop) ---

// Função para configurar os ouvintes de evento para o cabeçalho
function setupDragListeners(header) {
    header.addEventListener('dragstart', (e) => {
        draggedCol = header;
        e.dataTransfer.effectAllowed = 'move';
        // Adiciona um pequeno atraso para a classe de arrasto ser aplicada corretamente
        setTimeout(() => header.classList.add('dragging'), 0); 
    });

    header.addEventListener('dragend', () => {
        draggedCol = null;
        header.classList.remove('dragging');
    });

    header.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessário para permitir o drop
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

        if (draggedCol && draggedCol !== header && header.textContent !== 'Ações') {
            // Não permite mover a coluna 'Ações'
            if (draggedCol.textContent === 'Ações') return;

            // 1. Identificar o índice da coluna arrastada e da coluna de destino
            const fromIndex = Array.from(headerRow.cells).indexOf(draggedCol);
            const toIndex = Array.from(headerRow.cells).indexOf(header);

            // 2. Mover o cabeçalho (TH)
            if (fromIndex < toIndex) {
                headerRow.insertBefore(draggedCol, header.nextElementSibling);
            } else {
                headerRow.insertBefore(draggedCol, header);
            }

            // 3. Mover as células (TD) em cada linha
            Array.from(tbody.rows).forEach(row => {
                const cellToMove = row.cells[fromIndex];
                const targetCell = row.cells[toIndex];
                
                if (fromIndex < toIndex) {
                    // Mover para a direita
                    row.insertBefore(cellToMove, targetCell.nextElementSibling);
                } else {
                    // Mover para a esquerda
                    row.insertBefore(cellToMove, targetCell);
                }
            });
        }
    });
}

// Inicializa os ouvintes de Drag and Drop para os cabeçalhos existentes
Array.from(headerRow.cells).forEach(th => {
    if (th.textContent !== 'Ações') { // Não permite arrastar a coluna Ações
        setupDragListeners(th);
    }
});
