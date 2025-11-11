// === CONFIGURAÇÃO DA PLANILHA ===
// Esta é a planilha pública que você me mandou
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTfkBlTB6KfNQOtVCRwwQJSCVD36B2d709rJ8p-HhALp6Uc725L2-OjZxnJpz-C5KAA-G7pgNWYYcl1/pub?gid=0&single=true&output=csv";

// === FUNÇÃO PARA BUSCAR E EXIBIR OS DADOS ===
async function carregarPlanilha() {
  const loading = document.getElementById("loading");
  const tabela = document.getElementById("tabela");
  const thead = document.getElementById("tabela-head");
  const tbody = document.getElementById("tabela-body");

  try {
    const response = await fetch(sheetURL);
    const data = await response.text();

    // Converter CSV para linhas
    const linhas = data.trim().split("\n").map(l => l.split(","));

    // Cabeçalhos
    const headers = linhas[0];
    const rows = linhas.slice(1);

    // Montar cabeçalho
    thead.innerHTML = "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>";

    // Montar corpo da tabela
    tbody.innerHTML = rows.map(r => 
      "<tr>" + r.map(c => `<td>${c}</td>`).join("") + "</tr>"
    ).join("");

    // Mostrar tabela
    loading.style.display = "none";
    tabela.style.display = "table";
  } 
  catch (error) {
    loading.innerHTML = "❌ Erro ao carregar planilha.";
    console.error("Erro:", error);
  }
}

// === CHAMAR FUNÇÃO ===
carregarPlanilha();
