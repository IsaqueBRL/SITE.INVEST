// script.js - CÓDIGO AJUSTADO PARA GARANTIR O ENVIO

// --- 1. Definição das Variáveis (Garante que os elementos foram carregados) ---
// É importante que este script.js seja carregado no final do index.html (como fizemos).
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Variável de controle para evitar múltiplos envios enquanto espera a resposta
let isWaitingForResponse = false; 

// --- 2. Funções de Interface ---
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    // Rola para a mensagem mais recente
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- 3. Conexão com a IA em Python/Flask ---
async function callPythonAPI(message) {
    const apiUrl = 'http://127.0.0.1:5000/api/chat'; // Endereço do seu servidor Flask

    // Impede novo envio
    isWaitingForResponse = true;
    sendButton.disabled = true; // Desabilita o botão

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });

        // Simula um "pensamento" (mantemos o delay, mas o fetch já espera)
        setTimeout(async () => {
            if (!response.ok) {
                // Se a resposta HTTP for um erro (ex: 404, 500)
                throw new Error(`Erro no servidor (código ${response.status}). Verifique o console do servidor Flask.`);
            }

            const data = await response.json();
            const botResponse = data.response;
            addMessage(botResponse, 'bot');
        }, 500);

    } catch (error) {
        console.error('ERRO FATAL: Não foi possível conectar com o servidor Python.', error);
        addMessage(`ERRO: Falha ao comunicar com a IA (Servidor Python). Verifique se o 'app.py' está rodando no endereço ${apiUrl}.`, 'bot');
    } finally {
        // Libera o envio, independentemente de sucesso ou falha
        isWaitingForResponse = false;
        sendButton.disabled = false;
        userInput.focus(); // Coloca o cursor de volta
    }
}

// --- 4. Função Principal de Envio ---
function handleUserInput() {
    // 1. Verifica se já está esperando uma resposta
    if (isWaitingForResponse) {
        return; 
    }
    
    const userText = userInput.value.trim();

    // 2. Não envia mensagem vazia
    if (userText === '') {
        return; 
    }

    // 3. Adiciona a mensagem do usuário na tela
    addMessage(userText, 'user');
    userInput.value = ''; // Limpa o campo de input

    // 4. Inicia a comunicação com o backend
    callPythonAPI(userText);
}

// --- 5. Event Listeners ---
// Aciona a função no clique do botão
sendButton.addEventListener('click', handleUserInput); 

// Aciona a função ao pressionar a tecla Enter no campo de input
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleUserInput();
    }
});
