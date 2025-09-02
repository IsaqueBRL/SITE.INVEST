// Acessa o banco de dados do Firebase
const database = firebase.database();

// Função para formatar números como moeda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Função para formatar números como porcentagem
const formatPercentage = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 2
    }).format(value / 100);
};

// Renderiza a tabela de categorias e recalcula o total
const renderAssetsTable = (assets) => {
    const tableBody = document.getElementById('assets-table-body');
    tableBody.innerHTML = '';
    let totalPatrimonio = 0;

    if (assets) {
        Object.entries(assets).forEach(([key, asset]) => {
            const row = document.createElement('tr');
            
            // Calcula o valor da coluna "Atual"
            const atualValue = (asset.patrimonio || 0) / (asset.meta || 1);
            const formattedAtual = formatPercentage(atualValue * 100);

            row.innerHTML = `
                <td><a href="categoria.html?key=${key}" class="category-link">${asset.categoria}</a></td>
                <td>${formatCurrency(asset.patrimonio || 0)}</td>
                <td class="editable-meta" data-key="${key}">${formatPercentage(asset.meta || 0)}</td>
                <td>${formattedAtual}</td>                 <td class="actions-cell">
                    <button onclick="deleteCategoria('${key}')" class="delete-btn">Excluir</button>
                </td>
            `;
            tableBody.appendChild(row);
            totalPatrimonio += asset.patrimonio || 0;

            const metaCell = row.querySelector('.editable-meta');
            metaCell.addEventListener('click', () => {
                enableEdit(metaCell, key, asset.meta);
            });
        });
    }

    document.getElementById('patrimonio-total').textContent = formatCurrency(totalPatrimonio);
};

// Adicionar uma nova categoria
const addCategoria = () => {
    const categoriaInput = document.getElementById('categoria-input');
    const metaInput = document.getElementById('meta-input');
    const categoriaNome = categoriaInput.value;
    const metaValor = parseFloat(metaInput.value) || 0;

    if (categoriaNome.trim() !== '') {
        const assetsRef = database.ref('assets');
        assetsRef.push({
            categoria: categoriaNome,
            patrimonio: 0,
            meta: metaValor
        });
        categoriaInput.value = '';
        metaInput.value = '';
    }
};

// Excluir uma categoria
const deleteCategoria = (key) => {
    if (confirm('Tem certeza que deseja excluir esta categoria e todos os seus ativos?')) {
        const assetRef = database.ref(`assets/${key}`);
        assetRef.remove();
    }
};

// Função para habilitar a edição da meta
const enableEdit = (element, key, currentMeta) => {
    const input = document.createElement('input');
    input.type = 'number';
    // Para edição, use o valor numérico puro da meta
    input.value = currentMeta;
    input.style.width = '100px';

    element.innerHTML = '';
    element.appendChild(input);
    input.focus();

    const saveMeta = () => {
        const newMeta = parseFloat(input.value) || 0;
        database.ref(`assets/${key}`).update({
            meta: newMeta
        }).catch(error => {
            console.error("Erro ao atualizar a meta:", error);
        });
    };

    input.addEventListener('blur', saveMeta);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveMeta();
        }
    });
};

// Inicializa a página
document.addEventListener('DOMContentLoaded', () => {
    const assetsRef = database.ref('assets');
    assetsRef.on('value', (snapshot) => {
        const assets = snapshot.val();
        renderAssetsTable(assets);
    });
});