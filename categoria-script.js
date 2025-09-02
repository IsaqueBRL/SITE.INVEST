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

// Função para habilitar a edição da porcentagem de meta
const enableEditMetaPorcentagem = (element, planoKey, currentMetaPorcentagem) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentMetaPorcentagem;
    input.min = 0;
    input.step = 0.01;
    input.style.width = '60px';

    element.innerHTML = '';
    element.appendChild(input);
    input.focus();

    const saveMetaPorcentagem = () => {
        const newMetaPorcentagem = parseFloat(input.value);
        if (!isNaN(newMetaPorcentagem) && newMetaPorcentagem >= 0) {
            database.ref(`assets/${categoriaKey}/planos/${planoKey}`).update({
                meta_porcentagem: newMetaPorcentagem
            }).catch(error => {
                console.error("Erro ao atualizar a porcentagem de meta:", error);
            });
        }
    };

    input.addEventListener('blur', saveMetaPorcentagem);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveMetaPorcentagem();
        }
    });
};

// Renderiza a tabela de ativos e recalcula o total
const renderAtivosTable = (ativos) => {
    const tableBody = document.getElementById('ativos-table-body');
    tableBody.innerHTML = '';
    let totalValor = 0;

    if (ativos) {
        // Primeiro, calcula o patrimônio total da categoria
        Object.values(ativos).forEach(ativo => {
            const valorTotalAtivo = (ativo.valor || 0) * (ativo.quantidade || 0);
            totalValor += valorTotalAtivo;
        });

        // Adiciona o nome da categoria ao cabeçalho da nova coluna
        const categoriaNome = document.getElementById('categoria-titulo').textContent;
        document.getElementById('peso-categoria-header').textContent = `EM (${categoriaNome})`;

        // Em seguida, renderiza a tabela com os cálculos prontos
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

// Função para renderizar a nova tabela "PLANO"
const renderPlanoTable = (planos) => {
    const tableBody = document.getElementById('plano-table-body');
    tableBody.innerHTML = '';

    if (planos) {
        // Calcular o patrimônio total de todos os segmentos para o cálculo de porcentagem da carteira
        let totalPatrimonioPlanos = 0;
        Object.values(planos).forEach(plano => {
            totalPatrimonioPlanos += plano.patrimonio || 0;
        });

        Object.entries(planos).forEach(([key, plano]) => {
            const row = document.createElement('tr');
            
            // Recalcular a porcentagem da carteira
            const patrimonioPorcentagem = totalPatrimonioPlanos > 0 ? ((plano.patrimonio || 0) / totalPatrimonioPlanos) * 100 : 0;
            
            // Cálculo do aporte com base na sua fórmula
            let aporte = 0;
            if (plano.meta_porcentagem > 0 && patrimonioPorcentagem > 0 && totalPatrimonioPlanos > 0) {
                // A sua fórmula original é `(META - CARTEIRA) * PATRIMONIO / CARTEIRA`
                // Convertendo para as variáveis do nosso código:
                // (meta_porcentagem - patrimonio_porcentagem) * totalPatrimonioPlanos / patrimonio_porcentagem
                aporte = ((plano.meta_porcentagem - patrimonioPorcentagem) / patrimonioPorcentagem) * (plano.patrimonio || 0);
            } else if (plano.meta_porcentagem > 0 && patrimonioPorcentagem === 0) {
                 // Caso o patrimônio atual seja zero, o aporte é a meta em Reais
                aporte = (plano.meta_porcentagem / 100) * totalPatrimonioPlanos;
            }
            
            row.innerHTML = `
                <td>${plano.segmento}</td>
                <td class="editable-meta-porcentagem" data-key="${key}">${plano.meta_porcentagem.toFixed(2)}%</td>
                <td>${formatCurrency((plano.meta_porcentagem / 100) * totalPatrimonioPlanos)}</td>
                <td>${formatCurrency(plano.patrimonio || 0)}</td>
                <td>${formatCurrency(plano.patrimonio || 0)}</td>
                <td>${formatCurrency(aporte)}</td>
            `;
            tableBody.appendChild(row);
            
            const metaPorcentagemCell = row.querySelector('.editable-meta-porcentagem');
            metaPorcentagemCell.addEventListener('click', () => {
                enableEditMetaPorcentagem(metaPorcentagemCell, key, plano.meta_porcentagem);
            });
        });
    }
};

// Adicionar um novo segmento
const addSegmento = () => {
    const segmentoInput = document.getElementById('segmento-input');
    const nomeSegmento = segmentoInput.value.trim();

    if (nomeSegmento !== '') {
        const segmentosRef = database.ref(`assets/${categoriaKey}/planos`);
        segmentosRef.push({
            segmento: nomeSegmento,
            meta_porcentagem: 0,
            meta: 0,
            patrimonio_porcentagem: 0,
            patrimonio: 0
        });
        segmentoInput.value = '';
    } else {
        alert('Por favor, insira o nome do segmento.');
    }
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

        const planosRef = database.ref(`assets/${categoriaKey}/planos`);
        planosRef.on('value', snapshot => {
            const planos = snapshot.val();
            renderPlanoTable(planos);
        });

        const ativosRef = database.ref(`assets/${categoriaKey}/ativos`);
        ativosRef.on('value', snapshot => {
            const ativos = snapshot.val();
            renderAtivosTable(ativos);
        });
        
        const addSegmentoBtn = document.getElementById('add-segmento-btn');
        if (addSegmentoBtn) {
            addSegmentoBtn.addEventListener('click', addSegmento);
        }

        setInterval(updateAllPrices, 300000);
        
    } else {
        document.getElementById('categoria-titulo').textContent = 'Categoria não especificada';
    }
});