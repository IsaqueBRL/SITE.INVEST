import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCaVDJ4LtJu-dlvSi4QrDygfhx1hBGSdDM",
  authDomain: "banco-de-dados-invest.firebaseapp.com",
  databaseURL: "https://banco-de-dados-invest-default-rtdb.firebaseio.com",
  projectId: "banco-de-dados-invest",
  storageBucket: "banco-de-dados-invest.appspot.com",
  messagingSenderId: "5603892998",
  appId: "1:5603892998:web:459556f888d31629050887",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const toggleBtn = document.getElementById("toggleBtn");
const saveBtn = document.getElementById("saveBtn");
const content = document.getElementById("content");

let editing = false;

// Alternar modo de edição
toggleBtn.addEventListener("click", () => {
  editing = !editing;
  content.contentEditable = editing ? "true" : "false";
  toggleBtn.textContent = editing ? "Sair da edição" : "Entrar em edição";
  if (editing) content.focus();
});

// Carregar conteúdo do banco
function loadContent() {
  const contentRef = ref(db, "paginas/principal");
  onValue(contentRef, (snapshot) => {
    const data = snapshot.val();
    console.log("📦 Dados retornados:", data);
    if (data && data.html) {
      content.innerHTML = data.html;
      console.log("✅ Conteúdo carregado do Firebase");
    } else {
      console.log("⚠️ Nenhum conteúdo salvo ainda (snapshot vazio)");
    }
  });
}

// Salvar conteúdo no banco
async function saveContent() {
  const html = content.innerHTML;
  console.log("💾 Tentando salvar conteúdo:", html);
  try {
    await set(ref(db, "paginas/principal"), { html });
    alert("✅ Conteúdo salvo com sucesso!");
  } catch (error) {
    console.error("❌
