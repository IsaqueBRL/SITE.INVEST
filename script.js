import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
const categoriasRef = ref(db, 'categorias');

// Variáveis de estado
let carteira = {};
let categorias = {};
let patrimonioChartInstance = null;

// ===== DOM Elements =====
const totalPatrimonioEl = document.getElementById('totalPatrimonio');
const tabelaCategorias = document.getElementById('tabelaCategorias');
const tabelaAtivos = document.getElementById('tabelaAtivos');
const addAtivoBtn = document.getElementById('addAtivoBtn');
const addAtivoModal = document.getElementById('addAtivoModal');
const closeAddAtivoModalBtn = document.getElementById('closeAddAtivoModalBtn');
const addAtivoForm = document.getElementById('addAtivoForm');
const tipoSelect = document.getElementById('tipoSelect');
const tickerInput = document.getElementById('tickerInput');
const quantidadeInput = document.getElementById('quantidadeInput');
const precoMedioInput = document.getElementById('precoMedioInput');
const addCategoriaModal = document.getElementById('addCategoriaModal');
const closeAddCategoriaModalBtn = document.getElementById('closeAddCategoriaModalBtn');
const addCategoriaForm = document.getElementById('addCategoriaForm');
const categoriaInput = document.getElementById('categoriaInput');

// ===== Utilitários de Formatação =====
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
function parseBRL(str) { return Number(String(str).replace(/\./g,'').replace(',', '.')) || 0; }
function toBRL(n) { return fmtBRL.format(n || 0); }
function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }

// ===== Lógica Principal da Página =====
addAtivoBtn.addEventListener('click', () => {
    addAtivoModal.showModal();
});

addAtivoForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const novoAtivo = {
        ticker: tickerInput.value.toUpperCase().trim(),
        tipo: tipoSelect.value,
        quantidade: parseFloat(quantidadeInput.value),
        precoMedio: parseBRL(precoMedioInput.value)
    };
    
    push(carteiraRef, novoAtivo);
    
    addAtivoModal.close();
    addAtivoForm.reset();
});

addCategoriaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const novaCategoria = categoriaInput.value.trim();
    if (novaCategoria) {
        push(categoriasRef, novaCategoria);
        addCategoriaModal.close();
        addCategoriaForm.reset();
    }
});

// Lógica para fechar os modais
document.addEventListener('click', (e) => {
    if (e.target.matches('#closeAddAtivoModalBtn')) {
        addAtivoModal.close();
    }
    if (e.target.matches('#closeAddCategoriaModalBtn')) {
        addCategoriaModal.close();
    }
    if (e.target.matches('[data-del-ativo]')) {
        const ativoKey = e.target.dataset.delAtivo;
        if (confirm("Tem certeza que deseja excluir este ativo?")) {
            remove(ref(db, `carteira/${ativoKey}`));
        }
    }
    if (e.target.matches('[data-del-categoria]')) {
        const categoriaKey = e.target.dataset.delCategoria;
        if (confirm("Tem certeza que deseja excluir esta categoria?")) {
            remove(ref(db, `categorias/${categoriaKey}`));
        }
    }
    if (e.target.matches('#addCategoriaBtn')) {
        addCategoriaModal.showModal();
    }
});

// Lógica para fechar modais ao clicar fora
addAtivoModal.addEventListener('click', e => {
    const rect = addAtivoModal.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        addAtivoModal.close();
    }
});

addCategoriaModal.addEventListener('click', e => {
    const rect = addCategoriaModal.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        addCategoriaModal.close();
    }
});

function renderTabelaCategorias(patrimonioPorCategoria, patrimonioTotal) {
    tabelaCategorias.innerHTML = '';
    
    Object.keys(patrimonioPorCategoria).forEach(categoria => {
        const valor = patrimonioPorCategoria[categoria].valor;
        const participacao = patrimonioTotal > 0 ? (valor / patrimonioTotal) * 100 : 0;
        const key = patrimonioPorCategoria[categoria].key;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${categoria}</td>
            <td>${toBRL(valor)}</td>
            <td>${participacao.toFixed(2)}%</td>
            <td class="right">
                <a href="analise.html?categoria=${encodeURIComponent(categoria)}" class="btn primary sm">Analisar</a>
                <button class="btn danger sm" data-del-categoria="${key}">X</button>
            </td>
        `;
        tabelaCategorias.appendChild(row);
    });
}

function renderTabelaAtivos(ativos) {
    tabelaAtivos.innerHTML = '';
    
    const patrimonioTotal = ativos.reduce((total, ativo) => total + ativo.patrimonio, 0);

    ativos.forEach(ativo => {
        const participacao = patrimonioTotal > 0 ? (ativo.patrimonio / patrimonioTotal) * 100 : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ativo.ticker}</td>
            <td>${ativo.tipo}</td>
            <td>${fmtNum.format(ativo.quantidade)}</td>
            <td>${toBRL(ativo.precoMedio)}</td>
            <td>${toBRL(ativo.patrimonio)}</td>
            <td>${participacao.toFixed(2)}%</td>
            <td class="right">
                <button class="btn danger sm" data-del-ativo="${ativo.key}">X</button>
            </td>
        `;
        tabelaAtivos.appendChild(row);
    });
}

function renderPatrimonioChart(patrimonioPorCategoria) {
    const categorias = Object.keys(patrimonioPorCategoria);
    const valores = categorias.map(cat => patrimonioPorCategoria[cat].valor);

    if (patrimonioChartInstance) {
        patrimonioChartInstance.destroy();
    }

    const ctx = document.getElementById('patrimonioPorCategoriaChart');
    if(ctx){
        patrimonioChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: categorias,
                datasets: [{
                    data: valores,
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
}

// ===== Inicialização e Listeners do Firebase =====
onValue(carteiraRef, (snapshot) => {
    const data = snapshot.val() || {};
    carteira = data;
    const ativosArray = Object.keys(carteira).map(key => ({
        key,
        ...carteira[key],
        patrimonio: carteira[key].quantidade * carteira[key].precoMedio
    }));
    
    let patrimonioTotal = 0;
    const patrimonioPorCategoria = {};
    
    for (const key in categorias) {
        patrimonioPorCategoria[categorias[key]] = { key: key, valor: 0 };
    }

    ativosArray.forEach(ativo => {
        patrimonioTotal += ativo.patrimonio;
        if (patrimonioPorCategoria[ativo.tipo]) {
            patrimonioPorCategoria[ativo.tipo].valor += ativo.patrimonio;
        }
    });

    totalPatrimonioEl.textContent = toBRL(patrimonioTotal);
    
    renderTabelaCategorias(patrimonioPorCategoria, patrimonioTotal);
    renderTabelaAtivos(ativosArray);
    renderPatrimonioChart(patrimonioPorCategoria);
});

onValue(categoriasRef, (snapshot) => {
    const data = snapshot.val() || {};
    categorias = data;
    
    tipoSelect.innerHTML = '';
    
    const categoriasArray = Object.keys(categorias).map(key => ({
        key,
        nome: categorias[key]
    }));
    
    categoriasArray.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.nome;
        option.textContent = cat.nome;
        tipoSelect.appendChild(option);
    });
    
    // Adiciona o botão de adicionar categoria
    const addCategoriaOption = document.createElement('option');
    addCategoriaOption.value = "add-new";
    addCategoriaOption.textContent = "Adicionar nova categoria...";
    tipoSelect.appendChild(addCategoriaOption);
});

tipoSelect.addEventListener('change', () => {
    if (tipoSelect.value === "add-new") {
        tipoSelect.value = ""; // Reseta o select
        addCategoriaModal.showModal();
    }
});
