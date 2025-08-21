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

// ===== Utilidades de número e moeda (pt-BR) =====
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtUSD = new Intl.Number.Format('en-US', { style: 'currency', currency: 'USD' });
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
let carteira = {};
let metas = {};

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
const corpoRebalanceamento = document.getElementById('corpoTabelaRebalanceamento');
const tabelaRebalanceamento = document.getElementById('tabelaRebalanceamento');

const patrimonioTotalDashboard = document.getElementById('patrimonioTotalDashboard');

const modalAddCategory = document.getElementById('modalAddCategory');
const openAddCategoryModal = document.getElementById('openAddCategoryModal');
const closeAddCategoryModal = document.getElementById('closeAddCategoryModal');
const formAddCategory = document.getElementById('formAddCategory');

// Eventos
document.getElementById('apagarTudo').addEventListener('click', () => {
    if(confirm('Tem certeza que deseja apagar toda a carteira? Esta ação é irreversível.')){
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
            investido, precoMedio,
            precoAtual: precoAtual || 0
        });
    }
    
    modalForm.close();
});

async function buscarPrecosDaCarteira() {
    const promises = Object.keys(carteira).map(async key => {
        const pos = carteira[key];
        const precoAtual = await buscarPreco(pos.ticker);
        pos.precoAtual = precoAtual || 0;
        set(ref(db, `carteira/${key}/precoAtual`), precoAtual || 0);
    });
    await Promise.all(promises);
}

// Renderiza a tabela interna de ativos
async function renderSubTable(category) {
    const dolar = await buscarDolar();
    const ativosDaCategoria = Object.keys(carteira)
        .filter(key => carteira[key].tipo === category)
        .map(key => ({ ...carteira[key], id: key }));

    let subTableHtml = `
        <div class="sub-table-container">
            <table class="sub-table">
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th class="right">Qtde</th>
                        <th class="right">Preço Atual</th>
                        <th class="right">Valor USD</th>
                        <th class="right">Valor BRL</th>
                        <th class="right">Ações</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    ativosDaCategoria.forEach(pos => {
        const isForeign = ['Stoks', 'ETF Exterior', 'Reits'].includes(pos.tipo);
        const valorUSD = isForeign ? round2(pos.precoAtual * pos.quantidade) : 0;
        const valorBRL = isForeign ? round2(valorUSD * dolar) : 0;

        subTableHtml += `
            <tr>
                <td><strong>${pos.ticker}</strong></td>
                <td class="right editable-qty" data-id="${pos.id}">${fmtNum.format(pos.quantidade)}</td>
                <td class="right editable" data-id="${pos.id}">${isForeign ? toUSD(pos.precoAtual) : toBRL(pos.precoAtual)}</td>
                <td class="right">${isForeign ? toUSD(valorUSD) : '<span class="muted">—</span>'}</td>
                <td class="right">${isForeign ? toBRL(valorBRL) : '<span class="muted">—</span>'}</td>
                <td class="right">
                    <button class="btn danger btn-sm" data-delete-id="${pos.id}">X</button>
                </td>
            </tr>
        `;
    });

    subTableHtml += `
                </tbody>
            </table>
        </div>
    `;

    return subTableHtml;
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

    patrimonioTotalDashboard.textContent = toBRL(patrimonioTotal);

    const categoriasComValores = {};
    Object.keys(metas).forEach(cat => {
        const isForeign = ['Stoks', 'ETF Exterior', 'Reits'].includes(cat);
        const patrimonio = Object.keys(carteira).filter(key => carteira[key].tipo === cat)
            .reduce((sum, key) => {
                const pos = carteira[key];
                const valor = (pos.precoAtual || 0) * pos.quantidade;
                return sum + (isForeign ? valor * dolar : valor);
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

    if (Object.keys(metas).length === 0) {
        corpoRebalanceamento.innerHTML = `
            <tr>
                <td colspan="6" class="muted" style="text-align:center;">Adicione uma categoria.</td>
            </tr>
        `;
    } else {
        const sortedCategories = Object.keys(metas).sort((catA, catB) => {
            const patrimonioA = categoriasComValores[catA]?.patrimonio || 0;
            const patrimonioB = categoriasComValores[catB]?.patrimonio || 0;
            return patrimonioB - patrimonioA;
        });

        for (const cat of sortedCategories) {
            const vals = categoriasComValores[cat] || {};
            const tr = document.createElement('tr');
            tr.className = 'expandable-row';
            tr.dataset.category = cat;
            tr.innerHTML = `
                <td><span class="expandable-toggle">▶</span><strong>${cat}</strong></td>
                <td class="right">${toPct(vals.meta)}</td>
                <td class="right ${vals.atual > vals.meta * 1.05 ? 'red' : vals.atual < vals.meta * 0.95 ? 'green' : ''}">${toPct(vals.atual)}</td>
                <td class="right">${toBRL(vals.patrimonio)}</td>
                <td class="right ${vals.aportar > 0 ? 'green' : 'muted'}">${toBRL(vals.aportar)}</td>
                <td class="right">
                    <button class="btn sec btn-sm" data-edit-cat="${cat}">✏️</button>
                    <button class="btn danger btn-sm" data-del-cat="${cat}">X</button>
                </td>
            `;
            corpoRebalanceamento.appendChild(tr);
        }
    }
}


function render() {
    renderSelectOptions();
    renderRebalanceamento();
    hookEvents();
}

// ===== Funções de Edição e Exclusão =====

function hookEvents(){
    document.querySelectorAll('[data-del-cat]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const category = btn.dataset.delCat;
            if(confirm(`Tem certeza que deseja excluir a categoria "${category}" e todos os ativos dela?`)) {
                remove(ref(db, `metas/${category}`));
                
                Object.keys(carteira).filter(key => carteira[key].tipo === category).forEach(key => {
                    remove(ref(db, `carteira/${key}`));
                });
            }
        });
    });
    
    document.querySelectorAll('[data-edit-cat]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const category = btn.dataset.editCat;
            const td = btn.closest('tr').querySelector('td:nth-child(2)');
            makeEditableMeta(td, category);
        });
    });

    document.querySelectorAll('.expandable-row').forEach(row => {
        row.addEventListener('click', async () => {
            const category = row.dataset.category;
            const nextRow = row.nextElementSibling;
            
            if (row.classList.contains('expanded')) {
                row.classList.remove('expanded');
                if (nextRow && nextRow.classList.contains('sub-table-row')) {
                    nextRow.remove();
                }
            } else {
                row.classList.add('expanded');
                const subTableHtml = await renderSubTable(category);
                const subRow = document.createElement('tr');
                subRow.className = 'sub-table-row';
                subRow.innerHTML = `<td colspan="6">${subTableHtml}</td>`;
                row.after(subRow);
            }
        });
    });
    
    // Adiciona listener para os botões de deletar na sub-tabela
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-delete-id]')) {
            const id = e.target.dataset.deleteId;
            if (confirm('Tem certeza que deseja apagar este ativo?')) {
                remove(ref(db, `carteira/${id}`));
            }
        }

        if (e.target.matches('td.editable') || e.target.matches('td.editable-qty')) {
            const td = e.target;
            const isQty = td.matches('td.editable-qty');
            makeEditable(td, isQty ? 'quantidade' : 'precoAtual');
        }
    });
}

function makeEditable(td, key){
    const id = td.dataset.id;
    const pos = carteira[id];
    if(!pos) return;
    const old = (pos[key] || 0).toString().replace('.', ',');

    td.innerHTML = `<input id="_edit" type="number" step="any" style="width:110px; background:#141829; color:var(--text); padding:6px 8px; border-radius:8px; border:1px solid #2d3748" placeholder="0,00" value="${old}">`;
    const input = td.querySelector('#_edit');
    input.focus();

    function commit(){
        let v = parseBRL(input.value);
        if (key === 'quantidade') {
            v = Number(v);
            if (v > 0) {
                set(ref(db, `carteira/${id}/quantidade`), v);
                set(ref(db, `carteira/${id}/investido`), round2(v * pos.precoMedio));
            }
        } else {
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
            if(ev.key === 'Escape') render();
        });
    } else {
        console.error("Could not find the input field to make editable.");
    }
}

// ===== Inicialização e Listeners do Firebase =====
onValue(carteiraRef, (snapshot) => {
    const data = snapshot.val() || {};
    carteira = data;
    render();
});

onValue(metasRef, (snapshot) => {
    const data = snapshot.val() || {};
    metas = data;
    render();
});
