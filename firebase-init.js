// firebase-init.js

// REMOVIDOS OS IMPORTS - As funções agora são carregadas globalmente pelo CDN no index.html

// Sua configuração do Firebase
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

// Inicializa o Firebase usando a variável global 'firebase'
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();

// Inicializa o Realtime Database e o armazena em uma variável global para acesso em script.js
window.db = app.database();
