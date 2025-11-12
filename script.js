// script.js (Parte 2: Modificações)
// ... (mantenha as definições de variáveis e a função addMessage) ...

// Função principal de envio de mensagem MODIFICADA
function handleUserInput() {
    const userText = userInput.value.trim();

    if (userText === '') {
        return;
    }

    // 1. Adiciona a mensagem do usuário
    addMessage(userText, 'user');
    userInput.value = '';

    // 2. Chama a API do Python/Flask
    callPythonAPI(userText);
}

// 🌐 Função que chama o servidor Python
async function callPythonAPI(message) {
    const apiUrl = 'http://127.0.0.1:5000/api/chat'; // Endereço do seu servidor Flask

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });

        // Simula um "pensamento"
        setTimeout(async () => {
            if (!response.ok) {
                // Trata erros HTTP
                throw new Error(`Erro de rede: ${response.status}`);
            }

            const data = await response.json();
            const botResponse = data.response;
            addMessage(botResponse, 'bot');
        }, 500); // Atraso de 0.5 segundo

    } catch (error) {
        console.error('Erro ao conectar com o servidor Python:', error);
        addMessage(`ERRO: Não consegui me conectar com a IA (Servidor Python). Verifique se o 'app.py' está rodando.`, 'bot');
    }
}

// Event Listeners (para cliques e tecla Enter)
sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleUserInput();
    }
});
