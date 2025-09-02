// Acessa o banco de dados do Firebase
const database = firebase.database();

// Função para formatar números como moeda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Função para formatar números como porcentagem (recebe um valor numérico, por exemplo, 18 para 18%)
const formatPercentage = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 // Garante 2 casas decimais
    }).format(value / 100); // Divide por 100 para converter o número (ex: 18) em percentual (ex: 0.18)
};

// Renderiza a tabela de categorias e recalcula o total
const renderAssetsTable = (assets) => {
    const tableBody = document.getElementById('assets-table-body');
    tableBody.innerHTML = '';
    let totalPatrimonio = 0;

    if (assets) {
        Object.entries(assets).forEach(([key, asset]) => {
            const row = document.createElement('tr');
            
            const patrimonio = asset.patrimonio || 0;
            const meta = asset.meta || 0;

            let atualValue = 0;
            if (meta > 0) {
                 atualValue = (patrimonio / (meta / 100)) / (totalPatrimonio / 100); 
            }
            
            row.innerHTML = `
                <td><a href="categoria.html?key=${key}" class="category-link">${asset.categoria}</a></td>
                <td>${formatCurrency(patrimonio)}</td>
                <td class="editable-meta" data-key="${key}">${formatPercentage(meta)}</td>
                <td>${formatPercentage(atualValue * 100)}</td>
                <td class="actions-cell">
                    <button onclick="deleteCategoria('${key}')" class="delete-btn">Excluir</button>
                </td>
            `;
            tableBody.appendChild(row);
            totalPatrimonio += patrimonio;

            const metaCell = row.querySelector('.editable-meta');
            metaCell.addEventListener('click', () => {
                enableEdit(metaCell, key, asset.meta);
            });
        });
    }

    document.getElementById('patrimonio-total').textContent = formatCurrency(totalPatrimonio);
    
    // Mostra a tabela após os dados terem sido carregados
    document.getElementById('tabela-container').style.display = 'block';
};

// Resto do código (addCategoria, deleteCategoria, enableEdit) ...
// ... não precisa ser alterado, apenas a função de renderização

// Inicializa a página
document.addEventListener('DOMContentLoaded', () => {
    const assetsRef = database.ref('assets');
    assetsRef.on('value', (snapshot) => {
        const assets = snapshot.val();
        renderAssetsTable(assets);
    });
});