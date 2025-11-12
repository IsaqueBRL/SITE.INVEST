// script.js - CÓDIGO FINAL AJUSTADO COM DOMContentLoaded

// O código só será executado quando a estrutura do HTML (o DOM) estiver completamente carregada
document.addEventListener('DOMContentLoaded', (event) => {

    // --- 1. Definição das Variáveis ---
    // AQUI garantimos que os elementos já existem
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button'); 

    let isWaitingForResponse = false; 

    // Se um dos elementos principais não existir, paramos o script e mostramos um erro
    if (!sendButton || !userInput || !chatBox) {
        console.error("Erro CRÍTICO: Um ou mais elementos do chat (send-button, user-input, chat-box) não foram encontrados. Verifique os IDs no index.html.");
        return; // Sai da função, evitando o erro de referência
    }
    
    // --- 2. Funções de Interface ---
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // --- 3. Conexão com a IA em Python/Flask ---
    async function callPythonAPI(message) {
        const apiUrl = 'http://127.0.0.1:5000/api/chat'; 

        // Bloqueia novo envio
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

            setTimeout(async () => {
                if (!response.ok) {
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
            userInput.focus(); 
        }
    }

    // --- 4. Função Principal de Envio ---
    function handleUserInput() {
        if (isWaitingForResponse) {
            return; 
        }
        
        const userText = userInput.value.trim();

        if (userText === '') {
            return; 
        }

        addMessage(userText, 'user');
        userInput.value = ''; 

        callPythonAPI(userText);
    }

    // --- 5. Event Listeners ---
    sendButton.addEventListener('click', handleUserInput); 

    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });
});
