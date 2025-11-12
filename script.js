// script.js - AJUSTADO PARA CORRIGIR O ReferenceError

// --- 1. Definição das Variáveis (CORREÇÃO DE ReferenceError) ---
// Garante que os elementos do HTML sejam capturados corretamente pelo ID.
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button'); // OK!

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

    // Bloqueia novo envio enquanto espera a resposta
    isWaitingForResponse = true;
    sendButton.disabled = true; 
    userInput.disabled = true;

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
                // Trata erros HTTP
                throw new Error(`Erro de rede: ${response.status}. Verifique o console do servidor Flask.`);
            }

            const data = await response.json();
            const botResponse = data.response;
            addMessage(botResponse, 'bot');
        }, 500); 

    } catch (error) {
        console.error('ERRO FATAL: Não foi possível conectar com o servidor Python.', error);
        addMessage(`ERRO: Falha ao comunicar com a IA. Verifique se o 'app.py' está rodando no endereço ${apiUrl}.`, 'bot');
    } finally {
        // Libera o envio
        isWaitingForResponse = false;
        sendButton.disabled = false;
        userInput.disabled = false;
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

// --- 5. Event Listeners (Garantindo que estão no final) ---

// Verifica se os elementos foram encontrados antes de adicionar listeners
if (sendButton && userInput) {
    // Aciona a função no clique do botão
    sendButton.addEventListener('click', handleUserInput); 

    // Aciona a função ao pressionar a tecla Enter no campo de input
    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });
} else {
    // Caso ainda haja um problema, exibe um erro útil no console
    console.error("Erro: Elementos 'send-button' ou 'user-input' não foram encontrados no DOM. Verifique os IDs no index.html.");
}
