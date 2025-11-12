// script.js - CÓDIGO FINAL AJUSTADO PARA CHAMAR A CLOUD FUNCTION

document.addEventListener('DOMContentLoaded', (event) => {

    // --- 1. Definição das Variáveis ---
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button'); 

    let isWaitingForResponse = false; 

    if (!sendButton || !userInput || !chatBox) {
        console.error("Erro CRÍTICO: Elementos do chat não encontrados.");
        return; 
    }
    
    // --- 2. Funções de Interface ---
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // --- 3. Conexão com a IA em Python (Cloud Function) ---
    async function callPythonAPI(message) {
        // *** NOVO ENDEREÇO DA CLOUD FUNCTION ***
        // O nome 'chatbotApi' é o nome que daremos à função Python
        // O URL será algo como: https://[REGION]-[PROJECT_ID].cloudfunctions.net/chatbotApi
        // Por enquanto, usaremos o nome de domínio padrão do projeto.
        const projectId = "banco-de-dados-invest"; // <<-- USE SEU PROJECT ID AQUI
        const region = "us-central1"; // <<-- USE A REGIÃO DEPLOY
        const functionName = "chatbotApi";
        
        const apiUrl = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`; 

        isWaitingForResponse = true;
        sendButton.disabled = true; 
        userInput.disabled = true;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });

            setTimeout(async () => {
                if (!response.ok) {
                    throw new Error(`Erro: ${response.status}. Verifique os logs da Cloud Function.`);
                }

                const data = await response.json();
                const botResponse = data.response || "Resposta nula da função.";
                addMessage(botResponse, 'bot');
            }, 500); 

        } catch (error) {
            console.error('ERRO FATAL: Falha na chamada da Cloud Function.', error);
            addMessage(`ERRO: Falha ao comunicar com o Backend. Verifique se a Cloud Function está deployada e funcionando.`, 'bot');
        } finally {
            isWaitingForResponse = false;
            sendButton.disabled = false;
            userInput.disabled = false;
            userInput.focus(); 
        }
    }

    // --- 4. Funções de Envio e Listeners (Mantidas) ---
    function handleUserInput() {
        if (isWaitingForResponse) return; 
        const userText = userInput.value.trim();
        if (userText === '') return; 
        addMessage(userText, 'user');
        userInput.value = ''; 
        callPythonAPI(userText);
    }

    sendButton.addEventListener('click', handleUserInput); 
    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });
});
