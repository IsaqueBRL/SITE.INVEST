let activeTab = 'all';
// ===== Utilidades de número e moeda (pt-BR) =====
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
function parseBRL(str) {
  if (str == null || str === '') return 0;
  // aceita 10,50 ou 10.50
  return Number(String(str).replace(/\./g,'').replace(',', '.')) || 0;
}
function toBRL(n) { return fmtBRL.format(n || 0); }
function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }

const API_KEY = "jaAoNZHhBLxF7FAUh6QDVp";

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

// ===== Estado / Storage =====
const STORAGE_KEY = 'carteira_b3_v1';
let carteira = load(); // array de posições
// posição: { id, ticker, tipo, quantidade, precoMedio, investido, precoAtual }

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(carteira)); }
function load(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e){ return []; } }

// ===== DOM =====
const form = document.getElementById('formAtivo');
const tickerInput = document.getElementById('ticker');
const precoInput = document.getElementById('preco');
const corpo = document.getElementById('corpoTabela');
const sumInvestido = document.getElementById('sumInvestido');
const sumAtual = document.getElementById('sumAtual');
const sumResultado = document.getElementById('sumResultado');

document.getElementById('limpar').addEventListener('click', () => form.reset());
document.getElementById('apagarTudo').addEventListener('click', () => {
  if(confirm('Tem certeza que deseja apagar toda a carteira?')){
    carteira = []; save(); render();
  }
});

// Evento para buscar o preço quando o usuário digita o ticker
tickerInput.addEventListener('change', async () => {
  const ticker = tickerInput.value.trim().toUpperCase();
  if (ticker) {
    const preco = await buscarPreco(ticker);
    if (preco) {
      // Formata o preço com vírgula para o campo de input
      precoInput.value = preco.toFixed(2).replace('.', ',');
    } else {
      precoInput.value = ''; // Limpa o campo se não encontrar o preço
    }
  }
});

// ===== Adicionar ativo =====
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
    // recalcula preço médio com novo lote
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
  save();
  form.reset();
  render();
});

// Função para buscar os preços de todos os ativos da carteira
async function buscarPrecosDaCarteira() {
  const promises = carteira.map(async pos => {
    const precoAtual = await buscarPreco(pos.ticker);
    pos.precoAtual = precoAtual || 0;
  });
  await Promise.all(promises);
  save();
}

// ===== Render =====
async function render(){
  await buscarPrecosDaCarteira(); // Atualiza os preços antes de renderizar
  
  corpo.innerHTML = '';
  let totalInv = 0, totalAtual = 0;

  carteira.forEach(pos => {
    const valorAtual = round2((pos.precoAtual || 0) * pos.quantidade);
    const resultado = round2(valorAtual - pos.investido);
    const perc = pos.investido ? ((resultado / pos.investido) * 100) : 0;
    totalInv += pos.investido;
    totalAtual += valorAtual;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="nowrap"><strong>${pos.ticker}</strong></td>
      <td><span class="pill">${pos.tipo}</span></td>
      <td class="right">${fmtNum.format(pos.quantidade)}</td>
      <td class="right">${toBRL(pos.precoMedio)}</td>
      <td class="right">${toBRL(pos.investido)}</td>
      <td class="right editable" data-id="${pos.id}">${pos.precoAtual ? toBRL(pos.precoAtual) : '<span class="muted">—</span>'}</td>
      <td class="right">${valorAtual ? toBRL(valorAtual) : '<span class="muted">—</span>'}</td>
      <td class="right ${resultado>=0?'green':'red'}">${resultado ? toBRL(resultado) : toBRL(0)}</td>
      <td class="right ${resultado>=0?'green':'red'}">${perc.toFixed(2)}%</td>
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

  hookEvents();
}

function hookEvents(){
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Excluir
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      if(!confirm('Excluir esta posição?')) return;
      carteira = carteira.filter(p => p.id !== btn.dataset.del);
      save(); render();
    });
  });

  // Duplo clique para editar Preço Atual
  document.querySelectorAll('td.editable').forEach(td => {
    td.addEventListener('dblclick', () => makeEditable(td));
  });
}

function makeEditable(td){
  const id = td.dataset.id;
  const pos = carteira.find(p => p.id === id);
  if(!pos) return;
  const old = pos.precoAtual ? pos.precoAtual.toString().replace('.', ',') : '';

  td.innerHTML = `<input id="_edit" style="width:110px; background:#0b1020; color:var(--text); padding:6px 8px; border-radius:8px; border:1px solid rgba(255,255,255,.2)" placeholder="0,00" value="${old}">`;
  const input = td.querySelector('#_edit');
  input.focus();

  function commit(){
    const v = parseBRL(input.value);
    pos.precoAtual = round2(v);
    save(); render();
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
  save(); render();
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
