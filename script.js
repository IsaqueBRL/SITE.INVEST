// Importa as funções do Firebase SDK
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// ===== Configuração do Firebase =====
const firebaseConfig = {
    apiKey: "AIzaSyBNBf_DachNBO2RmQGmfOPg3PEuig5cVRw",
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
const metasRef = ref(db, 'metas');

// Variáveis de estado
let carteira = {};
let metas = {};

// ===== Utilitários de Formatação =====
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
function parseBRL(str) {
    if (str == null || str === '') return 0;
    return Number(String(str).replace(/\./g,'').replace(',', '.')) || 0;
}
function toBRL(n) { return fmtBRL.format(n || 0); }
function toPct(n) { return (n || 0).toFixed(2) + '%'; }
function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }

// ===== DOM Elements =====
const formAtivo = document.getElementById('formAtivo');
const modalForm = document.getElementById('modalForm');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const tickerInput = document.getElementById('ticker');
const precoInput = document.getElementById('preco');
const tipoSelect = document.getElementById('tipo');

const corpoTabela = document.getElementById('corpoTabelaRebalanceamento');
const patrimonioTotalDashboard = document.getElementById('patrimonioTotalDashboard');

const modalAddCategory = document.getElementById('modalAddCategory');
const openAddCategoryModal = document.getElementById('openAddCategoryModal');
const closeAddCategoryModal = document.getElementById('closeAddCategoryModal');
const formAddCategory = document.getElementById('formAddCategory');

// ===== Eventos dos Botões e Modais =====
openModalBtn.addEventListener('click', () => {
    modalForm.showModal();
    formAtivo.reset();
});

closeModalBtn.addEventListener('click', () => modalForm.close());

openAddCategoryModal.addEventListener('click', () => {
    modalAddCategory.showModal();
    formAddCategory.reset();
});

closeAddCategoryModal.addEventListener('click', () => modalAddCategory.close());

// Fechar modais clicando fora
[modalForm, modalAddCategory].forEach(modal => {
    modal.addEventListener('click', e => {
        const dialogDimensions = modal.getBoundingClientRect();
        if (e.clientX < dialogDimensions.left || e.clientX > dialogDimensions.right || e.clientY < dialogDimensions.top || e.clientY > dialogDimensions.bottom) {
            modal.close();
        }
    });
});

// ===== Lógica de Formulários =====
formAtivo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ticker = String(formAtivo.ticker.value).trim().toUpperCase();
    const tipo = formAtivo.tipo.value;
    const quantidade = Number(formAtivo.quantidade.value);
    const preco = parseBRL(formAtivo.preco.value);
    const corretagem = parseBRL(formAtivo.corretagem.value);

    if(!ticker || !quantidade || !preco) return;

    const investido = round2(quantidade * preco + corretagem);
    const precoMedio = round2(investido / quantidade);

    const existenteKey = Object.keys(carteira).find(key => carteira[key].ticker === ticker && carteira[key].tipo === tipo);

    if (existenteKey){
        const existente = carteira[existenteKey];
        const totalQtde = existente.quantidade + quantidade;
        const totalInv = existente.investido + investido;
        const novoPrecoMedio = round2(totalInv / totalQtde);

        set(ref(db, `carteira/${existenteKey}`), {
            ...existente,
            quantidade: totalQtde,
            investido: round2(totalInv),
            precoMedio: novoPrecoMedio
        });
    } else {
        push(carteiraRef, {
            ticker, tipo, quantidade,
            investido, precoMedio
        });
    }
    
    modalForm.close();
});

formAddCategory.addEventListener('submit', (e) => {
    e.preventDefault();
    const categoryName = formAddCategory.categoryName.value.trim();
    const categoryMeta = Number(formAddCategory.categoryMeta.value);
    
    if (categoryName && !isNaN(categoryMeta)) {
        set(ref(db, `metas/${categoryName}`), categoryMeta);
        modalAddCategory.close();
    }
});

// ===== Funções de Lógica e Renderização =====
function renderSelectOptions() {
    tipoSelect.innerHTML = '';
    Object.keys(metas).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        tipoSelect.appendChild(option);
    });
}

function calcularValores() {
    const patrimonioTotal = Object.keys(carteira).reduce((sum, key) => {
        const pos = carteira[key];
        const valor = (pos.precoAtual || pos.precoMedio) * pos.quantidade;
        return sum + valor;
    }, 0);
    
    patrimonioTotalDashboard.textContent = toBRL(patrimonioTotal);

    const categoriasComValores = {};
    Object.keys(metas).forEach(cat => {
        const patrimonio = Object.keys(carteira).filter(key => carteira[key].tipo === cat)
            .reduce((sum, key) => {
                const pos = carteira[key];
                const valor = (pos.precoAtual || pos.precoMedio) * pos.quantidade;
                return sum + valor;
            }, 0);
        
        const meta = metas[cat] || 0;
        const atual = patrimonioTotal > 0 ? (patrimonio / patrimonioTotal) * 100 : 0;
        const aportar = atual < meta ? (meta * patrimonioTotal) / 100 - patrimonio : 0;

        categoriasComValores[cat] = {
            meta,
            patrimonio,
            atual,
            aportar
        };
    });
    return { categoriasComValores, patrimonioTotal };
}

function renderTabela() {
    const { categoriasComValores } = calcularValores();
    corpoTabela.innerHTML = '';

    if (Object.keys(metas).length === 0) {
        corpoTabela.innerHTML = `
            <tr>
                <td colspan="6" class="muted" style="text-align:center;">Adicione uma categoria para começar.</td>
            </tr>
        `;
        return;
    }

    const sortedCategories = Object.keys(metas).sort((catA, catB) => {
        const patrimonioA = categoriasComValores[catA]?.patrimonio || 0;
        const patrimonioB = categoriasComValores[catB]?.patrimonio || 0;
        return patrimonioB - patrimonioA;
    });

    for (const cat of sortedCategories) {
        const vals = categoriasComValores[cat] || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cat}</strong></td>
            <td class="right" data-edit-meta="${cat}">${toPct(vals.meta)}</td>
            <td class="right ${vals.atual > vals.meta * 1.05 ? 'red' : vals.atual < vals.meta * 0.95 ? 'green' : ''}">${toPct(vals.atual)}</td>
            <td class="right">${toBRL(vals.patrimonio)}</td>
            <td class="right ${vals.aportar > 0 ? 'green' : 'red'}">${toBRL(vals.aportar)}</td>
            <td class="right">
                <button class="btn sec btn-sm" data-edit-cat="${cat}">✏️</button>
                <button class="btn danger btn-sm" data-del-cat="${cat}">X</button>
            </td>
        `;
        corpoTabela.appendChild(tr);
    }
}

function makeEditableMeta(td, category){
    const old = metas[category] || 0;
    
    td.innerHTML = `<input id="_edit_meta" type="number" min="0" max="100" step="1" style="width:60px; background:#141829; color:var(--text); padding:6px 8px; border-radius:8px; border:1px solid #2d3748" placeholder="%" value="${old}">`;
    const input = td.querySelector('#_edit_meta');
    
    if (input) {
        input.focus();
        function commit(){
            const v = Number(input.value);
            if (!isNaN(v) && v >= 0 && v <= 100) {
                set(ref(db, `metas/${category}`), v);
            }
        }
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (ev) => {
            if(ev.key === 'Enter') commit();
            if(ev.key === 'Escape') renderTabela();
        });
    }
}

// ===== Delegação de Eventos =====
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-del-cat]')) {
        const category = e.target.dataset.delCat;
        if(confirm(`Tem certeza que deseja excluir a categoria "${category}" e todos os ativos dela?`)) {
            remove(ref(db, `metas/${category}`));
            Object.keys(carteira).filter(key => carteira[key].tipo === category).forEach(key => {
                remove(ref(db, `carteira/${key}`));
            });
        }
    }
});

document.addEventListener('dblclick', (e) => {
    if (e.target.matches('[data-edit-meta]')) {
        const category = e.target.dataset.editMeta;
        makeEditableMeta(e.target, category);
    }
});

// ===== Inicialização e Listeners do Firebase =====
onValue(carteiraRef, (snapshot) => {
    const data = snapshot.val() || {};
    carteira = data;
    renderTabela();
});

onValue(metasRef, (snapshot) => {
    const data = snapshot.val() || {};
    metas = data;
    renderTabela();
    renderSelectOptions();
});
