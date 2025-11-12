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

// Configuração de Firebase (usando valores do ambiente ou fallback)
const firebaseConfigFallback = {
    apiKey: "AIzaSyCaVDJ4LtJu-dlvSi4QrDygfhx1hBGSdDM",
    authDomain: "banco-de-dados-invest.firebaseapp.com",
    databaseURL: "https://banco-de-dados-invest-default-rtdb.firebaseio.com",
    projectId: "banco-de-dados-invest",
    storageBucket: "banco-de-dados-invest.firebasestorage.app",
    messagingSenderId: "5603892998",
    appId: "1:5603892998:web:459556f888d31629050887",
};

const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : firebaseConfigFallback;

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
const userIdDisplay = document.getElementById('userIdDisplay');

let modoEdicaoAtivo = false;
let colunaArrastada = null;

// --- Início da Autenticação ---
async function initializeAuthAndDatabase() {
    try {
        if (typeof __initial_auth_token !== 'undefined') {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Erro na autenticação:", error);
    }
}

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

    } else {
        userIdDisplay.textContent = 'Não autenticado';
        dbReady = false;
    }
});

initializeAuthAndDatabase();

// --- Firestore Helpers ---

// Define o caminho da coleção privada: /artifacts/{appId}/users/{userId}/dados_tabela
function getCollectionRef() {
    if (!dbReady || !userId) {
        console.error("Firebase/Auth não pronto. userId:", userId);
        return null;
    }
    // Cria a referência para a coleção privada do usuário
    return collection(db, `artifacts/${appId}/users/${userId}/dados_tabela`);
}

function setupRealtimeListener() {
    const colRef = getCollectionRef();
    if (!colRef) return;

    // Escuta as mudanças em tempo real
    onSnapshot(colRef, (snapshot) => {
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
    });
}

// ----------------------------------------------------
// 3. FUNÇÕES CRUD (FIREBASE)
// ----------------------------------------------------

async function adicionarLinha() {
    // Adiciona uma nova linha com valores padrão no Firestore
    const colRef = getCollectionRef();
    if (!colRef) return;
    
    try {
        await addDoc(colRef, {
            nome: 'Novo Item',
            valor: 0,
            timestamp: Date.now() // Pode ser usado para ordenação
        });
        // A UI é atualizada pelo onSnapshot, então não faz nada aqui
    } catch (e) {
        console.error("Erro ao adicionar documento:", e);
        // Não usar alert(), usar console.error ou modal customizado
    }
}

async function atualizarCampo(element, id, campo) {
    if (!dbReady || !userId) return;

    // Converte para número se for o campo 'valor'
    const valor = campo === 'valor' ? parseFloat(element.value) : element.value.trim();

    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/dados_tabela`, id);
        await updateDoc(docRef, { [campo]: valor });
        
        // Feedback visual de salvamento
        element.style.backgroundColor = '#d4edda'; 
        setTimeout(() => { element.style.backgroundColor = ''; }, 500);
        
    } catch (e) {
        console.error("Erro ao atualizar documento:", e);
    }
}

// Funções de UI (chamadas pelo HTML globalmente)
window.removerLinha = async function(botao, id) {
    if (!dbReady || !userId) {
        console.warn("Banco de dados não está pronto para remover.");
        return;
    }

    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/dados_tabela`, id);
        await deleteDoc(docRef);
        // A UI será atualizada automaticamente
    } catch (e) {
        console.error("Erro ao remover documento:", e);
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
