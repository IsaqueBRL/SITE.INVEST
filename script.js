// script.js (APENAS O BLOCO DE SALVAMENTO DA TABELA ESTÁ MOSTRADO,
// mas substitua o bloco C completo no seu arquivo script.js)

// ... (Restante do código anterior) ...

// =========================================================================
// C. SALVAMENTO DA TABELA NO FIREBASE (CORRIGIDO)
// =========================================================================

/**
 * Função utilitária para limpar a string, removendo caracteres inválidos para chaves do Firebase.
 * Troca espaços por underscore e remove caracteres especiais.
 * @param {string} str - O nome do cabeçalho original.
 * @returns {string} - A chave limpa.
 */
function sanitizeKey(str) {
    // 1. Remove caracteres inválidos (., #, $, /, [, ])
    // 2. Substitui espaços por underscores
    // 3. Remove quaisquer outros caracteres não alfanuméricos ou underscore (como parênteses)
    return str
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_') // Substitui não-alfanuméricos (exceto _) por underscore
        .replace(/_+/g, '_')         // Remove underscores duplicados
        .replace(/^_|_$/g, '');      // Remove underscores do início e fim
}


document.getElementById('save-table').addEventListener('click', () => {
    if (!db) {
        alert("Erro: O Firebase não foi inicializado corretamente. Verifique o console.");
        return;
    }

    const tableData = [];
    const headers = [];
    const sanitizedHeaders = []; // Novo array para armazenar chaves limpas
    const rows = table.querySelectorAll('tbody tr');

    // 1. Coleta e LIMPA os cabeçalhos (THs)
    headerRow.querySelectorAll('th').forEach(th => {
        if (th.textContent !== 'Ações') {
            const originalHeader = th.textContent.trim();
            const sanitized = sanitizeKey(originalHeader);
            
            headers.push(originalHeader);
            sanitizedHeaders.push(sanitized); // Armazena a chave limpa
        }
    });

    // 2. Coleta os dados de cada linha, usando as chaves limpas
    rows.forEach(row => {
        const rowData = {};
        const cells = row.querySelectorAll('td');

        cells.forEach((cell, index) => {
            // Verifica se a célula corresponde a um cabeçalho que não é 'Ações'
            if (index < sanitizedHeaders.length) {
                const sanitizedKey = sanitizedHeaders[index]; // Usa a chave limpa
                rowData[sanitizedKey] = cell.textContent.trim();
            }
        });
        tableData.push(rowData);
    });

    // 3. Estrutura e envia para o Firebase
    const dataToSave = {
        data_salvamento: new Date().toISOString(),
        tabela_investimentos: tableData
    };

    const tableRef = db.ref('tabelas_personalizadas');
    tableRef.push(dataToSave)
        .then(() => {
            alert("Tabela de investimentos salva com sucesso!");
        })
        .catch((error) => {
            console.error("Erro ao salvar a tabela:", error);
            alert("Erro ao salvar a tabela. Verifique o console.");
        });
});
