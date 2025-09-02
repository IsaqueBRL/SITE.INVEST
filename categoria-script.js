// Acessa o banco de dados do Firebase
const database = firebase.database();
let categoriaKey;
let api_key = "jaAoNZHhBLxF7FAUh6QDVp";

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

// Função para habilitar a edição da célula de quantidade
const enableEditQuantity = (element, ativoKey, currentQuantity) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentQuantity;
    input.min = 0;
    input.step = 1;
    input.style.width = '60px';

    element.innerHTML = '';
    element.appendChild(input);
    input.focus();

    const saveQuantity = () => {
        const newQuantity = parseInt(input.value);
        if (!isNaN(newQuantity) && newQuantity >= 0) {
            database.ref(`assets/${categoriaKey}/ativos/${ativoKey}`).update({
                quantidade: newQuantity
            }).catch(error => {
                console.error("Erro ao atualizar a quantidade:", error);
            });
        }
    };

    input.addEventListener('blur', saveQuantity);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveQuantity();
        }
    });
};

// Renderiza a tabela de ativos e recalcula o total
const renderAtivosTable = (ativos) => {
    const tableBody = document.getElementById('ativos-table-body');
    tableBody.innerHTML = '';
    let totalValor = 0;

    if (ativos) {
        Object.entries(ativos).forEach(([key, ativo]) => {
            const valorTotalAtivo = (ativo.valor || 0) * (ativo.quantidade || 0);
            totalValor += valorTotalAtivo;
        });

        // Adiciona o nome da categoria ao cabeçalho da nova coluna
        const categoriaNome = document.getElementById('categoria-titulo').textContent;
        document.getElementById('peso-categoria-header').textContent = `EM (${categoriaNome})`;

        Object.entries(ativos).forEach(([key, ativo]) => {
            const row = document.createElement('tr');
            
            const valorTotalAtivo = (ativo.valor || 0) * (ativo.quantidade || 0);
            
            const porcentagem = totalValor > 0 ? (valorTotalAtivo / totalValor) * 100 : 0;
            const porcentagemFormatada = porcentagem.toFixed(2) + '%';

            row.innerHTML = `
                <td>${ativo.nome}</td>
                <td>${formatCurrency(ativo.valor)}</td>
                <td class="editable-quantity" data-key="${key}">${ativo.quantidade || 0}</td>
                <td>${porcentagemFormatada}</td>
                <td>${formatCurrency(valorTotalAtivo)}</td>
                <td class="actions-cell">
                    <button onclick="deleteAtivo('${key}')" class="delete-btn">Excluir</button>
                </td>
            `;
            tableBody.appendChild(row);

            const quantityCell = row.querySelector('.editable-quantity');
            quantityCell.addEventListener('click', () => {
                enableEditQuantity(quantityCell, key, ativo.quantidade);
            });
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
        valor: precoInicial,
        quantidade: 1 // Adiciona a quantidade padrão de 1
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