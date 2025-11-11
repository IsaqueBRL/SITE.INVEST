// === Importações Firebase ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === Configuração do seu projeto Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyCaVDJ4LtJu-dlvSi4QrDygfhx1hBGSdDM",
  authDomain: "banco-de-dados-invest.firebaseapp.com",
  projectId: "banco-de-dados-invest",
  storageBucket: "banco-de-dados-invest.firebasestorage.app",
  messagingSenderId: "5603892998",
  appId: "1:5603892998:web:62c066943b123aaf050887",
  measurementId: "G-CGX76CLQ3E"
};

// === Inicializa Firebase e Firestore ===
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === Seleciona elementos da página ===
const toggleBtn = document.getElementById('toggleBtn');
const saveBtn = document.getElementById('saveBtn');
const content = document.getElementById('content');

let editing = false;

// === Função para ativar/desativar edição ===
toggleBtn.addEventListener('click', () => {
  editing = !editing;
  content.contentEditable = editing ? "true" : "false";
  toggleBtn.textContent = editing ? "Sair da edição" : "Entrar em edição";
  if (editing) content.focus();
});

// === Função para carregar o conteúdo do Firebase ===
async function loadContent() {
  try {
    const ref = doc(db, "paginas", "principal");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      content.innerHTML = snap.data().html;
      console.log("✅ Conteúdo carregado do Firebase!");
    } else {
      console.log("⚠️ Nenhum conteúdo salvo ainda.");
    }
  } catch (error) {
    console.error("Erro ao carregar:", error);
  }
}

// === Função para salvar o conteúdo no Firebase ===
async function saveContent() {
  try {
    const html = content.innerHTML;
    await setDoc(doc(db, "paginas", "principal"), { html });
    alert("✅ Conteúdo salvo com sucesso no Firebase!");
  } catch (error) {
    console.error("Erro ao salvar:", error);
    alert("❌ Erro ao salvar no banco de dados.");
  }
}

// === Eventos ===
saveBtn.addEventListener('click', saveContent);

// === Carrega conteúdo automaticamente ao abrir ===
loadContent();
