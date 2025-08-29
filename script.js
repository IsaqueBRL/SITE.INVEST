const database = firebase.database();
const assetsRef = database.ref('assets');

const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

const deleteAsset = (key) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
        assetsRef.child(key).remove();
    }
};

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
        element.innerHTML = `${currentMeta.toFixed(2)}%`;
    };

    input.addEventListener('blur', saveMeta);

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveMeta();
        }
    });
};

const renderTable = (assets) => {
    const tableBody = document.getElementById('investment-table-body');
    tableBody.innerHTML = '';
    
    const assetsArray = Object.values(assets);

    const totalPatrimonio = assetsArray.reduce((sum, asset) => sum + parseFloat(asset.patrimonio), 0);
    document.getElementById('total-patrimonio').textContent = formatCurrency(totalPatrimonio);

    let totalAportar = 0;
    
    for (const key in assets) {
        const asset = assets[key];
        const atualPorcentagem = totalPatrimonio > 0 ? (asset.patrimonio / totalPatrimonio) * 100 : 0;
        const metaValor = totalPatrimonio * (asset.meta / 100);
        const aportarValor = metaValor - asset.patrimonio;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${asset.categoria}</td>
            <td class="editable-meta" data-key="${key}">${asset.meta.toFixed(2)}%</td>
            <td>${atualPorcentagem.toFixed(2)}%</td>
            <td>${formatCurrency(asset.patrimonio)}</td>
            <td style="color: ${aportarValor > 0 ? 'green' : 'red'}; font-weight: bold;">${formatCurrency(aportarValor)}</td>
            <td class="actions-cell">
                <button onclick="deleteAsset('${key}')" class="delete-btn">Excluir</button>
            </td>
        `;
        tableBody.appendChild(row);

        const metaCell = row.querySelector('.editable-meta');
        metaCell.addEventListener('click', () => {
            enableEdit(metaCell, key, asset.meta);
        });

        if (aportarValor > 0) {
            totalAportar += aportarValor;
        }
    }

    document.getElementById('total-aportar').textContent = formatCurrency(totalAportar);
};

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

assetsRef.on('value', (snapshot) => {
    const data = snapshot.val();
    const assets = data || {};
    renderTable(assets);
});