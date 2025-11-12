// Funções para manipular a interface
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Adiciona uma mensagem ao chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    // Rola para a mensagem mais recente
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Lógica de Resposta do Chatbot (nossa "IA" simples)
function getBotResponse(userMessage) {
    // 1. Converte a mensagem para minúsculas e remove espaços extras para facilitar a comparação
    const message = userMessage.toLowerCase().trim();

    // 2. Dicionário de Previsões Fictícias
    const previsoes = {
        'manaus': 'Hoje em Manaus a temperatura será 32°C com chuva leve no final da tarde.',
        'são paulo': 'Em São Paulo teremos 25°C e céu nublado com sol tímido.',
        'rio': 'No Rio de Janeiro a máxima é de 38°C com sol escaldante, ideal para a praia!',
        'florianópolis': 'Florianópolis terá 22°C e ventos fortes. Traga seu casaco.',
        'recife': 'Recife terá 29°C e umidade alta, sem previsão de chuva.',
        'curitiba': 'Curitiba terá um dia frio de 15°C e céu parcialmente encoberto.',
        'paraná': 'Curitiba terá um dia frio de 15°C e céu parcialmente encoberto.',
        'sp': 'Em São Paulo teremos 25°C e céu nublado com sol tímido.',
        'rj': 'No Rio de Janeiro a máxima é de 38°C com sol escaldante, ideal para a praia!',
    };

    // 3. Verifica a mensagem do usuário
    if (message.includes('olá') || message.includes('oi') || message.includes('bom dia')) {
        return 'Olá! Que bom ter você por aqui. Qual cidade fictícia você quer a previsão?';
    }

    if (message.includes('como você está') || message.includes('tudo bem')) {
        return 'Eu estou ótimo, pronto para te dar a previsão do tempo! E você?';
    }

    if (message.includes('quem é você') || message.includes('o que você faz')) {
        return 'Eu sou o ClimaBot, um assistente fictício de previsão do tempo. Posso te dar a previsão para algumas cidades do Brasil (fictícia, claro!).';
    }

    // 4. Procura por uma cidade conhecida no dicionário
    for (const cidade in previsoes) {
        if (message.includes(cidade)) {
            return previsoes[cidade];
        }
    }

    // 5. Resposta padrão (Fallback)
    return 'Desculpe, não consegui entender essa cidade ou comando. Tente perguntar sobre "Manaus", "São Paulo" ou "Rio", ou digite "quem é você".';
}

// Função principal de envio de mensagem
function handleUserInput() {
    const userText = userInput.value.trim();

    if (userText === '') {
        return; // Não envia mensagem vazia
    }

    // 1. Adiciona a mensagem do usuário
    addMessage(userText, 'user');
    userInput.value = ''; // Limpa o campo de input

    // 2. Obtém a resposta do bot após um pequeno atraso para simular o "pensamento"
    setTimeout(() => {
        const botResponse = getBotResponse(userText);
        addMessage(botResponse, 'bot');
    }, 500); // Atraso de 0.5 segundo
}

// Event Listeners (para cliques e tecla Enter)
sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleUserInput();
    }
});
