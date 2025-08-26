document.addEventListener('DOMContentLoaded', () => {
    fetch('PLANO DE APORTES GERAL .xlsx - PAINEL GERAL.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro HTTP! status: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            const rows = csvText.trim().split('\n').map(row => row.split(','));
            const header = rows[0];
            const dataRows = rows.slice(1);

            const tableBody = document.getElementById('painelGeralTable');
            let totalPatrimonio = 0;
            let totalAportar = 0;

            dataRows.forEach(row => {
                const [regiao, categoria, meta, atual, patrimonio, aportar] = row;
                
                if (regiao && categoria) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${regiao}</td>
                        <td>${categoria}</td>
                        <td>${(parseFloat(meta) * 100).toFixed(2)}%</td>
                        <td>${(parseFloat(atual) * 100).toFixed(2)}%</td>
                        <td>R$ ${parseFloat(patrimonio).toFixed(2)}</td>
                        <td>R$ ${parseFloat(aportar).toFixed(2)}</td>
                    `;
                    tableBody.appendChild(tr);

                    if (!isNaN(parseFloat(patrimonio))) {
                        totalPatrimonio += parseFloat(patrimonio);
                    }
                    if (!isNaN(parseFloat(aportar))) {
                        totalAportar += parseFloat(aportar);
                    }
                }
            });

            document.getElementById('totalPatrimonio').textContent = `R$ ${totalPatrimonio.toFixed(2)}`;
            document.getElementById('totalAportar').textContent = `R$ ${totalAportar.toFixed(2)}`;
        })
        .catch(error => console.error('Erro ao carregar os dados do painel geral:', error));
});