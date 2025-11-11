// === IMPORTS DO FIREBASE ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === CONFIGURAÇÃO DO SEU FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyCaVDJ4LtJu-dlvSi4QrDygfhx1hBGSdDM",
  authDomain: "banco-de-dados-invest.firebaseapp.com",
  projectId: "banco-de-dados-invest",
  storageBucket: "banco-de-dados-invest.firebasestorage.app",
  messagingSenderId: "5603892998",
  appId: "1:5603892998:web:62c066943b123aaf050887",
  measurementId: "G-CGX76CLQ3E"
};

// === INICIALIZA FIREBASE ===
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === ELEMENTOS DA PÁGINA ===
const toggleBtn = document.getElementById('toggleBtn');
const saveBtn = document.getElementById('saveBtn');
const content = document.getElementById('content');
let editing = false;

// === FUNÇÃO: ATIVAR / DESATIVAR EDIÇÃO ===
toggleBtn.addEventListener('click', () => {
  editing = !editing;
  content.contentEditable = editing ? "true" : "false";
  toggleBtn.textContent = editing ? "Sair da edição" : "Entrar em edição";
  if (editing) content.focus();
});

// === FUNÇÃO: CARREGAR CONTEÚDO SALVO DO FIREBASE ===
async function loadContent() {
  try {
    const ref = doc(db, "paginas", "principal");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      content.innerHTML = snap.data().html;
      console.log("Conteúdo carregado do Firebase ✅");
    } else {
      console.log("Nenhum conteúdo salvo ainda.");
    }
  } catch (e) {
    console.error("Erro ao carregar:", e);
  }
}

// === FUNÇÃO: SALVAR CONTEÚDO NO FIREBASE ===
async function saveContent() {
  try {
    const html = content.innerHTML;
    await setDoc(doc(db, "paginas", "principal"), { html });
    alert("Conteúdo salvo com sucesso 🔥");
  } catch (e) {
    console.error("Erro ao salvar:", e);
    alert("Erro ao salvar no banco!");
  }
}

saveBtn.addEventListener('click', saveContent);

// === CARREGAR CONTEÚDO AUTOMATICAMENTE AO INICIAR ===
loadContent();

