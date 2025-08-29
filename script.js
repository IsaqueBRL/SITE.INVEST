// Acessa o banco de dados do Firebase
const database = firebase.database();
const assetsRef = database.ref('assets');

// Estado de ordenação da tabela
let sortState = {
    column: 'categoria', // Coluna inicial para ordenação
    direction: 'asc'      // Direção inicial (ascendente)
};

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

// Função para habilitar a edição da célula de meta
const enableEdit = (element, key, currentMeta) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentMeta;
    input.min = 0;
    input.max = 100;
    input.step = 0.01;
    input.style.width = '60px';

    element.innerHTML = '';
    element.appendChild(input);
    input.focus();

    const saveMeta = () => {
        const newMeta = parseFloat(input.value);
        if (!isNaN(newMeta) && newMeta >= 0 && newMeta <= 100) {
            assetsRef.child(key).update({
                meta: newMeta
            }).catch(error => {
                console.error("Erro ao atualizar a meta:", error);
            });
        }
    };

    input.addEventListener('blur', saveMeta);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveMeta();
        }
    });
};

// Função para ordenar os ativos
const sortAssets = (column) => {
    if (sortState.column === column) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.column = column;
        sortState.direction = 'asc';
    }
    assetsRef.once('value', (snapshot) => {
        const data = snapshot.val();
        const assets = data || {};
        renderTable(assets);
    });
};

// Função principal que calcula todos os valores e renderiza a tabela
const renderTable = (assets) => {
    const tableBody = document.getElementById('investment-table-body');
    tableBody.innerHTML = '';

    const assetsArray = Object.entries(assets).map(([key, value]) => ({ key, ...value }));

    // Calcular a porcentagem atual para ordenação
    const totalPatrimonio = assetsArray.reduce((sum, asset) => sum + parseFloat(asset.patrimonio), 0);
    assetsArray.forEach(asset => {
        asset.atualPorcentagem = totalPatrimonio > 0 ? (asset.patrimonio / totalPatrimonio) * 100 : 0;
        asset.metaValor = totalPatrimonio * (asset.meta / 100);
        asset.aportarValor = asset.metaValor - asset.patrimonio;
    });

    // Ordenar o array com base no estado atual
    assetsArray.sort((a, b) => {
        const aValue = a[sortState.column];
        const bValue = b[sortState.column];

        let comparison = 0;
        if (typeof aValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        } else {
            comparison = aValue - bValue;
        }

        return sortState.direction === 'asc' ? comparison : -comparison;
    });

    document.getElementById('total-patrimonio').textContent = formatCurrency(totalPatrimonio);

    let totalAportar = 0;

    assetsArray.forEach(asset => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${asset.categoria}</td>
            <td class="editable-meta" data-key="${asset.key}">${asset.meta.toFixed(2)}%</td>
            <td>${asset.atualPorcentagem.toFixed(2)}%</td>
            <td>${formatCurrency(asset.patrimonio)}</td>
            <td style="color: ${asset.aportarValor > 0 ? 'green' : 'red'}; font-weight: bold;">${formatCurrency(asset.aportarValor)}</td>
            <td class="actions-cell">
                <button onclick="deleteAsset('${asset.key}')" class="delete-btn">Excluir</button>
            </td>
        `;
        tableBody.appendChild(row);

        const metaCell = row.querySelector('.editable-meta');
        metaCell.addEventListener('click', () => {
            enableEdit(metaCell, asset.key, asset.meta);
        });

        if (asset.aportarValor > 0) {
            totalAportar += asset.aportarValor;
        }
    });

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

    assetsRef.orderByChild('categoria').equalTo(categoria).once('value', snapshot => {
        const existingAsset = snapshot.val();
        
        if (existingAsset) {
            const key = Object.keys(existingAsset)[0];
            assetsRef.child(key).update({
                patrimonio: patrimonio,
                meta: meta
            });
        } else {
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