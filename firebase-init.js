// firebase-init.js

// Importa as funções necessárias do Firebase SDK
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, push } from "firebase/database"; 

// Sua configuração do Firebase (MANTENHA ESTA CHAVE PRIVADA EM AMBIENTES REAIS!)
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

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inicializa e exporta o Realtime Database e suas funções
export const db = getDatabase(app);
export { ref, push };
