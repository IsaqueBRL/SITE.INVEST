document.addEventListener('DOMContentLoaded', () => {
    const tabelaBody = document.getElementById('tabela-categorias-body');
    const adicionarBtn = document.getElementById('adicionar-categoria-btn');

    // Dados de exemplo para começar
    let categorias = [
        { nome: 'AÇÕES', meta: 50, atual: 50, patrimonio: 1000, aportar: 0 },
        { nome: 'FIIS', meta: 20, atual: 20, patrimonio: 400, aportar: 0 },
        { nome: 'RENDA FIXA', meta: 30, atual: 30, patrimonio: 600, aportar: 0 }
    ];

    function renderizarTabela() {
        tabelaBody.innerHTML = '';
        const totalPatrimonio = categorias.reduce((sum, cat) => sum + cat.patrimonio, 0);

        categorias.forEach((categoria, index) => {
            const row = document.createElement('tr');
            
            // Calculo da participação atual e aporte
            const participacaoAtual = totalPatrimonio > 0 ? (categoria.patrimonio / totalPatrimonio) * 100 : 0;
            const aporteNecessario = totalPatrimonio > 0 ? (totalPatrimonio * (categoria.meta / 100)) - categoria.patrimonio : 0;

            row.innerHTML = `
                <td>${categoria.nome}</td>
                <td>${categoria.meta}%</td>
                <td>${participacaoAtual.toFixed(2)}%</td>
                <td>R$ ${categoria.patrimonio.toFixed(2)}</td>
                <td>R$ ${aporteNecessario.toFixed(2)}</td>
                <td>
                    <button class="remover-btn" data-index="${index}">Remover</button>
                </td>
            `;
            tabelaBody.appendChild(row);
        });
    }

    // Adiciona uma nova categoria à tabela
    adicionarBtn.addEventListener('click', () => {
        const novaCategoria = prompt("Digite o nome da nova categoria:");
        if (novaCategoria) {
            categorias.push({ nome: novaCategoria.toUpperCase(), meta: 0, atual: 0, patrimonio: 0, aportar: 0 });
            renderizarTabela();
        }
    });

    // Remove uma categoria da tabela
    tabelaBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('remover-btn')) {
            const index = e.target.dataset.index;
            categorias.splice(index, 1);
            renderizarTabela();
        }
    });

    // Renderiza a tabela inicial
    renderizarTabela();
});