// Array para armazenar as categorias de investimento
let assets = [];

// Função para formatar números como moeda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Função para excluir uma categoria
const deleteAsset = (index) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
        assets.splice(index, 1); // Remove o item do array
        renderTable(); // Recarrega a tabela
    }
};

// Função principal que calcula todos os valores e renderiza a tabela
const renderTable = () => {
    const tableBody = document.getElementById('investment-table-body');
    tableBody.innerHTML = ''; // Limpa a tabela antes de renderizar
    
    // Calcula o patrimônio total
    const totalPatrimonio = assets.reduce((sum, asset) => sum + parseFloat(asset.patrimonio), 0);
    document.getElementById('total-patrimonio').textContent = formatCurrency(totalPatrimonio);

    // Calcula a porcentagem atual e o valor a aportar para cada categoria
    let totalAportar = 0;
    
    assets.forEach((asset, index) => {
        const atualPorcentagem = totalPatrimonio > 0 ? (asset.patrimonio / totalPatrimonio) * 100 : 0;
        const metaValor = totalPatrimonio * (asset.meta / 100);
        const aportarValor = metaValor - asset.patrimonio;
        
        asset.atual = atualPorcentagem;
        asset.aportar = aportarValor;

        if (aportarValor > 0) {
            totalAportar += aportarValor;
        }

        // Cria a linha da tabela
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${asset.categoria}</td>
            <td>${asset.meta.toFixed(2)}%</td>
            <td>${asset.atual.toFixed(2)}%</td>
            <td>${formatCurrency(asset.patrimonio)}</td>
            <td style="color: ${asset.aportar > 0 ? 'green' : 'red'}; font-weight: bold;">${formatCurrency(asset.aportar)}</td>
            <td class="actions-cell">
                <button onclick="deleteAsset(${index})" class="delete-btn">Excluir</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('total-aportar').textContent = formatCurrency(totalAportar);
};

// Função para adicionar ou atualizar uma categoria
const addOrUpdateAsset = () => {
    const categoriaInput = document.getElementById('categoria-input');
    const patrimonioInput = document.getElementById('patrimonio-input');
    const metaInput = document.getElementById('meta-input');

    const categoria = categoriaInput.value.trim();
    const patrimonio = parseFloat(patrimonioInput.value);
    const meta = parseFloat(metaInput.value);

    // Validações básicas
    if (!categoria || isNaN(patrimonio) || isNaN(meta) || meta < 0 || patrimonio < 0) {
        alert('Por favor, preencha todos os campos com valores válidos.');
        return;
    }

    // Procura se a categoria já existe
    const existingAssetIndex = assets.findIndex(a => a.categoria.toLowerCase() === categoria.toLowerCase());

    if (existingAssetIndex !== -1) {
        // Se existir, atualiza os valores
        assets[existingAssetIndex].patrimonio = patrimonio;
        assets[existingAssetIndex].meta = meta;
    } else {
        // Se não existir, adiciona uma nova categoria
        assets.push({ categoria, patrimonio, meta, atual: 0, aportar: 0 });
    }

    // Limpa os campos de input
    categoriaInput.value = '';
    patrimonioInput.value = '';
    metaInput.value = '';

    renderTable(); // Recalcula e renderiza a tabela
};

// Função para carregar dados iniciais, se houver
window.onload = () => {
    // Exemplo de dados iniciais, você pode remover ou modificar
    assets.push({ categoria: 'Renda Fixa', patrimonio: 5000, meta: 30, atual: 0, aportar: 0 });
    assets.push({ categoria: 'Ações BR', patrimonio: 3000, meta: 40, atual: 0, aportar: 0 });
    assets.push({ categoria: 'Ações EUA', patrimonio: 2000, meta: 20, atual: 0, aportar: 0 });
    assets.push({ categoria: 'Fundos Imobiliários', patrimonio: 1000, meta: 10, atual: 0, aportar: 0 });
    renderTable();
};