// Acessa o banco de dados do Firebase
const database = firebase.database();
let categoriaKey;
let api_key = "jaAoNZHhBLxF7FAUh6QDVp"; // CHAVE INSERIDA AQUI

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

// Função para buscar o preço de um ativo na API
const fetchAssetPrice = async (symbol) => {
    const url = `https://brapi.dev/api/quote/${symbol}?token=${api_key}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro ao buscar cotação para ${symbol}`);
        }
        const data = await response.json();
        
        const price = data.results[0].regularMarketPrice; 
        
        return price;
    } catch (error) {
        console.error(error);
        alert(`Não foi possível obter o preço de ${symbol}. Verifique o símbolo e sua chave da API.`);
        return null;
    }
};

// Renderiza a tabela de ativos e recalcula o total
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
    database.ref(`assets/${categoriaKey}`).update({
        patrimonio: totalValor
    });
};

// Adicionar um novo ativo e buscar o preço
const addAtivo = async () => {
    const nomeAtivo = document.getElementById('ativo-input').value.trim().toUpperCase();
    const valorInput = document.getElementById('valor-input');
    const valorAtivo = parseFloat(valorInput.value);

    if (!nomeAtivo) {
        alert('Por favor, insira o símbolo do ativo.');
        return;
    }

    let precoInicial = valorAtivo;

    if (isNaN(valorAtivo) || valorAtivo <= 0) {
        precoInicial = await fetchAssetPrice(nomeAtivo);
        if (precoInicial === null) {
            return;
        }
    }
    
    const ativosRef = database.ref(`assets/${categoriaKey}/ativos`);
    ativosRef.push({
        nome: nomeAtivo,
        valor: precoInicial
    });

    document.getElementById('ativo-input').value = '';
    valorInput.value = '';
};

// Excluir um ativo
const deleteAtivo = (ativoKey) => {
    if (confirm('Tem certeza que deseja excluir este ativo?')) {
        const ativoRef = database.ref(`assets/${categoriaKey}/ativos/${ativoKey}`);
        ativoRef.remove();
    }
};

// Função para atualizar os preços de todos os ativos
const updateAllPrices = async () => {
    const ativosSnapshot = await database.ref(`assets/${categoriaKey}/ativos`).once('value');
    const ativos = ativosSnapshot.val();
    
    if (ativos) {
        for (const [key, ativo] of Object.entries(ativos)) {
            const newPrice = await fetchAssetPrice(ativo.nome);
            if (newPrice !== null) {
                database.ref(`assets/${categoriaKey}/ativos/${key}`).update({
                    valor: newPrice
                });
            }
        }
    }
};

// Inicializa a página
document.addEventListener('DOMContentLoaded', () => {
    categoriaKey = getQueryParam('key');
    if (categoriaKey) {
        const categoriaRef = database.ref(`assets/${categoriaKey}`);
        
        categoriaRef.on('value', snapshot => {
            const categoriaData = snapshot.val();
            if (categoriaData) {
                document.getElementById('categoria-titulo').textContent = categoriaData.categoria;
            } else {
                document.getElementById('categoria-titulo').textContent = 'Categoria não encontrada';
            }
        });

        const ativosRef = database.ref(`assets/${categoriaKey}/ativos`);
        ativosRef.on('value', snapshot => {
            const ativos = snapshot.val();
            renderAtivosTable(ativos);
        });

        setInterval(updateAllPrices, 300000);
        
    } else {
        document.getElementById('categoria-titulo').textContent = 'Categoria não especificada';
    }
});