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
const colVisibilityRef = ref(db, 'column_visibility');

// ===== Utilidades de número e moeda (pt-BR) =====
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
function parseBRL(str) {
    if (str == null || str === '') return 0;
    return Number(String(str).replace(/\./g,'').replace(',', '.')) || 0;
}
function toBRL(n) { return fmtBRL.format(n || 0); }
function toUSD(n) { return fmtUSD.format(n || 0); }
function toPct(n) { return (n || 0).toFixed(2) + '%'; }
function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }

const API_KEY = "jaAoNZHhBLxF7FAUh6QDVp";

// Variáveis de estado
let activeTab = 'all';
let carteira = {};
let metas = {};
let colVisibility = {};

// Função para buscar preço atual da ação na API
async function buscarPreco(ticker) {
    const url = `https://brapi.dev/api/quote/${ticker}?token=${API_KEY}`;
    try {
        const resp = await fetch(url);
        const json = await resp.json();
        return json.results?.[0]?.regularMarketPrice || null;
    } catch (err) {
        console.error(err);
        return null;
    }
}

// Nova função para buscar a cotação do dólar
async function buscarDolar() {
    const url = "https://economia.awesomeapi.com.br/json/last/USD-BRL";
    try {
        const resp = await fetch(url);
        const json = await resp.json();
        return parseFloat(json.USDBRL.bid);
    } catch (err) {
        console.error("Erro ao buscar cotação do dólar:", err);
        return null;
    }
}

// ===== DOM =====
const form = document.getElementById('formAtivo');
const modalForm = document.getElementById('modalForm');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const tickerInput = document.getElementById('ticker');
const precoInput = document.getElementById('preco');
const tipoSelect = document.getElementById('tipo');
const corpo = document.getElementById('corpoTabela');
const tabelaPosicoes = document.getElementById('tabela');
const corpoRebalanceamento = document.getElementById('corpoTabelaRebalanceamento');
const tabelaRebalanceamento = document.getElementById('tabelaRebalanceamento');
const tabsContainer = document.getElementById('tabs-container');
const patrimonioTotalNacional = document.getElementById('patrimonioTotalNacional');

const modalAddCategory = document.getElementById('modalAddCategory');
const openAddCategoryModal = document.getElementById('openAddCategoryModal');
const closeAddCategoryModal = document.getElementById('closeAddCategoryModal');
const formAddCategory = document.getElementById('formAddCategory');
const colControls = document.querySelectorAll('.column-controls input[type="checkbox"]');

// Eventos
document.getElementById('apagarTudo').addEventListener('click', () => {
    if(confirm('Tem certeza que deseja apagar toda a carteira? Esta ação é irreversível.')){
        // Remove explicitamente os dados de 'carteira' e 'metas' no Firebase
        remove(carteiraRef);
        remove(metasRef);
    }
});

openModalBtn.addEventListener('click', () => { modalForm.showModal(); form.reset(); });
closeModalBtn.addEventListener('click', () => modalForm.close());
modalForm.addEventListener('click', e => {
    const dialogDimensions = modalForm.getBoundingClientRect()
    if (e.clientX < dialogDimensions.left || e.clientX > dialogDimensions.right || e.clientY < dialogDimensions.top || e.clientY > dialogDimensions.bottom) {
        modalForm.close();
    }
});

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
        // Usa set para adicionar ou atualizar a meta no Firebase
        set(ref(db, `metas/${categoryName}`), categoryMeta);
        modalAddCategory.close();
    }
});

tickerInput.addEventListener('change', async () => {
    const ticker = tickerInput.value.trim().toUpperCase();
    if (ticker) {
        const preco = await buscarPreco(ticker);
        if (preco) {
            precoInput.value = preco.toFixed(2).replace('.', ',');
        } else {
            precoInput.value = '';
        }
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ticker = String(form.ticker.value).trim().toUpperCase();
    const tipo = form.tipo.value;
    const quantidade = Number(form.quantidade.value);
    const preco = parseBRL(form.preco.value);
    const corretagem = parseBRL(form.corretagem.value);

    if(!ticker || !quantidade || !preco) return;

    const investido = round2(quantidade * preco + corretagem);
    const precoMedio = round2(investido / quantidade);
    
    const precoAtual = await buscarPreco(ticker);

    // Verifica se o ativo já existe na carteira
    const existenteKey = Object.keys(carteira).find(key => carteira[key].ticker === ticker && carteira[key].tipo === tipo);

    if (existenteKey){
        // Se existir, atualiza a quantidade e o preço médio
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
        // Se não existir, adiciona um novo ativo usando push() para gerar uma chave única
        push(carteiraRef, {
            ticker, tipo, quantidade,
            investido, precoMedio,
            precoAtual: precoAtual || 0
        });
    }
    
    modalForm.close();
});

// Função para buscar os preços de todos os ativos da carteira
async function buscarPrecosDaCarteira() {
    // Converte o objeto de ativos em um array de promessas
    const promises = Object.keys(carteira).map(async key => {
        const pos = carteira[key];
        const precoAtual = await buscarPreco(pos.ticker);
        pos.precoAtual = precoAtual || 0;
        // Atualiza o valor no Firebase para persistir o preço atual
        set(ref(db, `carteira/${key}/precoAtual`), precoAtual || 0);
    });
    await Promise.all(promises);
}

// ===== Funções de renderização =====

function renderTabs() {
    tabsContainer.innerHTML = '';
    const categorias = ['all', ...Object.keys(metas)];
    categorias.forEach(cat => {
        const button = document.createElement('button');
        button.className = `btn sec tab-btn${activeTab === cat ? ' active' : ''}`;
        button.dataset.tab = cat;
        button.textContent = cat === 'all' ? 'Todos' : cat;
        tabsContainer.appendChild(button);
    });
}

function renderSelectOptions() {
    tipoSelect.innerHTML = '';
    Object.keys(metas).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        tipoSelect.appendChild(option);
    });
}

async function renderPosicoes(){
    await buscarPrecosDaCarteira();
    const dolar = await buscarDolar();
    
    corpo.innerHTML = '';

    const filteredCarteira = activeTab === 'all'
        ? Object.keys(carteira).map(key => ({ ...carteira[key], id: key }))
        : Object.keys(carteira).filter(key => carteira[key].tipo === activeTab).map(key => ({ ...carteira[key], id: key }));

    filteredCarteira.forEach(pos => {
        let valorAtual = 0;
        let valorUSD = 0;
        let valorBRL = 0;

        const isForeign = ['Stoks', 'ETF Exterior', 'Reits'].includes(pos.tipo);

        if (isForeign) {
            valorUSD = round2(pos.precoAtual * pos.quantidade);
            valorBRL = round2(valorUSD * dolar);
            valorAtual = valorBRL;
        } else {
            valorAtual = round2(pos.precoAtual * pos.quantidade);
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="nowrap"><strong>${pos.ticker}</strong></td>
            <td><span class="pill">${pos.tipo}</span></td>
            <td class="right editable-qty" data-id="${pos.id}">${fmtNum.format(pos.quantidade)}</td>
            <td class="right editable" data-id="${pos.id}">${isForeign ? toUSD(pos.precoAtual) : toBRL(pos.precoAtual)}</td>
            <td class="right">${isForeign ? toUSD(valorUSD) : '<span class="muted">—</span>'}</td>
            <td class="right">${isForeign ? toBRL(valorBRL) : '<span class="muted">—</span>'}</td>
            <td class="right"></td>
        `;
        corpo.appendChild(tr);
    });

    updateColVisibility();
}

async function renderRebalanceamento() {
    corpoRebalanceamento.innerHTML = '';
    const dolar = await buscarDolar();

    const patrimonioTotal = Object.keys(carteira).reduce((sum, key) => {
        const pos = carteira[key];
        const isForeign = ['Stoks', 'ETF Exterior', 'Reits'].includes(pos.tipo);
        const valor = (pos.precoAtual || 0) * pos.quantidade;
        return sum + (isForeign ? valor * dolar : valor);
    }, 0);
    
    patrimonioTotalNacional.textContent = toBRL(patrimonioTotal);

    const categoriasComPatrimonio = {};
    Object.keys(metas).forEach(cat => {
        const isForeign = ['Stoks', 'ETF Exterior', 'Reits'].includes(cat);
        const patrimonioCategoria = Object.keys(carteira).filter(key => carteira[key].tipo === cat)
                                                            .reduce((sum, key) => {
                                                                const pos = carteira[key];
                                                                const valor = (pos.precoAtual || 0) * pos.quantidade;
                                                                return sum + (isForeign ? valor * dolar : valor);
                                                            }, 0);
        categoriasComPatrimonio[cat] = patrimonioCategoria;
    });

    Object.keys(metas).forEach(cat => {
        const meta = metas[cat] || 0;
        const patrimonio = categoriasComPatrimonio[cat] || 0;
        const atual = patrimonioTotal > 0 ? (patrimonio / patrimonioTotal) * 100 : 0;
        let aportar = 0;
        if (atual > 0) {
            aportar = (meta - atual) > 0 ? round2(((meta - atual) * patrimonioTotal) / atual) : 0;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cat}</strong></td>
            <td class="right">${toPct(meta)}</td>
            <td class="right ${atual > meta * 1.05 ? 'red' : atual < meta * 0.95 ? 'green' : ''}">${toPct(atual)}</td>
            <td class="right">${toBRL(patrimonio)}</td>
            <td class="right ${aportar > 0 ? 'green' : 'muted'}">${toBRL(aportar)}</td>
            <td class="right">
                <button class="btn sec btn-sm" data-edit-cat="${cat}">✏️</button>
                <button class="btn danger btn-sm" data-del-cat="${cat}">X</button>
            </td>
        `;
        corpoRebalanceamento.appendChild(tr);
    });
}

// Nova função para aplicar a visibilidade das colunas
function updateColVisibility() {
    const tableHeaders = tabelaPosicoes.querySelectorAll('thead th');
    const tableRows = tabelaPosicoes.querySelectorAll('tbody tr');
    
    // Atualiza o estado dos checkboxes com base no estado local
    colControls.forEach(checkbox => {
        const colIndex = checkbox.dataset.colIndex;
        checkbox.checked = colVisibility[colIndex];
    });

    // Aplica a classe de ocultação nas colunas
    Object.keys(colVisibility).forEach(index => {
        const isVisible = colVisibility[index];
        const colHeader = tableHeaders[index];

        if (colHeader) {
            colHeader.classList.toggle('hidden-column', !isVisible);
        }

        tableRows.forEach(row => {
            const cell = row.cells[index];
            if (cell) {
                cell.classList.toggle('hidden-column', !isVisible);
            }
        });
    });

    // Ajusta o colspan do tfoot
    const visibleCols = Object.keys(colVisibility).filter(key => colVisibility[key]).length + 3; // 3 colunas fixas
    const tfootCell = tabelaPosicoes.querySelector('tfoot td');
    if (tfootCell) {
        tfootCell.colSpan = visibleCols;
    }
}

function render() {
    console.log("Rendering page...");
    renderTabs();
    renderSelectOptions();
    renderPosicoes();
    renderRebalanceamento();
    hookEvents();
}

// ===== Funções de Edição e Exclusão =====

function hookEvents(){
    console.log("Attaching event listeners...");
    // Excluir Categoria
    document.querySelectorAll('[data-del-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.delCat;
            if(confirm(`Tem certeza que deseja excluir a categoria "${category}" e todos os ativos dela?`)) {
                // Remove a meta no Firebase
                remove(ref(db, `metas/${category}`));
                
                // Remove todos os ativos dessa categoria
                Object.keys(carteira).filter(key => carteira[key].tipo === category).forEach(key => {
                    remove(ref(db, `carteira/${key}`));
                });
            }
        });
    });
    
    // Botão para editar Meta
    document.querySelectorAll('[data-edit-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log("Edit button clicked for category:", btn.dataset.editCat);
            const category = btn.dataset.editCat;
            const td = btn.closest('tr').querySelector('td:nth-child(2)');
            makeEditableMeta(td, category);
        });
    });

    // Duplo clique para editar Preço Atual
    document.querySelectorAll('td.editable').forEach(td => {
        td.addEventListener('dblclick', () => makeEditable(td, 'precoAtual'));
    });

    // Duplo clique para editar Quantidade
    document.querySelectorAll('td.editable-qty').forEach(td => {
        td.addEventListener('dblclick', () => makeEditable(td, 'quantidade'));
    });

    // Adicionar evento de clique nos botões das abas
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeTab = button.dataset.tab;
            render();
        });
    });

    // Listener para os checkboxes de visibilidade
    colControls.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const colIndex = e.target.dataset.colIndex;
            colVisibility[colIndex] = e.target.checked;
            // Salva a visibilidade no Firebase
            set(colVisibilityRef, colVisibility);
            updateColVisibility();
        });
    });
}

function makeEditable(td, key){
    const id = td.dataset.id;
    const pos = carteira[id];
    if(!pos) return;
    const old = (pos[key] || 0).toString().replace('.', ',');

    td.innerHTML = `<input id="_edit" type="number" step="any" style="width:110px; background:#0b1020; color:var(--text); padding:6px 8px; border-radius:8px; border:1px solid rgba(255,255,255,.2)" placeholder="0,00" value="${old}">`;
    const input = td.querySelector('#_edit');
    input.focus();

    function commit(){
        let v = parseBRL(input.value);
        if (key === 'quantidade') {
            v = Number(v);
            if (v > 0) {
                // Atualiza a quantidade e o valor investido no Firebase
                set(ref(db, `carteira/${id}/quantidade`), v);
                set(ref(db, `carteira/${id}/investido`), round2(v * pos.precoMedio));
            }
        } else {
            // Atualiza o preço atual no Firebase
            set(ref(db, `carteira/${id}/${key}`), round2(v));
        }
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (ev) => {
        if(ev.key === 'Enter') commit();
        if(ev.key === 'Escape') render();
    });
}

function makeEditableMeta(td, category){
    console.log("Making meta editable for:", category);
    const old = metas[category] || 0;
    
    // Garante que o input seja criado corretamente
    td.innerHTML = `<input id="_edit_meta" type="number" min="0" max="100" step="1" style="width:60px; background:#0b1020; color:var(--text); padding:6px 8px; border-radius:8px; border:1px solid rgba(255,255,255,.2)" placeholder="%" value="${old}">`;
    const input = td.querySelector('#_edit_meta');
    
    if (input) {
        input.focus();
        function commit(){
            const v = Number(input.value);
            console.log("Committing value:", v);
            if (!isNaN(v) && v >= 0 && v <= 100) {
                // Atualiza a meta no Firebase
                set(ref(db, `metas/${category}`), v);
            }
        }
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (ev) => {
            if(ev.key === 'Enter') commit();
            if(ev.key === 'Escape') render();
        });
    } else {
        console.error("Could not find the input field to make editable.");
    }
}

// ===== CSV Export / Import =====
function toCsv(){
    const headers = ['ticker','tipo','quantidade','precoMedio','investido','precoAtual'];
    const lines = [headers.join(';')].concat(
        Object.keys(carteira).map(key => {
            const p = carteira[key];
            return [p.ticker,p.tipo,p.quantidade,p.precoMedio,p.investido,p.precoAtual].join(';');
        })
    );
    return lines.join('\n');
}

function downloadCsv(){
    const blob = new Blob(["\uFEFF" + toCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'carteira_b3.csv'; a.click();
    URL.revokeObjectURL(url);
}

function importCsv(text){
    const lines = text.trim().split(/\r?\n/);
    const header = lines.shift();
    const idx = header.split(';');
    const req = ['ticker','tipo','quantidade','precoMedio','investido','precoAtual'];
    const ok = req.every((h,i) => (idx[i]||'').toLowerCase() === h);
    if(!ok){ alert('Cabeçalho CSV inválido. Use o arquivo exportado pelo sistema.'); return; }

    // Remove os dados antigos no Firebase antes de importar
    remove(carteiraRef).then(() => {
        const newAssets = lines.map(l => {
            const [ticker,tipo,qt,pm,inv,pa] = l.split(';');
            return {
                ticker: ticker.toUpperCase(),
                tipo,
                quantidade: Number(qt),
                precoMedio: round2(parseFloat(pm)),
                investido: round2(parseFloat(inv)),
                precoAtual: round2(parseFloat(pa||'0'))
            };
        });
        // Adiciona os novos dados ao Firebase
        newAssets.forEach(asset => push(carteiraRef, asset));
    });
}

document.getElementById('exportarCsv').addEventListener('click', downloadCsv);
document.getElementById('importCsv').addEventListener('change', (e) => {
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = () => importCsv(reader.result);
    reader.readAsText(f, 'utf-8');
    e.target.value = '';
});

// ===== Inicialização e Listeners do Firebase =====

// Listener para a carteira de ativos
onValue(carteiraRef, (snapshot) => {
    const data = snapshot.val() || {};
    carteira = data;
    render();
});

// Listener para as metas de categoria
onValue(metasRef, (snapshot) => {
    const data = snapshot.val() || {
        'Ação': 50,
        'FII': 30,
        'ETF': 10,
        'BDR': 5,
        'Outros': 5,
        'ETF Exterior': 0,
        'Reits': 0,
        'Stoks': 0,
        'Fiagro': 0
    };
    metas = data;
    render();
});

// Listener para a visibilidade das colunas
onValue(colVisibilityRef, (snapshot) => {
    const data = snapshot.val() || {
        '2': true,
        '3': true,
        '4': true,
        '5': true
    };
    colVisibility = data;
    updateColVisibility();
});
