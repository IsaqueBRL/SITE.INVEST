// ID da planilha (pegue da URL da planilha)
const sheetId = "1d-yourSheetID-here"; // substitua pelo seu ID real
const sheetName = "Página1"; // ou o nome da aba que você quer puxar

const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

async function fetchSheet() {
  try {
    const resp = await fetch(url);
    const text = await resp.text();

    // A resposta vem como JSONP — precisamos limpar
    const json = JSON.parse(text.substr(text.indexOf("(") + 1).slice(0, -2));

    const cols = json.table.cols.map(c => c.label);
    const rows = json.table.rows;

    // Inserir cabeçalhos
    const headerRow = document.getElementById("header-row");
    headerRow.innerHTML = cols.map(h => `<th>${h}</th>`).join("");

    // Inserir linhas
    const bodyRows = document.getElementById("body-rows");
    bodyRows.innerHTML = rows.map(r => {
      const cells = r.c.map(c => c ? c.v : "");
      return `<tr>${cells.map(cell => `<td>${cell}</td>`).join("")}</tr>`;
    }).join("");

  } catch (error) {
    console.error("Erro ao buscar dados da planilha:", error);
  }
}

fetchSheet();
