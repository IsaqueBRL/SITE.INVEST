// Acessa o banco de dados do Firebase
const database = firebase.database();
let categoriaKey;

// Função para formatar números como moeda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Função para obter o parâmetro da URL
const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

// Renderiza a tabela de ativos
const renderAtivosTable = (ativos) => {
    const tableBody = document.getElementById('ativos-table-body');
    tableBody.innerHTML = '';
    let totalValor = 0;

    if (ativos) {
        Object.entries(ativos).forEach(([key, ativo]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ativo.nome}</td>
                <td>${formatCurrency(ativo.valor)}</td>
                <td class="actions-cell">
                    <button onclick="deleteAtivo('${key}')" class="delete-btn">Excluir</button>
                </td>
            `;
            tableBody.appendChild(row);
            totalValor += ativo.valor;
        });
    }

    document.getElementById('total-categoria').textContent = formatCurrency(totalValor);
    
    // Atualiza o valor total da categoria no banco de dados principal
    const categoriaRef = database.ref(`assets/${categoriaKey}`);
    categoriaRef.update({
        patrimonio: totalValor
    });
};

// Adicionar um novo ativo
const addAtivo = () => {
    const nomeAtivo = document.getElementById('ativo-input').value.trim();
    const valorAtivo = parseFloat(document.getElementById('valor-input').value);

    if (nomeAtivo && !isNaN(valorAtivo) && valorAtivo > 0) {
        const ativosRef = database.ref(`assets/${categoriaKey}/ativos`);
        ativosRef.push({
            nome: nomeAtivo,
            valor: valorAtivo
        });

        document.getElementById('ativo-input').value = '';
        document.getElementById('valor-input').value = '';
    } else {
        alert('Por favor, insira um nome e um valor válido para o ativo.');
    }
};

// Excluir um ativo
const deleteAtivo = (ativoKey) => {
    if (confirm('Tem certeza que deseja excluir este ativo?')) {
        const ativoRef = database.ref(`assets/${categoriaKey}/ativos/${ativoKey}`);
        ativoRef.remove();
    }
};

// Inicializa a página
document.addEventListener('DOMContentLoaded', () => {
    categoriaKey = getQueryParam('key');
    if (categoriaKey) {
        const categoriaRef = database.ref(`assets/${categoriaKey}`);
        
        // Carrega o nome da categoria
        categoriaRef.on('value', snapshot => {
            const categoriaData = snapshot.val();
            if (categoriaData) {
                document.getElementById('categoria-titulo').textContent = categoriaData.categoria;
            } else {
                document.getElementById('categoria-titulo').textContent = 'Categoria não encontrada';
            }
        });

        // Carrega e atualiza a lista de ativos em tempo real
        const ativosRef = database.ref(`assets/${categoriaKey}/ativos`);
        ativosRef.on('value', snapshot => {
            const ativos = snapshot.val();
            renderAtivosTable(ativos);
        });
    } else {
        document.getElementById('categoria-titulo').textContent = 'Categoria não especificada';
    }
});