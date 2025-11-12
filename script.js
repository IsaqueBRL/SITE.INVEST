import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Ativar logs para debug
setLogLevel('debug'); 

// ----------------------------------------------------
// 1. CONFIGURAÇÃO E AUTENTICAÇÃO DO FIREBASE
// ----------------------------------------------------

// Tenta carregar a configuração de ambiente, se disponível
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : null; 

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Inicializa o Firebase
let app = null;
let db = null;
let auth = null;

if (firebaseConfig) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Firebase inicializado com sucesso.");
    } catch (e) {
        console.error("Erro ao inicializar Firebase (configuração inválida):", e);
    }
} else {
    console.error("Configuração do Firebase não encontrada. O aplicativo não funcionará.");
}

let userId = null;
let dbReady = false;

// ----------------------------------------------------
// 2. ELEMENTOS DO DOM E VARIÁVEIS DE ESTADO
// ----------------------------------------------------

const tabelaDados = document.getElementById('tabelaDados');
const tabelaBody = document.getElementById('tabelaBody');
const tabelaHeadRow = tabelaDados.querySelector('thead tr');
const btnAdicionar = document.getElementById('btnAdicionarLinha');
const btnToggleEdicao = document.getElementById('btnToggleEdicao');
const btnStatus = document.getElementById('btnStatus'); 
const userIdDisplay = document.getElementById('userIdDisplay');

let modoEdicaoAtivo = false;
let colunaArrastada = null;


/**
 * Atualiza o status visual do botão indicador.
 * @param {string} text - O texto a ser exibido.
 * @param {string} color - A cor de fundo (em hexadecimal).
 */
function updateStatus(text, color) {
    btnStatus.textContent = text;
    btnStatus.style.backgroundColor = color;
    btnStatus.style.color = color === '#e9ecef' ? '#6c757d' : 'white';
    
    // Reset status após 3 segundos se for uma mensagem de sucesso
    if (color === '#28a745') { // Green for success
        setTimeout(() => {
            btnStatus.textContent = '💾 Salvando Automaticamente';
            btnStatus.style.backgroundColor = '#e9ecef';
            btnStatus.style.color = '#6c757d';
        }, 3000);
    }
}

// --- Início da Autenticação ---
async function initializeAuthAndDatabase() {
    if (!auth) {
        userIdDisplay.textContent = 'ERRO: Sem Configuração Firebase';
        updateStatus('❌ Configuração Inválida', '#dc3545'); 
        return;
    }

    try {
        if (typeof __initial_auth_token !== 'undefined') {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            // Tenta o login anônimo como fallback seguro
            await signInAnonymously(auth);
        }
    } catch (error) {
        // Se a autenticação falhar (e.g., auth/configuration-not-found)
        console.error("Erro na autenticação:", error);
        userIdDisplay.textContent = 'ERRO DE AUTH (Verifique o console)';
        updateStatus('❌ Falha na Autenticação', '#dc3545'); 
    }
}

if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userId = user.uid;
            userIdDisplay.textContent = userId;
            dbReady = true;
            
            // 1. Ativa listeners de UI
            btnAdicionar.addEventListener('click', adicionarLinha);
            btnToggleEdicao.addEventListener('click', toggleModoEdicao);
            
            // 2. Inicializa Drag and Drop nos cabeçalhos
            tabelaHeadRow.querySelectorAll('th').forEach(th => {
                th.addEventListener('dragstart', handleDragStart);
                th.addEventListener('dragover', handleDragOver);
                th.addEventListener('dragleave', handleDragLeave);
                th.addEventListener('drop', handleDrop);
                th.addEventListener('dragend', handleDragEnd);
            });

            // 3. Inicia a escuta em tempo real do Firestore
            setupRealtimeListener();

        } else if (!userIdDisplay.textContent.startsWith('ERRO')) {
            userIdDisplay.textContent = 'Não autenticado';
            dbReady = false;
        }
    });

    initializeAuthAndDatabase();
} else {
     userIdDisplay.textContent = 'ERRO: Sem Configuração Firebase';
}


// --- Firestore Helpers ---

// Define o caminho da coleção privada: /artifacts/{appId}/users/{userId}/dados_tabela
function getCollectionRef() {
    if (!dbReady || !userId || !db) {
        console.error("Firebase/Auth ou Firestore não pronto. userId:", userId);
        return null;
    }
    // Cria a referência para a coleção privada do usuário
    return collection(db, `artifacts/${appId}/users/${userId}/dados_tabela`);
}


function setupRealtimeListener() {
    const colRef = getCollectionRef();
    if (!colRef) return;

    // Antes de escutar, mostra que está conectando
    updateStatus('🔗 Conectando...', '#007bff'); 

    // Escuta as mudanças em tempo real
    onSnapshot(colRef, (snapshot) => {
        // Se a primeira conexão for bem sucedida, mostra que está ativo
        updateStatus('✅ Conectado', '#28a745'); // Success status on initial load/sync
        
        // Limpa a tabela
        tabelaBody.innerHTML = '';
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            data.id = doc.id; // Adiciona o ID do documento
            adicionarLinhaNaUI(data);
        });

        // Adiciona uma linha inicial se a tabela estiver vazia
        if (snapshot.empty) {
            console.log("Nenhum dado encontrado. Adicionando linha inicial.");
            adicionarLinha(); 
        }
    }, (error) => {
        console.error("Erro ao ouvir snapshot do Firestore:", error);
        updateStatus('❌ Erro de Conexão', '#dc3545'); // Error status
    });
}

// ----------------------------------------------------
// 3. FUNÇÕES CRUD (FIREBASE)
// ----------------------------------------------------

async function adicionarLinha() {
    // Adiciona uma nova linha com valores padrão no Firestore
    const colRef = getCollectionRef();
    if (!colRef) return;
    
    updateStatus('🔄 Salvando...', '#007bff'); // Saving indicator
    
    try {
        await addDoc(colRef, {
            nome: 'Novo Item',
            valor: 0,
            timestamp: Date.now() 
        });
        updateStatus('✅ Salvo!', '#28a745'); // Success
    } catch (e) {
        console.error("Erro ao adicionar documento:", e);
        updateStatus('❌ Erro ao Salvar', '#dc3545'); // Error
    }
}

async function atualizarCampo(element, id, campo) {
    if (!dbReady || !userId) return;

    // Converte para número se for o campo 'valor', senão pega o valor trimado
    const valor = campo === 'valor' ? parseFloat(element.value) : element.value.trim();

    updateStatus('🔄 Salvando...', '#007bff'); // Saving indicator

    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/dados_tabela`, id);
        await updateDoc(docRef, { [campo]: valor });
        
        // Feedback visual de salvamento na célula
        element.style.backgroundColor = '#d4edda'; 
        setTimeout(() => { element.style.backgroundColor = ''; }, 500);

        updateStatus('✅ Salvo!', '#28a745'); // Success
        
    } catch (e) {
        console.error("Erro ao atualizar documento:", e);
        updateStatus('❌ Erro ao Salvar', '#dc3545'); // Error
    }
}

// Funções de UI (chamadas pelo HTML globalmente)
window.removerLinha = async function(botao, id) {
    if (!dbReady || !userId) {
        console.warn("Banco de dados não está pronto para remover.");
        return;
    }
    
    updateStatus('🔄 Removendo...', '#007bff'); // Saving indicator

    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/dados_tabela`, id);
        await deleteDoc(docRef);
        updateStatus('✅ Removido e Salvo!', '#28a745'); // Success
    } catch (e) {
        console.error("Erro ao remover documento:", e);
        updateStatus('❌ Erro ao Remover', '#dc3545'); // Error
    }
}

// ----------------------------------------------------
// 4. FUNÇÕES DA TABELA (UI e Drag/Drop)
// ----------------------------------------------------

function adicionarLinhaNaUI(data) {
    const novaLinha = tabelaBody.insertRow();
    novaLinha.setAttribute('data-doc-id', data.id); // ID do documento Firestore

    // 1. Célula Nome (Salva ao perder o foco - onblur)
    let celulaNome = novaLinha.insertCell();
    celulaNome.innerHTML = `
        <input 
            type="text" 
            class="input-nome" 
            value="${data.nome || ''}"
            onblur="atualizarCampo(this, '${data.id}', 'nome')"
        >`;

    // 2. Célula Valor (Salva ao valor mudar - onchange)
    let celulaValor = novaLinha.insertCell();
    celulaValor.innerHTML = `
        <input 
            type="number" 
            class="input-valor" 
            value="${data.valor || 0}"
            onchange="atualizarCampo(this, '${data.id}', 'valor')"
        >`;
    
    // 3. Célula Ação (Botão de Remover)
    let celulaAcao = novaLinha.insertCell();
    celulaAcao.innerHTML = `<button onclick="removerLinha(this, '${data.id}')">Remover</button>`;
}


// --- Funções de Edição (Drag and Drop) ---

function toggleModoEdicao() {
    modoEdicaoAtivo = !modoEdicaoAtivo;
    
    btnToggleEdicao.textContent = modoEdicaoAtivo ? '✅ Desativar Edição' : '⚙️ Ativar Edição da Tabela';
    
    const ths = tabelaHeadRow.querySelectorAll('th');
    ths.forEach(th => {
        th.contentEditable = modoEdicaoAtivo; 
        th.draggable = modoEdicaoAtivo; 
        th.classList.toggle('draggable', modoEdicaoAtivo);

        // Garante que a coluna Ação não seja editável
        if (th.textContent.trim() === 'Ação') {
             th.contentEditable = false;
        }
    });

    console.log(modoEdicaoAtivo ? 'Modo de Edição ATIVADO.' : 'Modo de Edição DESATIVADO.');
}

function reordenarColuna(indexOrigem, indexDestino) {
    const todasAsLinhas = tabelaDados.querySelectorAll('tr');

    todasAsLinhas.forEach(linha => {
        const celulas = Array.from(linha.children);
        
        if (celulas[indexOrigem]) {
            const celulaMovida = celulas[indexOrigem];
            
            // Lógica para mover a célula (cabeçalho ou dados)
            if (indexOrigem > indexDestino) {
                linha.insertBefore(celulaMovida, celulas[indexDestino]);
            } else {
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

// Expõe a função de atualização para ser usada no HTML
window.atualizarCampo = atualizarCampo;
