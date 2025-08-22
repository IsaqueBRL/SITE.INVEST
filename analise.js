// Importa as funções do Firebase SDK
import { getDatabase, ref, onValue, remove, push, update, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// ===== Configuração do Firebase =====
const firebaseConfig = {
    apiKey: "AIzaSyBNBf_DachNBO2RmGmfOPg3PEuig5cVRw",
    authDomain: "banco-de-dados---site-invest.firebaseapp.com",
    databaseURL: "https://banco-de-dados---site-invest-default-rtdb.firebaseio.com",
    projectId: "banco-de-dados---site-invest",
    storageBucket: "banco-de-dados---site-invest.firebasestorage.app",
    messagingSenderId: "581873866515",
    appId: "1:581873866515:web:f258fcecad958acf6aace6"
};

// Inicializa o Firebase e o Banco de Dados
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Referências para os nós do banco de dados
const carteiraRef = ref(db, 'carteira');
const setoresRef = ref(db, 'setores');
const segmentosRef = ref(db, 'segmentos');
const metasDeAporteRef = ref(db, 'metasDeAporte'); // NOVO: Referência para as metas de aporte

// Variáveis de estado
let carteira = {};
let setores = {};
let segmentos = {};
let metasDeAporte = {}; // NOVO: Objeto para armazenar as metas
let currentCategoryForGerenciar = '';

// Variáveis para as instâncias dos gráficos
let setorChartInstance = null;
let segmentoChartInstance = null;

// ===== DOM Elements =====
const categoryTitle = document.getElementById('categoryTitle');
const totalPatrimonio = document.getElementById('totalPatrimonio');
const tabelaAtivosCategoria = document.getElementById('tabelaAtivosCategoria');
const openSetoresModalBtn = document.getElementById('openSetoresModalBtn');
const modalSetores = document.getElementById('modalSetores');
const closeSetoresModalBtn = document.getElementById('closeSetoresModalBtn');
const formSetores = document.getElementById('formSetores');
const setorInput = document.getElementById('setorInput');
const segmentoInput = document.getElementById('segmentoInput');
const setorList = document.getElementById('setorList');
const segmentoList = document.getElementById('segmentoList');
const gerenciarModalTitle = document.getElementById('gerenciarModalTitle');

// NOVO: Elementos da nova tabela
const planoAporteHeader = document.getElementById('planoAporteHeader');
const planoAporteContent = document.getElementById('planoAporteContent');
const tabelaPlanoAporteBody = document.getElementById('tabelaPlanoAporteBody');

// ===== Utilitários de Formatação =====
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
function parseBRL(str) { return Number(String(str).replace(/\./g,'').replace(',', '.')) || 0; }
function toBRL(n) { return fmtBRL.format(n || 0); }
function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }

// Chave da API para buscar a cotação
const API_KEY = "jaAoNZHhBLxF7FAUh6QDVp";

// Função para buscar preço atual da ação na API da Brapi
async function buscarPreco(ticker) {
    const url = `https://brapi.dev/api/quote/${ticker}?token=${API_KEY}`;
    try {
        const resp = await fetch(url);
        if (!resp.ok) {
            console.error("Erro na resposta da API:", resp.statusText);
            return null;
        }
        const json = await resp.json();
        const price = json.results?.[0]?.regularMarketPrice;
        return typeof price === 'number' ? price : null;
    } catch (err) {
        console.error("Erro ao buscar preço para o ticker:", ticker, err);
        return null;
    }
}

// ===== Lógica Principal da Página =====

// Obter a categoria da URL
const urlParams = new URLSearchParams(window.location.search);
const category = urlParams.get('categoria');

// Preencher o título da página
if (category) {
    categoryTitle.textContent = category;
    gerenciarModalTitle.textContent = `Gerenciar Setores/Segmentos para ${category}`;
    planoAporteHeader.textContent = `Plano de Aporte em ${category}`;
    currentCategoryForGerenciar = category;
}

// NOVO: Lógica de show/hide para o Plano de Aporte
planoAporteHeader.addEventListener('click', () => {
    planoAporteContent.classList.toggle('show');
    planoAporteHeader.classList.toggle('active');
});

// Lógica para fechar o modal
closeSetoresModalBtn.addEventListener('click', () => modalSetores.close());
modalSetores.addEventListener('click', e => {
    const dialogDimensions = modalSetores.getBoundingClientRect();
    if (e.clientX < dialogDimensions.left || e.clientX > dialogDimensions.right || e.clientY < dialogDimensions.top || e.clientY > dialogDimensions.bottom) {
        modalSetores.close();
    }
});

// Lógica para salvar setor/segmento na categoria correta
formSetores.addEventListener('submit', (e) => {
    e.preventDefault();
    const setor = setorInput.value.trim();
    const segmento = segmentoInput.value.trim();
    
    if (!setor && !segmento) return;
    if (!currentCategoryForGerenciar) {
        alert("Erro: Categoria não selecionada para gerenciar.");
        return;
    }

    const setoresDaCategoria = Object.values(setores[currentCategoryForGerenciar] || {});
    const segmentosDaCategoria = Object.values(segmentos[currentCategoryForGerenciar] || {});

    if (setor && !setoresDaCategoria.includes(setor)) {
        push(ref(db, `setores/${currentCategoryForGerenciar}`), setor);
    }
    if (segmento && !segmentosDaCategoria.includes(segmento)) {
        push(ref(db, `segmentos/${currentCategoryForGerenciar}`), segmento);
    }
    formSetores.reset();
});

// Lógica de deleção de setor/segmento
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-del-setor]')) {
        const setorKey = e.target.dataset.delSetor;
        const category = e.target.dataset.cat;
        if(confirm("Tem certeza que deseja excluir este setor?")) {
            remove(ref(db, `setores/${category}/${setorKey}`));
        }
    }
    
    if (e.target.matches('[data-del-segmento]')) {
        const segmentoKey = e.target.dataset.delSegmento;
        const category = e.target.dataset.cat;
        if(confirm("Tem certeza que deseja excluir este segmento?")) {
            remove(ref(db, `segmentos/${category}/${segmentoKey}`));
        }
    }

    if (e.target.matches('[data-del-ativo]')) {
        const ativoKey = e.target.dataset.delAtivo;
        if(confirm("Tem certeza que deseja excluir este ativo?")) {
            remove(ref(db, `carteira/${ativoKey}`));
        }
    }
    
    if (e.target.matches('#openSetoresModalBtn')) {
        currentCategoryForGerenciar = category;
        renderSetoresSegmentosList(currentCategoryForGerenciar);
        modalSetores.showModal();
    }
});

function makeEditableDropdown(td, ativoKey, type) {
    const currentVal = carteira[ativoKey]?.[type] || '';
    const category = carteira[ativoKey]?.tipo;
    const options = Object.values(type === 'setor' ? (setores[category] || {}) : (segmentos[category] || {}));

    const select = document.createElement('select');
    select.style.cssText = 'width: 100%; padding: 6px; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 8px;';
    
    let optionsHtml = `<option value="">Nenhum</option>`;
    options.forEach(optionVal => {
        optionsHtml += `<option value="${optionVal}" ${currentVal === optionVal ? 'selected' : ''}>${optionVal}</option>`;
    });
    select.innerHTML = optionsHtml;
    
    td.innerHTML = '';
    td.appendChild(select);
    select.focus();

    function updateAndRevert() {
        const newValue = select.value;
        if (newValue !== currentVal) {
            update(ref(db, `carteira/${ativoKey}`), { [type]: newValue });
        }
    }

    select.addEventListener('change', updateAndRevert);
    select.addEventListener('blur', updateAndRevert);
}

// NOVO: Função para tornar a célula de "Meta" editável
function makeEditableMetaCell(td, segmento) {
    const currentMeta = metasDeAporte[category]?.[segmento] || 0;
    
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentMeta;
    input.placeholder = '0';
    input.min = '0';
    input.max = '100';
    
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    
    function saveMeta() {
        const newMeta = parseFloat(input.value) || 0;
        if (newMeta !== currentMeta) {
            const updates = {};
            updates[`${category}/${segmento}`] = newMeta;
            update(metasDeAporteRef, updates);
        }
    }

    input.addEventListener('blur', saveMeta);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveMeta();
            input.blur(); // Perde o foco
        }
    });
}

// NOVO: Lógica de duplo clique para a nova tabela
document.addEventListener('dblclick', (e) => {
    if (e.target.closest('#tabelaPlanoAporteBody') && e.target.matches('td:nth-child(2)')) {
        const row = e.target.closest('tr');
        const segmento = row.dataset.segmento;
        makeEditableMetaCell(e.target, segmento);
    }
});

document.addEventListener('dblclick', (e) => {
    if (e.target.matches('[data-type="setor"]')) {
        const ativoKey = e.target.dataset.ativoKey;
        makeEditableDropdown(e.target, ativoKey, 'setor');
    }
    if (e.target.matches('[data-type="segmento"]')) {
        const ativoKey = e.target.dataset.ativoKey;
        makeEditableDropdown(e.target, ativoKey, 'segmento');
    }
});

function renderSetoresSegmentosList(category) {
    gerenciarModalTitle.textContent = `Gerenciar Setores/Segmentos para ${category}`;

    setorList.innerHTML = '';
    const setoresDaCategoria = setores[category] || {};
    Object.entries(setoresDaCategoria).forEach(([key, setor]) => {
        const li = document.createElement('li');
        li.innerHTML = `${setor} <button class="btn danger btn-sm" data-del-setor="${key}" data-cat="${category}">X</button>`;
        setorList.appendChild(li);
    });

    segmentoList.innerHTML = '';
    const segmentosDaCategoria = segmentos[category] || {};
    Object.entries(segmentosDaCategoria).forEach(([key, segmento]) => {
        const li = document.createElement('li');
        li.innerHTML = `${segmento} <button class="btn danger btn-sm" data-del-segmento="${key}" data-cat="${category}">X</button>`;
        segmentoList.appendChild(li);
    });
}

function renderTabelaAtivos(ativos) {
    const patrimonioTotal = ativos.reduce((sum, ativo) => {
        const valorAtual = (ativo.precoAtual || ativo.precoMedio) * ativo.quantidade;
        return sum + valorAtual;
    }, 0);

    totalPatrimonio.textContent = toBRL(patrimonioTotal);

    tabelaAtivosCategoria.innerHTML = '';
    
    ativos.forEach(ativo => {
        const valorAtual = (ativo.precoAtual || ativo.precoMedio) * ativo.quantidade;
        
        const percentualNaCategoria = patrimonioTotal > 0 ? (valorAtual / patrimonioTotal) * 100 : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ativo.ticker}</td>
            <td>${fmtNum.format(ativo.quantidade)}</td>
            <td>${toBRL(ativo.precoAtual || ativo.precoMedio)}</td>
            <td data-ativo-key="${ativo.key}" data-type="setor">${ativo.setor || '-'}</td>
            <td data-ativo-key="${ativo.key}" data-type="segmento">${ativo.segmento || '-'}</td>
            <td>${toBRL(valorAtual)}</td>
            <td class="right">${percentualNaCategoria.toFixed(2)}%</td>
            <td class="right">
                <button class="btn danger btn-sm" data-del-ativo="${ativo.key}">X</button>
            </td>
        `;
        tabelaAtivosCategoria.appendChild(row);
    });
}

// NOVO: Função para renderizar a tabela de Plano de Aporte
function renderPlanoDeAporte(ativos) {
    tabelaPlanoAporteBody.innerHTML = '';
    
    const patrimonioTotal = ativos.reduce((sum, ativo) => {
        const valorAtual = (ativo.precoAtual || ativo.precoMedio) * ativo.quantidade;
        return sum + valorAtual;
    }, 0);
    
    const patrimonioPorSegmento = ativos.reduce((acc, ativo) => {
        const segmento = ativo.segmento || '-';
        const valor = (ativo.precoAtual || ativo.precoMedio) * ativo.quantidade;
        acc[segmento] = (acc[segmento] || 0) + valor;
        return acc;
    }, {});

    const metas = metasDeAporte[category] || {};
    
    const segmentosUnicos = Object.keys(patrimonioPorSegmento);

    segmentosUnicos.forEach(segmento => {
        const patrimonioAtualSegmento = patrimonioPorSegmento[segmento];
        const carteiraAtualPercent = patrimonioTotal > 0 ? (patrimonioAtualSegmento / patrimonioTotal) * 100 : 0;
        const meta = metas[segmento] || 0;
        
        const patrimonioAportar = (patrimonioTotal * (meta / 100)) - patrimonioAtualSegmento;
        const aportarTexto = patrimonioAportar > 0 ? toBRL(patrimonioAportar) : '---';

        const row = document.createElement('tr');
        row.dataset.segmento = segmento;
        row.innerHTML = `
            <td>${segmento}</td>
            <td data-editable="meta">${meta}%</td>
            <td>${carteiraAtualPercent.toFixed(2)}%</td>
            <td>${toBRL(patrimonioAtualSegmento)}</td>
            <td class="${patrimonioAportar > 0 ? 'aportar-ativo' : ''}">${aportarTexto}</td>
        `;
        tabelaPlanoAporteBody.appendChild(row);
    });
}

function renderCharts(ativos) {
    const patrimonioPorSetor = ativos.reduce((acc, ativo) => {
        const setor = ativo.setor || 'Outros';
        const valor = (ativo.precoAtual || ativo.precoMedio) * ativo.quantidade;
        acc[setor] = (acc[setor] || 0) + valor;
        return acc;
    }, {});
    
    const setoresLabels = Object.keys(patrimonioPorSetor);
    const setoresData = Object.values(patrimonioPorSetor);

    const patrimonioPorSegmento = ativos.reduce((acc, ativo) => {
        const segmento = ativo.segmento || 'Outros';
        const valor = (ativo.precoAtual || ativo.precoMedio) * ativo.quantidade;
        acc[segmento] = (acc[segmento] || 0) + valor;
        return acc;
    }, {});

    const segmentosLabels = Object.keys(patrimonioPorSegmento);
    const segmentosData = Object.values(patrimonioPorSegmento);

    if (setorChartInstance) {
        setorChartInstance.destroy();
    }
    if (segmentoChartInstance) {
        segmentoChartInstance.destroy();
    }

    const setorCtx = document.getElementById('setorChart');
    if (setorCtx) {
        setorChartInstance = new Chart(setorCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: setoresLabels,
                datasets: [{
                    data: setoresData,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#D8BFD8'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a0aec0'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                return `${label}: ${toBRL(value)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    const segmentoCtx = document.getElementById('segmentoChart');
    if (segmentoCtx) {
        segmentoChartInstance = new Chart(segmentoCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: segmentosLabels,
                datasets: [{
                    data: segmentosData,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#D8BFD8', '#42A5F5', '#66BB6A'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a0aec0'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                return `${label}: ${toBRL(value)}`;
                            }
                        }
                    }
                }
            }
        });
    }
}

const tableHeader = document.getElementById('tableHeader');
const tableBody = document.getElementById('tabelaAtivosCategoria');

// Inicializa o Sortable.js no cabeçalho da tabela
const sortable = new Sortable(tableHeader.querySelector('tr'), {
    animation: 150,
    ghostClass: 'sortable-ghost',
    handle: 'th',
    onEnd: function (evt) {
        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;
        
        if (oldIndex === newIndex) {
            return;
        }

        // Reordena as células de cada linha do corpo da tabela
        Array.from(tableBody.children).forEach(row => {
            const cells = Array.from(row.children);
            const movedCell = cells[oldIndex];
            const referenceCell = cells[newIndex];

            if (oldIndex < newIndex) {
                row.insertBefore(movedCell, referenceCell.nextSibling);
            } else {
                row.insertBefore(movedCell, referenceCell);
            }
        });
    },
});

// Função para atualizar os preços de todos os ativos
async function atualizarPrecos() {
    console.log("Iniciando atualização de preços dos ativos...");

    const snapshot = await get(carteiraRef);
    if (snapshot.exists()) {
        const ativos = snapshot.val();
        for (const key in ativos) {
            const ativo = ativos[key];
            if (ativo.ticker) {
                const novoPreco = await buscarPreco(ativo.ticker);
                if (novoPreco !== null && novoPreco !== ativo.precoAtual) {
                    await update(ref(db, `carteira/${key}`), {
                        precoAtual: novoPreco
                    });
                    console.log(`Preço de ${ativo.ticker} atualizado para ${toBRL(novoPreco)}`);
                }
            }
        }
    }
}

// ===== Inicialização e Listeners do Firebase =====
onValue(carteiraRef, (snapshot) => {
    const data = snapshot.val() || {};
    carteira = data;
    const ativosDaCategoria = Object.keys(carteira)
        .filter(key => carteira[key].tipo === category)
        .map(key => ({ key, ...carteira[key] }));
        
    renderTabelaAtivos(ativosDaCategoria);
    renderPlanoDeAporte(ativosDaCategoria); // NOVO: Chama a renderização do plano de aporte
    renderCharts(ativosDaCategoria);
});

onValue(setoresRef, (snapshot) => {
    setores = snapshot.val() || {};
    if(modalSetores.open) {
        renderSetoresSegmentosList(currentCategoryForGerenciar);
    }
});

onValue(segmentosRef, (snapshot) => {
    segmentos = snapshot.val() || {};
    if(modalSetores.open) {
        renderSetoresSegmentosList(currentCategoryForGerenciar);
    }
});

// NOVO: Listener para as metas de aporte
onValue(metasDeAporteRef, (snapshot) => {
    metasDeAporte = snapshot.val() || {};
    // Re-renderiza a tabela de plano de aporte para refletir as novas metas
    const ativosDaCategoria = Object.keys(carteira)
        .filter(key => carteira[key].tipo === category)
        .map(key => ({ key, ...carteira[key] }));
    renderPlanoDeAporte(ativosDaCategoria);
});

// Chama a função de atualização de preços a cada 5 minutos (300.000 milissegundos)
setInterval(atualizarPrecos, 300000);

// Chama a função uma vez ao carregar a página
atualizarPrecos();
