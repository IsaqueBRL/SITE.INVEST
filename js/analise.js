// Importa as funções do Firebase SDK
import { getDatabase, ref, onValue, remove, push, update, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// O SEU CÓDIGO INTEIRO VAI DENTRO DESTA FUNÇÃO
document.addEventListener('DOMContentLoaded', () => {

    // ===== Configuração do Firebase =====
    const firebaseConfig = {
        apiKey: "AIzaSyBNBf_DachNBO2RmGmfOPg3PEuig5cVRw",
        authDomain: "banco-de-dados---site-invest.firebaseapp.com",
        databaseURL: "https://banco-de-dados---site-invest-default-rtdb.firebaseio.com",
        projectId: "banco-de-dados---site-invest",
        storageBucket: "banco-de-dados---site-invest.firebasestorage.app",
        messagingSenderId: "581873866515",
        appId: "1:581873866515:web:f258fcecad958acf6aace6"
    };

    // Inicializa o Firebase e o Banco de Dados
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    // Referências para os nós do banco de dados
    const carteiraRef = ref(db, 'carteira');
    const setoresRef = ref(db, 'setores');
    const segmentosRef = ref(db, 'segmentos');
    const metasDeAporteRef = ref(db, 'metasDeAporte');

    // Variáveis de estado
    let carteira = {};
    let setores = {};
    let segmentos = {};
    let metasDeAporte = {};
    let currentCategoryForGerenciar = '';

    // Variáveis para as instâncias dos gráficos
    let setorChartInstance = null;
    let segmentoChartInstance = null;

    // ===== DOM Elements =====
    const categoryTitle = document.getElementById('categoryTitle');
    const totalPatrimonio = document.getElementById('totalPatrimonio');
    const tabelaAtivosCategoria = document.getElementById('tabelaAtivosCategoria');
    const openSetoresModalBtn = document.getElementById('openSetoresModalBtn');
    const modalSetores = document.getElementById('modalSetores');
    const closeSetoresModalBtn = document.getElementById('closeSetoresModalBtn');
    const formSetores = document.getElementById('formSetores');
    const setorInput = document.getElementById('setorInput');
    const segmentoInput = document.getElementById('segmentoInput');
    const setorList = document.getElementById('setorList');
    const segmentoList = document.getElementById('segmentoList');
    const gerenciarModalTitle = document.getElementById('gerenciarModalTitle');

    // Elementos da nova tabela
    const planoAporteHeader = document.getElementById('planoAporteHeader');
    const planoAporteContent = document.getElementById('planoAporteContent');
    const tabelaPlanoAporteBody = document.getElementById('tabelaPlanoAporteBody');

    // ===== Utilitários de Formatação =====
    const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
    function parseBRL(str) { return Number(String(str).replace(/\./g,'').replace(',', '.')) || 0; }
    function toBRL(n) { return fmtBRL.format(n || 0); }
    function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }

    // Chave da API para buscar a cotação
    const API_KEY = "jaAoNZhHBLxF7FAUh6QDVp";

    // Função para buscar preço atual da ação na API da Brapi
    async function buscarPreco(ticker) {
        const url = `https://brapi.dev/api/quote/${ticker}?token=${API_KEY}`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                console.error("Erro na resposta da API:", resp.statusText);
                return null;
            }
            const json = await resp.json();
            const price = json.results?.[0]?.regularMarketPrice;
            return typeof price === 'number' ? price : null;
        } catch (err) {
            console.error("Erro ao buscar preço para o ticker:", ticker, err);
            return null;
        }
    }

    // ===== Lógica Principal da Página =====

    // Obter a categoria da URL
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('categoria');

    // Preencher o título da página
    if (category) {
        categoryTitle.textContent = category;
        gerenciarModalTitle.textContent = `Gerenciar Setores/Segmentos para ${category}`;
        planoAporteHeader.textContent = `Plano de Aporte em ${category}`;
        currentCategoryForGerenciar = category;
    }

    // Lógica de show/hide para o Plano de Aporte
    if(planoAporteHeader) {
        planoAporteHeader.addEventListener('click', () => {
            planoAporteContent.classList.toggle('show');
            planoAporteHeader.classList.toggle('active');
        });
    }

    // Lógica para fechar o modal
    if(closeSetoresModalBtn) {
        closeSetoresModalBtn.addEventListener('click', () => modalSetores.close());
    }
    if(modalSetores) {
        modalSetores.addEventListener('click', e => {
            const dialogDimensions = modalSetores.getBoundingClientRect();
            if (e.clientX < dialogDimensions.left || e.clientX > dialogDimensions.right || e.clientY < dialogDimensions.top || e.clientY > dialogDimensions.bottom) {
                modalSetores.close();
            }
        });
    }

    // Lógica para salvar setor/segmento na categoria correta
    if(formSetores) {
        formSetores.addEventListener('submit', (e) => {
            e.preventDefault();
            const setor = setorInput.value.trim();
            const segmento = segmentoInput.value.trim();
            
            if (!setor && !segmento) return;
            if (!currentCategoryForGerenciar) {
                alert("Erro: Categoria não selecionada para gerenciar.");
                return;
            }

            const setoresDaCategoria = Object.values(setores[currentCategoryForGerenciar] || {});
            const segmentosDaCategoria = Object.values(segmentos[currentCategoryForGerenciar] || {});

            if (setor && !setoresDaCategoria.includes(setor)) {
                push(ref(db, `setores/${currentCategoryForGerenciar}`), setor);
            }
            if (segmento && !segmentosDaCategoria.includes(segmento)) {
                push(ref(db, `segmentos/${currentCategoryForGerenciar}`), segmento);
            }
            formSetores.reset();
        });
    }

    // Lógica de deleção de setor/segmento
    document.addEventListener('click', (e) => {
        if (