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

// --- Event Listeners ---
btnAdicionar.addEventListener('click', adicionarLinha);
btnSalvar.addEventListener('click', salvarDados);
btnToggleEdicao.addEventListener('click', toggleModoEdicao);

// Inicializa os event listeners de Drag and Drop nos cabeçalhos existentes
// Eles só serão ativados se o modoEdicaoAtivo for true (ver toggleModoEdicao)
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
    
    // 1. Atualiza o texto do botão
    btnToggleEdicao.textContent = modoEdicaoAtivo ? '✅ Desativar Edição' : '⚙️ Ativar Edição da Tabela';
    
    // 2. Habilita/Desabilita a edição e o drag and drop
    const ths = tabelaHeadRow.querySelectorAll('th');
    ths.forEach(th => {
        th.contentEditable = modoEdicaoAtivo; // Habilita/Desabilita a edição de texto
        th.draggable = modoEdicaoAtivo; // Habilita/Desabilita o Drag and Drop
        th.classList.toggle('draggable', modoEdicaoAtivo); // Adiciona classe CSS

        // Desativa a edição de texto na célula "Ação" para evitar que o usuário estrague a funcionalidade
        if (th.textContent.trim() === 'Ação') {
             th.contentEditable = false;
        }
    });

    alert(modoEdicaoAtivo ? 'Modo de Edição ATIVADO. Edite os títulos ou arraste as colunas.' : 'Modo de Edição DESATIVADO.');
}

function reordenarColuna(indexOrigem, indexDestino) {
    // Reordena a coluna em TODAS as linhas (cabeçalho e corpo)
    const todasAsLinhas = tabelaDados.querySelectorAll('tr');

    todasAsLinhas.forEach(linha => {
        const celulas = Array.from(linha.children);
        
        if (celulas[indexOrigem]) {
            const celulaMovida = celulas[indexOrigem];
            
            // Move a célula usando insertBefore
            if (indexOrigem > indexDestino) {
                // Mover para a esquerda: insere antes da célula alvo
                linha.insertBefore(celulaMovida, celulas[indexDestino]);
            } else {
                // Mover para a direita: insere antes do próximo elemento (que efetivamente o move para depois do alvo)
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
    
    // Garante que não está movendo para a própria posição
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
    
    // As células são inseridas na ordem padrão (Nome, Valor, Ação)
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
    
    // 1. Coletar os dados mais recentes da tabela
    // IMPORTANTE: Aqui, os dados são coletados pela classe, não pela posição, 
    // para funcionar mesmo se as colunas forem movidas!
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
    fetch('salvar.php', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosParaEnviar),
    })
    .then(response => {
        if (!response.ok) {
            // Lança um erro se o status HTTP não for 2xx (por exemplo, 404, 500)
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
        alert('Falha ao tentar conectar com o servidor. Verifique o console. (Certifique-se que o salvar.php está no ar)');
    });
}
