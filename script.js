// Importa as funções do Firebase SDK
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
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

// Referência para as categorias no banco de dados
const metasRef = ref(db, 'metas');

// Variável de estado para armazenar as categorias
let metas = {};

// ===== Utilitários de Formatação =====
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
function toBRL(n) { return fmtBRL.format(n || 0); }
function toPct(n) { return (n || 0).toFixed(2) + '%'; }
function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }

// ===== DOM Elements =====
const corpoTabela = document.getElementById('corpoTabelaRebalanceamento');
const patrimonioTotalDashboard = document.getElementById('patrimonioTotalDashboard');
const modalAddCategory = document.getElementById('modalAddCategory');
const openAddCategoryModal = document.getElementById('openAddCategoryModal');
const closeAddCategoryModal = document.getElementById('closeAddCategoryModal');
const formAddCategory = document.getElementById('formAddCategory');

// ===== Dados de Ativos (MOCK) para simular o cálculo =====
// Estes dados são apenas para demonstração. O ideal seria ter uma segunda tabela no Firebase para os ativos.
const carteiraMock = {
    'Ação': [ { valor: 5000 }, { valor: 2500 }],
    'FII': [ { valor: 3000 }],
    'ETF': [ { valor: 1000 }],
    'BDR': [ { valor: 500 }],
    'Outros': [ { valor: 500 }],
    'ETF Exterior': [ { valor: 0 }],
    'Reits': [ { valor: 0 }],
    'Stoks': [ { valor: 0 }],
    'Fiagro': [ { valor: 0 }],
};

// ===== Funções de Lógica e Renderização =====
function calcularValores() {
    const patrimonioTotal = Object.values(carteiraMock).flat().reduce((sum, ativo) => sum + ativo.valor, 0);
    
    patrimonioTotalDashboard.textContent = toBRL(patrimonioTotal);

    const categoriasComValores = {};
    Object.keys(metas).forEach(cat => {
        const patrimonio = (carteiraMock[cat] || []).reduce((sum, ativo) => sum + ativo.valor, 0);
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
    } else {
        console.error("Could not find the input field to make editable.");
    }
}

// ===== Eventos =====
openAddCategoryModal.addEventListener('click', () => { modalAddCategory.showModal(); formAddCategory.reset(); });
closeAddCategoryModal.addEventListener('click', () => modalAddCategory.close());
modalAddCategory.addEventListener('click', e => {
    const dialogDimensions = modalAddCategory.getBoundingClientRect()
    if (e.clientX < dialogDimensions.left || e.clientX > dialogDimensions.right || e.clientY < dialogDimensions.top || e.clientY > dialogDimensions.bottom) {
        modalAddCategory.close();
    }
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

// Delegação de eventos para os botões e células editáveis
corpoTabela.addEventListener('click', (e) => {
    if (e.target.matches('[data-del-cat]')) {
        const category = e.target.dataset.delCat;
        if(confirm(`Tem certeza que deseja excluir a categoria "${category}"? Esta ação é irreversível.`)) {
            remove(ref(db, `metas/${category}`));
        }
    }
});

corpoTabela.addEventListener('dblclick', (e) => {
    if (e.target.matches('[data-edit-meta]')) {
        const category = e.target.dataset.editMeta;
        makeEditableMeta(e.target, category);
    }
});


// ===== Inicialização e Listeners do Firebase =====
onValue(metasRef, (snapshot) => {
    const data = snapshot.val() || {};
    metas = data;
    renderTabela();
});
