// Importa as funções do Firebase SDK
import { getDatabase, ref, onValue, remove, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
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

// Variáveis de estado
let carteira = {};
let setores = {};
let segmentos = {};
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
    currentCategoryForGerenciar = category;
}

// Lógica para fechar o modal
closeSetoresModalBtn.addEventListener('click', () => modalSetores.close());
modalSetores.addEventListener('click', e => {
    const dialogDimensions = modalSetores.getBoundingClientRect();
    if (e.clientX < dialogDimensions.left || e.clientX > dialogDimensions.right || e.clientY < dialogDimensions.top || e.clientY > dialogDimensions.bottom) {
        modalSetores.close();
    }
});

// Lógica atualizada para salvar setor/segmento na categoria correta
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

// ATUALIZADO: Refatorada para calcular o total antes de renderizar a tabela
function renderTabelaAtivos(ativos) {
    // 1. Calcula o patrimônio total da categoria primeiro
    const patrimonioTotal = ativos.reduce((sum, ativo) => {
        const valorAtual = (ativo.precoAtual || ativo.precoMedio) * ativo.quantidade;
        return sum + valorAtual;
    }, 0);

    // Atualiza o total no painel de controle
    totalPatrimonio.textContent = toBRL(patrimonioTotal);

    // 2. Limpa a tabela para renderizar novamente
    tabelaAtivosCategoria.innerHTML = '';
    
    // 3. Itera sobre os ativos para criar as linhas da tabela
    ativos.forEach(ativo => {
        const valorAtual = (ativo.precoAtual || ativo.precoMedio) * ativo.quantidade;
        
        // Calcula a porcentagem de participação
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

// Função para renderizar os gráficos de pizza
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

    const setorCtx = document.getElementById('setorChart').getContext('2d');
    setorChartInstance = new Chart(setorCtx, {
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

    const segmentoCtx = document.getElementById('segmentoChart').getContext('2d');
    segmentoChartInstance = new Chart(segmentoCtx, {
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

// ===== Inicialização e Listeners do Firebase =====
onValue(carteiraRef, (snapshot) => {
    const data = snapshot.val() || {};
    carteira = data;
    const ativosDaCategoria = Object.keys(carteira)
        .filter(key => carteira[key].tipo === category)
        .map(key => ({ key, ...carteira[key] }));
        
    renderTabelaAtivos(ativosDaCategoria);
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
