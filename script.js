// Constantes para elementos do DOM
const tabelaBody = document.querySelector('#tabelaDados tbody');
const btnAdicionar = document.getElementById('btnAdicionarLinha');
const btnSalvar = document.getElementById('btnSalvarTudo');

// Adiciona os event listeners
btnAdicionar.addEventListener('click', adicionarLinha);
btnSalvar.addEventListener('click', salvarDados);

function adicionarLinha() {
    const novaLinha = tabelaBody.insertRow();
    
    // Célula 1: Nome (Input)
    let celulaNome = novaLinha.insertCell(0);
    celulaNome.innerHTML = '<input type="text" class="input-nome" placeholder="Digite o nome">';

    // Célula 2: Valor (Input)
    let celulaValor = novaLinha.insertCell(1);
    celulaValor.innerHTML = '<input type="number" class="input-valor" value="0">';
    
    // Célula 3: Ação (Botão de remover)
    let celulaAcao = novaLinha.insertCell(2);
    celulaAcao.innerHTML = '<button onclick="removerLinha(this)">Remover</button>';
}

function removerLinha(botao) {
    // Acessa o elemento pai da célula (TD) e depois o elemento pai da linha (TR) para removê-la
    botao.closest('tr').remove();
}

function salvarDados() {
    const linhas = tabelaBody.querySelectorAll('tr');
    let dadosParaEnviar = [];
    
    // 1. Coletar os dados mais recentes da tabela
    linhas.forEach(linha => {
        const inputNome = linha.querySelector('.input-nome');
        const inputValor = linha.querySelector('.input-valor');
        
        if (inputNome && inputValor && inputNome.value.trim() !== '') {
            dadosParaEnviar.push({
                nome: inputNome.value.trim(),
                valor: parseFloat(inputValor.value) || 0
            });
        }
    });

    if (dadosParaEnviar.length === 0) {
        alert('Nenhuma linha válida para salvar.');
        return;
    }

    // 2. Enviar os dados para o script PHP (ou outro backend)
    // O endpoint 'salvar.php' precisa existir no seu servidor!
    fetch('salvar.php', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosParaEnviar),
    })
    .then(response => {
        // Verifica se a resposta HTTP é OK (status 200-299)
        if (!response.ok) {
            throw new Error('Erro na rede ou no servidor. Status: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            alert('Dados salvos com sucesso!');
        } else {
            alert('Erro ao salvar no servidor: ' + data.message);
        }
    })
    .catch((error) => {
        console.error('Erro de requisição:', error);
        alert('Falha ao tentar conectar com o servidor. Verifique o console.');
    });
}
