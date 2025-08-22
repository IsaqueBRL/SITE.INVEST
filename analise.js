// Importa as funções do Firebase SDK
import { getDatabase, ref, onValue, update, push, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
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

// Variáveis de formatação
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
function toBRL(n) { return fmtBRL.format(n || 0); }

// DOM Elements
const categoryTitle = document.getElementById('categoryTitle');
const totalPatrimonio = document.getElementById('totalPatrimonio');
const tabelaAtivosCategoria = document.getElementById('tabelaAtivosCategoria');
const modalSetores = document.getElementById('modalSetores');
const closeSetoresModalBtn = document.getElementById('closeSetoresModalBtn');
const gerenciarModalTitle = document.getElementById('gerenciarModalTitle');
const formSetores = document.getElementById('formSetores');
const setorInput = document.getElementById('setorInput');
const segmentoInput = document.getElementById('segmentoInput');
const setorList = document.getElementById('setorList');
const segmentoList = document.getElementById('segmentoList');

// Lógica para extrair o parâmetro da URL
const params = new URLSearchParams(window.location.search);
const category = params.get('categoria');
currentCategoryForGerenciar = category;

if (category) {
    categoryTitle.textContent = category;
} else {
    // Redireciona de volta se a categoria não for encontrada
    window.location.href = 'index.html';
}

// Lógica de Renderização
function renderCategoryAssets() {
    const ativos = Object.entries(carteira).filter(([key, ativo]) => ativo.tipo === category);
    
    const patrimonioTotalCategoria = ativos.reduce((sum, [, ativo]) => sum + ((ativo.precoAtual || ativo.precoMedio) * ativo.quantidade), 0);
    totalPatrimonio.textContent = toBRL(patrimonioTotalCategoria);

    const ativoRows = ativos.map(([key, ativo]) => {
        const valorAtual = (ativo.precoAtual || ativo.precoMedio) * ativo.quantidade;
        
        return `
            <tr>
                <td>${ativo.ticker}</td>
                <td>${fmtNum.format(ativo.quantidade)}</td>
                <td>${toBRL(ativo.precoAtual || ativo.precoMedio)}</td>
                <td data-edit-setor="${key}"><span class="editable-field">${ativo.setor || '-'}</span></td>
                <td data-edit-segmento="${key}"><span class="editable-field">${ativo.segmento || '-'}</span></td>
                <td>${toBRL(valorAtual)}</td>
                <td class="right">
                    <button class="btn danger btn-sm" data-del-ativo="${key}">X</button>
                </td>
            </tr>
        `;
    }).join('');

    tabelaAtivosCategoria.innerHTML = ativos.length > 0 ? ativoRows : `<tr><td colspan="7" style="text-align:center; padding: 20px;">Nenhum ativo nesta categoria.</td></tr>`;
}

// Lógica para renderizar a lista de setores/segmentos da categoria
function renderSetoresSegmentosList(category) {
    gerenciarModalTitle.textContent = `Gerenciar Setores/Segmentos para ${category}`;

    setorList.innerHTML = '';
    const setoresDaCategoria = setores[category] || {};
    Object.entries(setoresDaCategoria).forEach(([key, setor]) => {
        const li = document.createElement('li');
        li.innerHTML = `${setor} <button data-del-setor="${key}" data-cat="${category}">X</button>`;
        setorList.appendChild(li);
    });

    segmentoList.innerHTML = '';
    const segmentosDaCategoria = segmentos[category] || {};
    Object.entries(segmentosDaCategoria).forEach(([key, segmento]) => {
        const li = document.createElement('li');
        li.innerHTML = `${segmento} <button data-del-segmento="${key}" data-cat="${category}">X</button>`;
        segmentoList.appendChild(li);
    });
}

// Funções para edição
function makeEditableDropdown(td, ativoKey, type) {
    const currentVal = carteira[ativoKey]?.[type] || '';
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

// ===== Delegação de Eventos =====
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-del-ativo]')) {
        const ativoKey = e.target.dataset.delAtivo;
        if (confirm("Tem certeza que deseja excluir este ativo?")) {
            remove(ref(db, `carteira/${ativoKey}`));
        }
    }
    if (e.target.matches('#openSetoresModalBtn')) {
        renderSetoresSegmentosList(category);
        modalSetores.showModal();
    }
    if (e.target.matches('[data-del-setor]')) {
        const setorKey = e.target.dataset.delSetor;
        const cat = e.target.dataset.cat;
        remove(ref(db, `setores/${cat}/${setorKey}`));
    }
    if (e.target.matches('[data-del-segmento]')) {
        const segmentoKey = e.target.dataset.delSegmento;
        const cat = e.target.dataset.cat;
        remove(ref(db, `segmentos/${cat}/${segmentoKey}`));
    }
    if (e.target.matches('[data-edit-setor]')) {
        const td = e.target.closest('[data-edit-setor]');
        const ativoKey = td.dataset.editSetor;
        makeEditableDropdown(td, ativoKey, 'setor');
    }
    if (e.target.matches('[data-edit-segmento]')) {
        const td = e.target.closest('[data-edit-segmento]');
        const ativoKey = td.dataset.editSegmento;
        makeEditableDropdown(td, ativoKey, 'segmento');
    }
});
closeSetoresModalBtn.addEventListener('click', () => modalSetores.close());
modalSetores.addEventListener('click', e => {
    const dialogDimensions = modalSetores.getBoundingClientRect();
    if (e.clientX < dialogDimensions.left || e.clientX > dialogDimensions.right || e.clientY < dialogDimensions.top || e.clientY > dialogDimensions.bottom) {
        modalSetores.close();
    }
});
formSetores.addEventListener('submit', (e) => {
    e.preventDefault();
    const setor = setorInput.value.trim();
    const segmento = segmentoInput.value.trim();
    if (!setor && !segmento) return;
    if (setor) {
        push(ref(db, `setores/${category}`), setor);
    }
    if (segmento) {
        push(ref(db, `segmentos/${category}`), segmento);
    }
    formSetores.reset();
});

// Listeners do Firebase
onValue(carteiraRef, (snapshot) => {
    carteira = snapshot.val() || {};
    renderCategoryAssets();
});

onValue(setoresRef, (snapshot) => {
    setores = snapshot.val() || {};
    renderCategoryAssets();
    if(modalSetores.open) {
        renderSetoresSegmentosList(category);
    }
});

onValue(segmentosRef, (snapshot) => {
    segmentos = snapshot.val() || {};
    renderCategoryAssets();
    if(modalSetores.open) {
        renderSetoresSegmentosList(category);
    }
});
