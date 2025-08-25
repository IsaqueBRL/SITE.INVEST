// Importa as funções do Firebase SDK
import { getDatabase, ref, onValue, remove, push, update, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// O CÓDIGO INTEIRO AGORA ESTÁ DENTRO DESTE EVENTO
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
        if(categoryTitle) categoryTitle.textContent = category;
        if(gerenciarModalTitle) gerenciarModalTitle.textContent = `Gerenciar Setores/Segmentos para ${category}`;
        if(planoAporteHeader) planoAporteHeader.textContent = `Plano de Aporte em ${category}`;
        currentCategoryForGerenciar = category;
    }

    // Lógica de show/hide para o Plano de Aporte
    if(planoAporteHeader) {
        planoAporteHeader.addEventListener('click', () => {
            if(planoAporteContent) planoAporteContent.classList.toggle('show');
            planoAporteHeader.classList.toggle('active');
        });
    }

    // Lógica para fechar o modal
    if(closeSetoresModalBtn) {
        closeSetoresModalBtn.addEventListener('click', () => {
            if(modalSetores) modalSetores.close();
        });
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
        if (e.target.matches('[data-del-setor]')) {
            const setorKey = e.target.dataset.delSetor;
            const category = e.target.dataset.cat;
            if(confirm("Tem certeza que deseja excluir este setor?")) {
                remove(ref(db, `setores/${category}/${setorKey}`));
            }
        }
        
        if (e.target.matches('[data-del-segmento]')) {
            const segmentoKey = e.target.dataset.delSegmento;
            const category = e.target.dataset.cat;
            if(confirm("Tem certeza que deseja excluir este segmento?")) {
                remove(ref(db, `segmentos/${category}/${segmentoKey}`));
            }
        }

        if (e.target.matches('[data-del-ativo]')) {
            const ativoKey = e.target.dataset.delAtivo;
            if(confirm("Tem certeza que deseja excluir este ativo?")) {
                remove(ref(db, `carteira/${ativoKey}`));
            }
        }
        
        if (e.target.matches('#openSetoresModalBtn')) {
            currentCategoryForGerenciar = category;
            renderSetoresSegmentosList(currentCategoryForGerenciar);
            modalSetores.showModal();
        }
    });

    function makeEditableDropdown(td, ativoKey, type) {
        const currentVal = carteira[ativoKey]?.[type] || '';
        const category = carteira[ativoKey]?.tipo;
        const options = Object.values(type === 'setor' ? (setores[category] || {}) : (segmentos[category] || {}));

        const select = document.createElement('select');
        select.style.cssText = 'width: 100%; padding: 6px; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 8px;';
        
        let optionsHtml = `<option value="">Nenhum</option>`;
        options.forEach(optionVal => {
            optionsHtml += `<option value="${optionVal}" ${currentVal === optionVal ? 'selected' : ''}>${optionVal}</option>`;
        });
        select.innerHTML = optionsHtml;
        
        td.innerHTML = '';
        td.appendChild(select);
        select.focus();

        function updateAndRevert() {
            const newValue = select.value;
            if (newValue !== currentVal) {
                update(ref(db, `carteira/${ativoKey}`), { [type]: newValue });
            }
        }

        select.addEventListener('change', updateAndRevert);
        select.addEventListener('blur', updateAndRevert);
    }

    // Função para tornar a célula de "Meta" editável
    function makeEditableMetaCell(td, segmento) {
        const currentMeta = metasDeAporte[category]?.[segmento] || 0;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentMeta;
        input.placeholder = '0';
        input.min = '0';
        input.max = '100';
        
        td.innerHTML = '';
        td.appendChild(input);
        input.focus();
        
        function saveMeta() {
            const newMeta = parseFloat(input.value) || 0;
            if (newMeta !== currentMeta) {
                const updates = {};
                updates[`${category}/${segmento}`] = newMeta;
                update(metasDeAporteRef, updates);
            }
        }

        input.addEventListener('blur', saveMeta);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveMeta();
                input.blur();
            }
        });
    }

    // Lógica de duplo clique para a nova tabela
    document.addEventListener('dblclick', (e) => {
        if (e.target.closest('#tabelaPlanoAporteBody') && e.target.matches('td:nth-child(2)')) {
            const row = e.target.closest('tr');
            const segmento = row.dataset.segmento;
            makeEditableMetaCell(e.target, segmento);
        }
    });

    document.addEventListener('dblclick', (e) => {
        if (e.target.matches('[data-type="setor"]')) {
            const ativoKey = e.target.dataset.ativoKey;
            makeEditableDropdown(e.target, ativoKey, 'setor');
        }
        if (e.target.matches('[data-type="segmento"]')) {
            const ativoKey = e.target.dataset.ativoKey;
            makeEditableDropdown(e.target, ativoKey, 'segmento');
        }
    });

    function renderSetoresSegmentosList(category) {
        if(gerenciarModalTitle) gerenciarModalTitle.textContent = `Gerenciar Setores/Segmentos para ${category}`;

        if(setorList) setorList.innerHTML = '';
        const setoresDaCategoria = setores[category] || {};
        Object.entries(setoresDaCategoria).forEach(([key, setor]) => {
            const li = document.createElement('li');
            li.innerHTML = `${