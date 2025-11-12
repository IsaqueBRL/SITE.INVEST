// script.js

// Constantes para elementos do DOM
const tabelaDados = document.getElementById('tabelaDados');
const tabelaBody = tabelaDados.querySelector('tbody');
const tabelaHeadRow = tabelaDados.querySelector('thead tr');
const btnAdicionar = document.getElementById('btnAdicionarLinha');
const btnSalvar = document.getElementById('btnSalvarTudo');
const btnToggleEdicao = document.getElementById('btnToggleEdicao');

// Variáveis de estado
let modoEdicaoAtivo = false;
let colunaArrastada = null;

// --- Event Listeners Iniciais ---
btnAdicionar.addEventListener('click', adicionarLinha);
btnSalvar.addEventListener('click', salvarDados);
btnToggleEdicao.addEventListener('click', toggleModoEdicao);

// Anexa os listeners de Drag and Drop a todos os cabeçalhos (TH)
tabelaHeadRow.querySelectorAll('th').forEach(th => {
    th.addEventListener('dragstart', handleDragStart);
    th.addEventListener('dragover', handleDragOver);
    th.addEventListener('dragleave', handleDragLeave);
    th.addEventListener('drop', handleDrop);
    th.addEventListener('dragend', handleDragEnd);
});


// --- Funções de Edição e Movimentação ---

function toggleModoEdicao() {
    modoEdicaoAtivo = !modoEdicaoAtivo; // Inverte o estado
    
    btnToggleEdicao.textContent = modoEdicaoAtivo ? '✅ Desativar Edição' : '⚙️ Ativar Edição da Tabela';
    
    const ths = tabelaHeadRow.querySelectorAll('th');
    ths.forEach(th => {
        // Habilita/Desabilita a edição e o drag and drop
        th.contentEditable = modoEdicaoAtivo; 
        th.draggable = modoEdicaoAtivo; 
        th.classList.toggle('draggable', modoEdicaoAtivo);

        // Desativa a edição de texto na célula "Ação"
        if (th.textContent.trim() === 'Ação') {
             th.contentEditable = false;
        }
    });

    alert(modoEdicaoAtivo ? 'Modo de Edição ATIVADO. Edite os títulos ou arraste as colunas.' : 'Modo de Edição DESATIVADO.');
}

function reordenarColuna(indexOrigem, indexDestino) {
    const todasAsLinhas = tabelaDados.querySelectorAll('tr');

    todasAsLinhas.forEach(linha => {
        const celulas = Array.from(linha.children);
        
        if (celulas[indexOrigem]) {
            const celulaMovida = celulas[indexOrigem];
            
            // Lógica para inserir antes ou depois do alvo
            if (indexOrigem > indexDestino) {
                // Mover para a esquerda: insere antes da célula alvo
                linha.insertBefore(celulaMovida, celulas[indexDestino]);
            } else {
                // Mover para a direita: insere antes do próximo elemento
                linha.insertBefore(celulaMovida, celulas[indexDestino].nextSibling);
            }
        }
    });
}

// --- Handlers de Drag and Drop ---

function handleDragStart(e) {
    if (!modoEdicaoAtivo) return;
    colunaArrastada = this;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    if (!modoEdicaoAtivo || this === colunaArrastada) return;
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
}

function handleDragLeave() {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (!modoEdicaoAtivo || this === colunaArrastada) return;
    e.stopPropagation();
    this.classList.remove('drag-over');

    const colunasHead = Array.from(tabelaHeadRow.children);
    const indexArrastado = colunasHead.indexOf(colunaArrastada);
    const indexAlvo = colunasHead.indexOf(this);
    
    if (indexArrastado !== indexAlvo) {
        reordenarColuna(indexArrastado, indexAlvo);
    }
}

function handleDragEnd() {
    if (colunaArrastada) {
        colunaArrastada.classList.remove('dragging');
        colunaArrastada = null;
    }
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// --- Funções de Adicionar e Salvar ---

function adicionarLinha() {
    const novaLinha = tabelaBody.insertRow();
    
    // As células são inseridas na ordem padrão (o JS as moverá se necessário)
    let celulaNome = novaLinha.insertCell(0);
    celulaNome.innerHTML = '<input type="text" class="input-nome" placeholder="Digite o nome">';

    let celulaValor = novaLinha.insertCell(1);
    celulaValor.innerHTML = '<input type="number" class="input-valor" value="0">';
    
    let celulaAcao = novaLinha.insertCell(2);
    celulaAcao.innerHTML = '<button onclick="removerLinha(this)">Remover</button>';
}

function removerLinha(botao) {
    botao.closest('tr').remove();
}

function salvarDados() {
    const linhas = tabelaBody.querySelectorAll('tr');
    let dadosParaEnviar = [];
    
    // 1. Coletar os dados (usando classes para serem resistentes à movimentação de colunas)
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

    // 2. Enviar os dados para o script PHP
    // ATENÇÃO: Se o erro 405 persistir, mude esta URL para o seu servidor PHP!
    fetch('salvar.php', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosParaEnviar),
    })
    .then(response => {
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
        alert('Falha ao tentar conectar com o servidor. (Erro de rede ou permissão, verifique se o salvar.php está no ar)');
    });
}
