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

// Variável de estado para controlar a aba ativa
let activeTab = 'all';

// Chaves para o LocalStorage
const CARTEIRA_KEY = 'carteira_b3_v1';
const METAS_KEY = 'carteira_b3_metas';

// Categoria e Metas
let carteira = load(CARTEIRA_KEY, []);
let metas = load(METAS_KEY, {
    'Ação': 50,
    'FII': 30,
    'ETF': 10,
    'BDR': 5,
    'Outros': 5,
    'ETF Exterior': 0,
    'Reits': 0,
    'Stoks': 0,
    'Fiagro': 0
});

// Funções de armazenamento e carregamento
function save(key, data){ localStorage.setItem(key, JSON.stringify(data)); }
function load(key, defaultValue){ try { return JSON.parse(localStorage.getItem(key)) || defaultValue; } catch(e){ return defaultValue; } }

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
const corpoRebalanceamento = document.getElementById('corpoTabelaRebalanceamento');
const tabsContainer = document.getElementById('tabs-container');
const sumInvestido = document.getElementById('sumInvestido');
const sumAtual = document.getElementById('sumAtual');
const sumResultado = document.getElementById('sumResultado');

const modalAddCategory = document.getElementById('modalAddCategory');
const openAddCategoryModal = document.getElementById('openAddCategoryModal');
const closeAddCategoryModal = document.getElementById('closeAddCategoryModal');
const formAddCategory = document.getElementById('formAddCategory');

// Eventos
document.getElementById('apagarTudo').addEventListener('click', () => {
  if(confirm('Tem certeza que deseja apagar toda a carteira?')){
    carteira = []; save(CARTEIRA_KEY, carteira); render();
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
        metas[categoryName] = categoryMeta;
        save(METAS_KEY, metas);
        modalAddCategory.close();
        render();
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

  const existente = carteira.find(p => p.ticker === ticker && p.tipo === tipo);
  if (existente){
    const totalQtde = existente.quantidade + quantidade;
    const totalInv = existente.investido + investido;
    existente.quantidade = totalQtde;
    existente.investido = round2(totalInv);
    existente.precoMedio = round2(totalInv / totalQtde);
  } else {
    carteira.push({
      id: crypto.randomUUID(),
      ticker, tipo, quantidade,
      investido, precoMedio,
      precoAtual: precoAtual || 0
    });
  }
  save(CARTEIRA_KEY, carteira);
  modalForm.close();
  render();
});

// Função para buscar os preços de todos os ativos da carteira
async function buscarPrecosDaCarteira() {
  const promises = carteira.map(async pos => {
    const precoAtual = await buscarPreco(pos.ticker);
    pos.precoAtual = precoAtual || 0;
  });
  await Promise.all(promises);
  save(CARTEIRA_KEY, carteira);
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
  let totalInv = 0, totalAtual = 0;

  const filteredCarteira = activeTab === 'all'
    ? carteira
    : carteira.filter(pos => pos.tipo === activeTab);

  filteredCarteira.forEach(pos => {
    let valorAtual = 0;
    let valorUSD = 0;
    let valorBRL = 0;

    const isForeign = ['Stoks', 'ETF Exterior', 'Reits'].includes(pos.tipo);

    if (isForeign) {
        valorUSD = round2(pos.precoAtual * pos.quantidade);
        valorBRL = round2(valorUSD * dolar);
        valorAtual = valorBRL; // Para o resumo, o valor é em BRL
    } else {
        valorAtual = round2(pos.precoAtual * pos.quantidade);
    }
    
    totalInv += pos.investido;
    totalAtual += valorAtual;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="nowrap"><strong>${pos.ticker}</strong></td>
      <td><span class="pill">${pos.tipo}</span></td>
      <td class="right editable-qty" data-id="${pos.id}">${fmtNum.format(pos.quantidade)}</td>
      <td class="right editable" data-id="${pos.id}">${isForeign ? toUSD(pos.precoAtual) : toBRL(pos.precoAtual)}</td>
      <td class="right">${isForeign ? toUSD(valorUSD) : '<span class="muted">—</span>'}</td>
      <td class="right">${isForeign ? toBRL(valorBRL) : '<span class="muted">—</span>'}</td>
      <td class="right">
        <div class="actions" style="justify-content:flex-end">
          <button class="btn sec" data-edit="${pos.id}">Editar</button>
          <button class="btn danger" data-del="${pos.id}">Excluir</button>
        </div>
      </td>
    `;
    corpo.appendChild(tr);
  });

  sumInvestido.textContent = toBRL(totalInv);
  sumAtual.textContent = toBRL(totalAtual);
  const res = round2(totalAtual - totalInv);
  const perc = totalInv ? (res/totalInv)*100 : 0;
  sumResultado.innerHTML = `${res>=0?'<span class="green">'+toBRL(res)+'</span>':'<span class="red">'+toBRL(res)+'</span>'} <span class="muted">(${perc.toFixed(2)}%)</span>`;
}

function renderRebalanceamento() {
    corpoRebalanceamento.innerHTML = '';
    const dolar = parseFloat(sumAtual.textContent.replace('R$ ', '').replace('.', '').replace(',', '.'));
    
    const patrimonioTotal = carteira.reduce((sum, pos) => {
      const isForeign = ['Stoks', 'ETF Exterior', 'Reits'].includes(pos.tipo);
      if (isForeign) {
        return sum + (pos.precoAtual || 0) * pos.quantidade * dolar;
      }
      return sum + (pos.precoAtual || 0) * pos.quantidade;
    }, 0);

    const categoriasComPatrimonio = {};
    Object.keys(metas).forEach(cat => {
        const isForeign = ['Stoks', 'ETF Exterior', 'Reits'].includes(cat);
        const patrimonioCategoria = carteira.filter(pos => pos.tipo === cat)
                                             .reduce((sum, pos) => {
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
            <td class="right editable-meta" data-cat="${cat}">${toPct(meta)}</td>
            <td class="right ${atual > meta * 1.05 ? 'red' : atual < meta * 0.95 ? 'green' : ''}">${toPct(atual)}</td>
            <td class="right">${toBRL(patrimonio)}</td>
            <td class="right ${aportar > 0 ? 'green' : 'muted'}">${toBRL(aportar)}</td>
            <td class="right"><button class="btn danger btn-sm" data-del-cat="${cat}">X</button></td>
        `;
        corpoRebalanceamento.appendChild(tr);
    });
}

function render() {
    renderTabs();
    renderSelectOptions();
    renderPosicoes();
    renderRebalanceamento();
    hookEvents();
}

// ===== Funções de Edição e Exclusão =====

function hookEvents(){
  // Excluir Categoria
  document.querySelectorAll('[data-del-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.delCat;
      if(confirm(`Tem certeza que deseja excluir a categoria "${category}" e todos os ativos dela?`)) {
        delete metas[category];
        save(METAS_KEY, metas);
        carteira = carteira.filter(p => p.tipo !== category);
        save(CARTEIRA_KEY, carteira);
        activeTab = 'all';
        render();
      }
    });
  });

  // Editar registro (carrega no form)
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pos = carteira.find(p => p.id === btn.dataset.edit);
      if(!pos) return;
      form.ticker.value = pos.ticker;
      form.tipo.value = pos.tipo;
      form.quantidade.value = pos.quantidade;
      form.preco.value = pos.precoMedio.toString().replace('.', ',');
      form.corretagem.value = '0,00';
      modalForm.showModal();
    });
  });

  // Excluir ativo
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      if(!confirm('Excluir esta posição?')) return;
      carteira = carteira.filter(p => p.id !== btn.dataset.del);
      save(CARTEIRA_KEY, carteira);
      render();
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

  // Duplo clique para editar Meta
  document.querySelectorAll('td.editable-meta').forEach(td => {
    td.addEventListener('dblclick', () => makeEditableMeta(td));
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
}

function makeEditable(td, key){
  const id = td.dataset.id;
  const pos = carteira.find(p => p.id === id);
  if(!pos) return;
  const old = (pos[key] || 0).toString().replace('.', ',');

  td.innerHTML = `<input id="_edit" style="width:110px; background:#0b1020; color:var(--text); padding:6px 8px; border-radius:8px; border:1px solid rgba(255,255,255,.2)" placeholder="0,00" value="${old}">`;
  const input = td.querySelector('#_edit');
  input.focus();

  function commit(){
    let v = parseBRL(input.value);
    if (key === 'quantidade') {
        v = Number(v);
        if (v > 0) {
            pos.quantidade = v;
            pos.investido = round2(v * pos.precoMedio);
        }
    } else {
        pos[key] = round2(v);
    }
    save(CARTEIRA_KEY, carteira);
    render();
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (ev) => {
    if(ev.key === 'Enter') commit();
    if(ev.key === 'Escape') render();
  });
}

function makeEditableMeta(td){
  const category = td.dataset.cat;
  const old = metas[category] || 0;

  td.innerHTML = `<input id="_edit_meta" type="number" min="0" max="100" step="1" style="width:60px; background:#0b1020; color:var(--text); padding:6px 8px; border-radius:8px; border:1px solid rgba(255,255,255,.2)" placeholder="%" value="${old}">`;
  const input = td.querySelector('#_edit_meta');
  input.focus();

  function commit(){
    const v = Number(input.value);
    if (!isNaN(v) && v >= 0 && v <= 100) {
        metas[category] = v;
        save(METAS_KEY, metas);
    }
    render();
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (ev) => {
    if(ev.key === 'Enter') commit();
    if(ev.key === 'Escape') render();
  });
}

// ===== CSV Export / Import =====
function toCsv(){
  const headers = ['ticker','tipo','quantidade','precoMedio','investido','precoAtual'];
  const lines = [headers.join(';')].concat(
    carteira.map(p => [p.ticker,p.tipo,p.quantidade,p.precoMedio,p.investido,p.precoAtual].join(';'))
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

  carteira = lines.map(l => {
    const [ticker,tipo,qt,pm,inv,pa] = l.split(';');
    return {
      id: crypto.randomUUID(),
      ticker: ticker.toUpperCase(),
      tipo,
      quantidade: Number(qt),
      precoMedio: round2(parseFloat(pm)),
      investido: round2(parseFloat(inv)),
      precoAtual: round2(parseFloat(pa||'0'))
    };
  });
  save(CARTEIRA_KEY, carteira);
  render();
}

document.getElementById('exportarCsv').addEventListener('click', downloadCsv);
document.getElementById('importCsv').addEventListener('change', (e) => {
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = () => importCsv(reader.result);
  reader.readAsText(f, 'utf-8');
  e.target.value = '';
});

// ===== Inicialização =====
render();
