// Acessa o banco de dados do Firebase
const database = firebase.database();
const assetsRef = database.ref('assets');

// Função para formatar números como moeda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Função para excluir uma categoria do Firebase
const deleteAsset = (key) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
        assetsRef.child(key).remove();
    }
};

// Função principal que calcula todos os valores e renderiza a tabela
const renderTable = (assets) => {
    const tableBody = document.getElementById('investment-table-body');
    tableBody.innerHTML = '';
    
    // Converte o objeto de assets em um array para facilitar o cálculo
    const assetsArray = Object.values(assets);

    const totalPatrimonio = assetsArray.reduce((sum, asset) => sum + parseFloat(asset.patrimonio), 0);
    document.getElementById('total-patrimonio').textContent = formatCurrency(totalPatrimonio);

    let totalAportar = 0;
    
    // Itera sobre o objeto de assets para renderizar a tabela
    for (const key in assets) {
        const asset = assets[key];
        const atualPorcentagem = totalPatrimonio > 0 ? (asset.patrimonio / totalPatrimonio) * 100 : 0;
        const metaValor = totalPatrimonio * (asset.meta / 100);
        const aportarValor = metaValor - asset.patrimonio;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${asset.categoria}</td>
            <td>${asset.meta.toFixed(2)}%</td>
            <td>${atualPorcentagem.toFixed(2)}%</td>
            <td>${formatCurrency(asset.patrimonio)}</td>
            <td style="color: ${aportarValor > 0 ? 'green' : 'red'}; font-weight: bold;">${formatCurrency(aportarValor)}</td>
            <td class="actions-cell">
                <button onclick="deleteAsset('${key}')" class="delete-btn">Excluir</button>
            </td>
        `;
        tableBody.appendChild(row);

        if (aportarValor > 0) {
            totalAportar += aportarValor;
        }
    }

    document.getElementById('total-aportar').textContent = formatCurrency(totalAportar);
};

// Função para adicionar ou atualizar uma categoria no Firebase
const addOrUpdateAsset = () => {
    const categoriaInput = document.getElementById('categoria-input');
    const patrimonioInput = document.getElementById('patrimonio-input');
    const metaInput = document.getElementById('meta-input');

    const categoria = categoriaInput.value.trim();
    const patrimonio = parseFloat(patrimonioInput.value);
    const meta = parseFloat(metaInput.value);

    if (!categoria || isNaN(patrimonio) || isNaN(meta) || meta < 0 || patrimonio < 0) {
        alert('Por favor, preencha todos os campos com valores válidos.');
        return;
    }

    // Procura se a categoria já existe no banco de dados
    assetsRef.orderByChild('categoria').equalTo(categoria).once('value', snapshot => {
        const existingAsset = snapshot.val();
        
        if (existingAsset) {
            // Se existir, atualiza a categoria
            const key = Object.keys(existingAsset)[0];
            assetsRef.child(key).update({
                patrimonio: patrimonio,
                meta: meta
            });
        } else {
            // Se não existir, adiciona uma nova categoria
            assetsRef.push({
                categoria: categoria,
                patrimonio: patrimonio,
                meta: meta
            });
        }
    });

    categoriaInput.value = '';
    patrimonioInput.value = '';
    metaInput.value = '';
};

// Carrega os dados do Firebase e os atualiza em tempo real
assetsRef.on('value', (snapshot) => {
    const data = snapshot.val();
    const assets = data || {};
    renderTable(assets);
});
