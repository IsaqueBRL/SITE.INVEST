// Importa as funções do Firebase SDK
import { getDatabase, ref, push, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
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
const setoresRef = ref(db, 'setores');
const segmentosRef = ref(db, 'segmentos');

// Variáveis de estado
let carteira = {};
let metas = {};
let setores = {};
let segmentos = {};

// Variáveis de estado para a ordenação da tabela
let currentSortKey = 'patrimonio';
let currentSortDirection = 'desc';

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

// Chave da API para buscar a cotação
const API_KEY = "jaAoNZHhBLxF7FAUh6QDVp";

// Função para buscar preço atual da ação na API
async function buscarPreco(ticker) {
    const url = `https://brapi.dev/api/quote/${ticker}?token=${API_KEY}`;
    try {
        const resp = await fetch(url);
        const json = await resp.json();
        const price = json.results?.[0]?.regularMarketPrice;
        return typeof price === 'number' ? price : null;
    } catch (err) {
        console.error("Erro ao buscar preço:", err);
        return null;
    }
}

// ===== DOM Elements =====
const formAtivo = document.getElementById('formAtivo');
const modalForm = document.getElementById('modalForm');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const tickerInput = document.getElementById('ticker');
const precoInput = document.getElementById('preco');
const tipoSelect = document.getElementById('tipo');
const setorSelect = document.getElementById('setorSelect');
const segmentoSelect = document.getElementById('segmentoSelect');

const corpoTabela = document.getElementById('corpoTabelaRebalanceamento');
const patrimonioTotalDashboard = document.getElementById('patrimonioTotalDashboard');
const sortableHeaders = document.querySelectorAll('#sortable-header-row .sortable');

const modalAddCategory = document.getElementById('modalAddCategory');
const openAddCategoryModal = document.getElementById('openAddCategoryModal');
const closeAddCategoryModal = document.getElementById('closeAddCategoryModal');
const formAddCategory = document.getElementById('formAddCategory');

const modalAtivos = document.getElementById('modalAtivos');
const closeAtivosModal = document.getElementById('closeAtivosModal');
const ativosModalTitle = document.getElementById('ativosModalTitle');
const tabelaAtivosModal = document.getElementById('tabelaAtivosModal');

const modalSetores = document.getElementById('modalSetores');
const openSetoresModalBtn = document.getElementById('openSetoresModalBtn');
const closeSetoresModalBtn = document.getElementById('closeSetoresModalBtn');
const formSetores = document.getElementById('formSetores');
const setorInput = document.getElementById('setorInput');
const segmentoInput = document.getElementById('segmentoInput');
const setorList = document.getElementById('setorList');
const segmentoList = document.getElementById('segmentoList');

const modalFilteredAssets = document.getElementById('modalFilteredAssets');
const filteredModalTitle = document.getElementById('filteredModalTitle');
const closeFilteredModalBtn = document.getElementById('closeFilteredModalBtn');
const tabelaFilteredAssetsModal = document.getElementById('tabelaFilteredAssetsModal');

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

closeAtivosModal.addEventListener('click', () => modalAtivos.close());
closeSetoresModalBtn.addEventListener('click', () => modalSetores.close());
closeFilteredModalBtn.addEventListener('click', () => modalFilteredAssets.close());

// Listener para o botão "Gerenciar" que está dentro do modal de ativos
openSetoresModalBtn.addEventListener('click', () => {
    modalSetores.showModal();
    renderSetoresSegmentosList();
});

// Fechar modais clicando fora
[modalForm, modalAddCategory, modalAtivos, modalSetores, modalFilteredAssets].forEach(modal => {
    modal.addEventListener('click', e => {
        const dialogDimensions = modal.getBoundingClientRect();
        if (e.clientX < dialogDimensions.left || e.clientX > dialogDimensions.right || e.clientY < dialogDimensions.top || e.clientY > dialogDimensions.bottom) {
            modal.close();
        }
    });
});

// Listener para preencher o preço ao digitar no campo do Ticker
tickerInput.addEventListener('input', async () => {
    const ticker = tickerInput.value.trim().toUpperCase();
    if (ticker.length >= 4) {
        const preco = await buscarPreco(ticker);
        if (preco) {
            precoInput.value = preco.toFixed(2).replace('.', ',');
        } else {
            precoInput.value = '';
        }
    }
});

// Listener para preencher os selects de setor/segmento ao mudar a categoria
tipoSelect.addEventListener('change', () => {
    renderSetorSegmentoSelects();
});

// ===== Lógica de Formulários =====
formAtivo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ticker = String(formAtivo.ticker.value).trim().toUpperCase();
    const tipo = formAtivo.tipo.value;
    const setor = setorSelect.value;
    const segmento = segmentoSelect.value;
    const quantidade = Number(formAtivo.quantidade.value);
    const preco = parseBRL(formAtivo.preco.value);
    const corretagem = parseBRL(formAtivo.corretagem.value);

    if(!ticker || !quantidade || !preco) return;

    const investido = round2(quantidade * preco + corretagem);
    const precoMedio = round2(investido / quantidade);

    const precoAtual = await buscarPreco(ticker);

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
            precoMedio: novoPrecoMedio,
            precoAtual: precoAtual || existente.precoAtual,
            setor,
            segmento
        });
    } else {
        push(carteiraRef, {
            ticker, tipo, quantidade,
            investido, precoMedio,
            precoAtual: precoAtual || 0,
            setor,
            segmento
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

formSetores.addEventListener('submit', (e) => {
    e.preventDefault();
    const setor = setorInput.value.trim();
    const segmento = segmentoInput.value.trim();
    
    if (!setor && !segmento) return;

    if (setor && !Object.values(setores).includes(setor)) {
        push(setoresRef, setor);
    }
    if (segmento && !Object.values(segmentos).includes(segmento)) {
        push(segmentosRef, segmento);
    }
    formSetores.reset();
});

// Função para exibir ativos filtrados
function renderFilteredAssetsModal(filterType, filterValue) {
    const ativosFiltrados = Object.values(carteira).filter(ativo => ativo[filterType] === filterValue);
    
    filteredModalTitle.textContent = `Ativos com ${filterType}: "${filterValue}"`;
    
    const ativoRows = ativosFiltrados.map(ativo => {
        const valorAtual = (ativo.precoAtual || ativo.precoMedio) * ativo.quantidade;
        
        return `
            <tr>
                <td>${ativo.ticker}</td>
                <td>${fmtNum.format(ativo.quantidade)}</td>
                <td>${ativo.tipo}</td>
                <td>${toBRL(ativo.precoAtual || ativo.precoMedio)}</td>
                <td><span class="clickable-tag" data-filter-setor="${ativo.setor}">${ativo.setor || '-'}</span></td>
                <td><span class="clickable-tag" data-filter-segmento="${ativo.segmento}">${ativo.segmento || '-'}</span></td>
                <td>${toBRL(valorAtual)}</td>
            </tr>
        `;
    }).join('');

    tabelaFilteredAssetsModal.querySelector('tbody').innerHTML = ativosFiltrados.length > 0 ? ativoRows : `<tr><td colspan="7" style="text-align:center; padding: 20px;">Nenhum ativo encontrado com este filtro.</td></tr>`;
    modalFilteredAssets.showModal();
}

// ===== Funções de Lógica e Renderização =====
function renderSelectOptions() {
    tipoSelect.innerHTML = '';
    const categorias = Object.keys(metas);
    if(categorias.length === 0) {
        tipoSelect.innerHTML = `<option value="">Adicione uma categoria</option>`;
    } else {
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            tipoSelect.appendChild(option);
        });
        tipoSelect.value = categorias[0];
        renderSetorSegmentoSelects();
    }
}

function renderSetorSegmentoSelects() {
    setorSelect.innerHTML = '<option value="">Nenhum</option>';
    segmentoSelect.innerHTML = '<option value="">Nenhum</option>';

    const allSetores = Object.values(setores);
    const allSegmentos = Object.values(segmentos);

    allSetores.forEach(setor => {
        const option = document.createElement('option');
        option.value = setor;
        option.textContent = setor;
        setorSelect.appendChild(option);
    });

    allSegmentos.forEach(segmento => {
        const option = document.createElement('option');
        option.value = segmento;
        option.textContent = segmento;
        segmentoSelect.appendChild(option);
    });
}

function renderAtivosModal(category) {
    const ativos = Object.entries(carteira).filter(([key, ativo]) => ativo.tipo === category);
    
    ativosModalTitle.textContent = `Ativos em ${category}`;
    
    const sortedAtivos = ativos.sort(([, a], [, b]) => {
        const valorA = (a.precoAtual || a.precoMedio) * a.quantidade;
        const valorB = (b.precoAtual || b.precoMedio) * b.quantidade;
        return valorB - valorA;
    });

    const ativoRows = sortedAtivos.map(([key, ativo]) => {
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

    tabelaAtivosModal.querySelector('tbody').innerHTML = ativos.length > 0 ? ativoRows : `<tr><td colspan="7" style="text-align:center; padding: 20px;">Nenhum ativo nesta categoria.</td></tr>`;
    modalAtivos.showModal();
}

function renderSetoresSegmentosList() {
    setorList.innerHTML = '';
    Object.values(setores).forEach(setor => {
        const li = document.createElement('li');
        li.innerHTML = `${setor} <button data-del-setor="${setor}">X</button>`;
        setorList.appendChild(li);
    });

    segmentoList.innerHTML = '';
    Object.values(segmentos).forEach(segmento => {
        const li = document.createElement('li');
        li.innerHTML = `${segmento} <button data-del-segmento="${segmento}">X</button>`;
        segmentoList.appendChild(li);
    });
}

function calcularValores() {
    const patrimonioTotal = Object.keys(carteira).reduce((sum, key) => {
        const pos = carteira[key];
        const valor = (pos.precoAtual || pos.precoMedio) * pos.quantidade;
        return sum + valor;
    }, 0);
    
    patrimonioTotalDashboard.textContent = toBRL(patrimonioTotal);

    let totalMeta = 0;
    let totalAtual = 0;
    
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

        totalMeta += meta;
        totalAtual += atual;

        categoriasComValores[cat] = {
            meta,
            patrimonio,
            atual,
            aportar,
            categoria: cat
        };
    });
    return { categoriasComValores, patrimonioTotal, totalMeta, totalAtual };
}

function renderTabela() {
    const { categoriasComValores, patrimonioTotal, totalMeta, totalAtual } = calcularValores();
    corpoTabela.innerHTML = '';
    
    // Atualiza as classes de ordenação dos cabeçalhos
    sortableHeaders.forEach(header => {
        header.classList.remove('asc', 'desc');
        if (header.dataset.sortKey === currentSortKey) {
            header.classList.add(currentSortDirection);
        }
    });

    if (Object.keys(metas).length === 0) {
        corpoTabela.innerHTML = `
            <tr>
                <td colspan="6" class="muted" style="text-align:center;">Adicione uma categoria para começar.</td>
            </tr>
        `;
        return;
    }

    const sortedCategories = Object.keys(metas).sort((catA, catB) => {
        let valA = categoriasComValores[catA]?.[currentSortKey] || 0;
        let valB = categoriasComValores[catB]?.[currentSortKey] || 0;

        if (currentSortKey === 'categoria') {
            valA = catA;
            valB = catB;
        }

        const order = currentSortDirection === 'asc' ? 1 : -1;

        if (typeof valA === 'string' && typeof valB === 'string') {
            return order * valA.localeCompare(valB);
        } else {
            return order * (valA - valB);
        }
    });

    for (const cat of sortedCategories) {
        const vals = categoriasComValores[cat] || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><a href="#" class="category-link" data-cat="${cat}">${cat}</a></td>
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
    
    const totalRow = document.createElement('tr');
    totalRow.classList.add('total-row');
    totalRow.innerHTML = `
        <td>Total</td>
        <td class="right">${toPct(totalMeta)}</td>
        <td class="right">${toPct(totalAtual)}</td>
        <td class="right">${toBRL(patrimonioTotal)}</td>
        <td class="right"></td>
        <td class="right"></td>
    `;
    corpoTabela.appendChild(totalRow);
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

function makeEditableDropdown(td, ativoKey, type) {
    const currentVal = carteira[ativoKey]?.[type] || '';
    const options = Object.values(type === 'setor' ? setores : segmentos);

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
        // A tabela será re-renderizada automaticamente pelo listener do Firebase
    }

    select.addEventListener('change', updateAndRevert);
    select.addEventListener('blur', updateAndRevert);
}

// ===== Delegação de Eventos =====
document.addEventListener('click', (e) => {
    // Lógica para deletar categoria e ativos
    if (e.target.matches('[data-del-cat]')) {
        const category = e.target.dataset.delCat;
        if(confirm(`Tem certeza que deseja excluir a categoria "${category}" e todos os ativos dela?`)) {
            remove(ref(db, `metas/${category}`));
            Object.keys(carteira).filter(key => carteira[key].tipo === category).forEach(key => {
                remove(ref(db, `carteira/${key}`));
            });
        }
    }
    
    // Lógica para abrir o modal de ativos
    if (e.target.matches('.category-link')) {
        e.preventDefault();
        const category = e.target.dataset.cat;
        renderAtivosModal(category);
    }
    
    // Lógica para deletar ativo individual
    if (e.target.matches('[data-del-ativo]')) {
        const ativoKey = e.target.dataset.delAtivo;
        if (confirm("Tem certeza que deseja excluir este ativo?")) {
            remove(ref(db, `carteira/${ativoKey}`));
        }
    }

    // Lógica para deletar setor
    if (e.target.matches('[data-del-setor]')) {
        const setor = e.target.dataset.delSetor;
        const setorKey = Object.keys(setores).find(key => setores[key] === setor);
        if (setorKey) {
            remove(ref(db, `setores/${setorKey}`));
        }
    }
    
    // Lógica para deletar segmento
    if (e.target.matches('[data-del-segmento]')) {
        const segmento = e.target.dataset.delSegmento;
        const segmentoKey = Object.keys(segmentos).find(key => segmentos[key] === segmento);
        if (segmentoKey) {
            remove(ref(db, `segmentos/${segmentoKey}`));
        }
    }

    // Lógica para abrir modal de ativos filtrados a partir da tabela de ativos
    if (e.target.matches('[data-filter-setor]')) {
        const setor = e.target.dataset.filterSetor;
        renderFilteredAssetsModal('setor', setor);
    }
    
    if (e.target.matches('[data-filter-segmento]')) {
        const segmento = e.target.dataset.filterSegmento;
        renderFilteredAssetsModal('segmento', segmento);
    }
});


document.addEventListener('dblclick', (e) => {
    if (e.target.matches('[data-edit-meta]')) {
        const category = e.target.dataset.editMeta;
        makeEditableMeta(e.target, category);
    }

    if (e.target.closest('[data-edit-setor]')) {
        const td = e.target.closest('[data-edit-setor]');
        const ativoKey = td.dataset.editSetor;
        makeEditableDropdown(td, ativoKey, 'setor');
    }
    
    if (e.target.closest('[data-edit-segmento]')) {
        const td = e.target.closest('[data-edit-segmento]');
        const ativoKey = td.dataset.editSegmento;
        makeEditableDropdown(td, ativoKey, 'segmento');
    }
});

// Adiciona o listener para os cabeçalhos de coluna
sortableHeaders.forEach(header => {
    header.addEventListener('click', () => {
        const sortKey = header.dataset.sortKey;
        if (sortKey === currentSortKey) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortKey = sortKey;
            currentSortDirection = 'asc';
        }
        renderTabela();
    });
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

onValue(setoresRef, (snapshot) => {
    setores = snapshot.val() || {};
    renderSetorSegmentoSelects();
    if(modalSetores.open) {
        renderSetoresSegmentosList();
    }
});

onValue(segmentosRef, (snapshot) => {
    segmentos = snapshot.val() || {};
    renderSetorSegmentoSelects();
    if(modalSetores.open) {
        renderSetoresSegmentosList();
    }
});
