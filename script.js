// === Importações Firebase ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// === Configuração do seu Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyCaVDJ4LtJu-dlvSi4QrDygfhx1hBGSdDM",
  authDomain: "banco-de-dados-invest.firebaseapp.com",
  databaseURL: "https://banco-de-dados-invest-default-rtdb.firebaseio.com",
  projectId: "banco-de-dados-invest",
  storageBucket: "banco-de-dados-invest.firebasestorage.app",
  messagingSenderId: "5603892998",
  appId: "1:5603892998:web:459556f888d31629050887",
  measurementId: "G-JJWKMYXHTH"
};

// === Inicializa Firebase ===
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// === Seleciona elementos da página ===
const toggleBtn = document.getElementById("toggleBtn");
const saveBtn = document.getElementById("saveBtn");
const content = document.getElementById("content");

let editing = false;

// === Alterna entre modo de edição e leitura ===
toggleBtn.addEventListener("click", () => {
  editing = !editing;
  content.contentEditable = editing ? "true" : "false";
  toggleBtn.textContent = editing ? "Sair da edição" : "Entrar em edição";
  if (editing) content.focus(
