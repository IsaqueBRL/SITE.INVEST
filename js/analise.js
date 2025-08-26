document.addEventListener('DOMContentLoaded', () => {
    const categoriaSelect = document.getElementById('categoria-select');
    const tableBody = document.getElementById('analysisTableBody');
    const patrimonioSpan = document.getElementById('categoriaPatrimonio');
    const verbaSpan = document.getElementById('categoriaVerba');

    const fileMap = {
        'FIIs': 'PLANO DE APORTES GERAL .xlsx - FIIs POR SEGMENTO.csv',
        'AÇÕES': 'PLANO DE APORTES GERAL .xlsx - AÇÕES POR SEGMENTO.csv',
        'FIAGRO': 'PLANO DE APORTES GERAL .xlsx - FIAGROS.csv',
        'REITS': 'PLANO DE APORTES GERAL .xlsx - REITS POR SEGMENTO.csv',
        'STOKS': 'PLANO DE APORTES GERAL .xlsx - STOKS POR SETOR.csv',
        'ETF Exterior': 'PLANO DE APORTES GERAL .xlsx - ETF EXTERIOR.csv',
        'ETF BRASIL': 'PLANO DE APORTES GERAL .xlsx - ETF BRASIL.csv'
    };

    function loadData(categoria) {
        const filePath = fileMap[categoria];
        if (!filePath) {
            tableBody.innerHTML = '<tr><td colspan="4">Arquivo não encontrado para a categoria selecionada.</td></tr>';
            patrimonioSpan.textContent = 'R$ 0.00';
            verbaSpan.textContent = 'R$ 0.00';
            return;
        }

        fetch(filePath)
            .then(response => response.text())
            .then(csvText => {
                const rows = csvText.trim().split('\n').map(row => row.split(','));
                tableBody.innerHTML = '';
                
                let patrimonioTotal = 0;
                let verbaTotal = 0;

                // Determine the correct row based on the category
                if (categoria === 'FIIs' || categoria === 'AÇÕES' || categoria === 'REITS' || categoria === 'STOKS') {
                    // Header is in the third row, data starts from the fourth. Totals are in the third row too.
                    patrimonioTotal = parseFloat(rows[2][12]);
                    verbaTotal = parseFloat(rows[2][13]);
                    const dataRows = rows.slice(3);
                    dataRows.forEach(row => {
                        const [ativo, segmento, , , , patrimonio, , , , , , porcentagem] = row;
                        if (ativo) {
                            const tr = document.createElement('tr');
                            const patrimonioFormatado = parseFloat(patrimonio).toFixed(2);
                            const porcentagemFormatada = (parseFloat(porcentagem) * 100).toFixed(2);
                            tr.innerHTML = `
                                <td>${ativo}</td>
                                <td>${segmento}</td>
                                <td>R$ ${patrimonioFormatado}</td>
                                <td>${porcentagemFormatada}%</td>
                            `;
                            tableBody.appendChild(tr);
                        }
                    });
                } else if (categoria === 'FIAGRO') {
                    // Header is in the second row, data starts from the third. Totals are in the second row.
                    patrimonioTotal = parseFloat(rows[1][6]);
                    verbaTotal = parseFloat(rows[1][8]);
                    const dataRows = rows.slice(2);
                    dataRows.forEach(row => {
                        const [ativo, , , porcentagem, patrimonio] = row;
                        if (ativo) {
                            const tr = document.createElement('tr');
                            const patrimonioFormatado = parseFloat(patrimonio).toFixed(2);
                            const porcentagemFormatada = (parseFloat(porcentagem) * 100).toFixed(2);
                            tr.innerHTML = `
                                <td>${ativo}</td>
                                <td>N/A</td> 
                                <td>R$ ${patrimonioFormatado}</td>
                                <td>${porcentagemFormatada}%</td>
                            `;
                            tableBody.appendChild(tr);
                        }
                    });
                } else if (categoria === 'ETF Exterior' || categoria === 'ETF BRASIL') {
                    // Header is in the second row, data starts from the third. Totals are in the second row.
                    patrimonioTotal = parseFloat(rows[1][7]);
                    verbaTotal = parseFloat(rows[1][8]);
                    const dataRows = rows.slice(2);
                    dataRows.forEach(row => {
                        const [ativo, , , , patrimonio, porcentagem] = row;
                        if (ativo) {
                            const tr = document.createElement('tr');
                            const patrimonioFormatado = parseFloat(patrimonio).toFixed(2);
                            const porcentagemFormatada = (parseFloat(porcentagem) * 100).toFixed(2);
                            tr.innerHTML = `
                                <td>${ativo}</td>
                                <td>N/A</td> 
                                <td>R$ ${patrimonioFormatado}</td>
                                <td>${porcentagemFormatada}%</td>
                            `;
                            tableBody.appendChild(tr);
                        }
                    });
                }
                
                patrimonioSpan.textContent = `R$ ${patrimonioTotal.toFixed(2)}`;
                verbaSpan.textContent = `R$ ${verbaTotal.toFixed(2)}`;
            })
            .catch(error => {
                console.error(`Erro ao carregar dados para ${categoria}:`, error);
                tableBody.innerHTML = '<tr><td colspan="4">Erro ao carregar os dados.</td></tr>';
                patrimonioSpan.textContent = 'R$ 0.00';
                verbaSpan.textContent = 'R$ 0.00';
            });
    }

    categoriaSelect.addEventListener('change', (event) => {
        loadData(event.target.value);
    });

    // Load initial data
    loadData(categoriaSelect.value);
});