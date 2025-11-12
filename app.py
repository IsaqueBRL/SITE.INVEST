# app.py

from flask import Flask, request, jsonify
from flask_cors import CORS # Essencial para comunicação JS/Python

# Inicializa o aplicativo Flask
app = Flask(__name__)
# Habilita CORS para permitir que o JavaScript (http://127.0.0.1) se comunique com o Python (http://127.0.0.1:5000)
CORS(app) 

# Dicionário de Previsões Fictícias
PREVISOES_FICCIA = {
    'manaus': 'Hoje em Manaus a temperatura será 32°C com chuva leve no final da tarde.',
    'são paulo': 'Em São Paulo teremos 25°C e céu nublado com sol tímido.',
    'rio': 'No Rio de Janeiro a máxima é de 38°C com sol escaldante, ideal para a praia!',
    'floripa': 'Florianópolis terá 22°C e ventos fortes. Traga seu casaco.',
    'sp': 'Em São Paulo teremos 25°C e céu nublado com sol tímido.',
    'rj': 'No Rio de Janeiro a máxima é de 38°C com sol escaldante, ideal para a praia!',
}

# 🤖 Função da nossa "IA" (em Python)
def get_python_bot_response(user_message):
    message = user_message.lower().strip()

    # 1. Respostas Fixas de Saudação
    if any(palavra in message for palavra in ['olá', 'oi', 'bom dia', 'eae']):
        return 'Olá! Que bom ter você por aqui. Qual cidade fictícia você quer a previsão?'

    if 'como você está' in message:
        return 'Eu estou rodando em Python e Flask, estou pronto para trabalhar! E você?'
        
    # 2. Lógica de Previsão do Tempo (Busca por palavras-chave)
    for cidade, previsao in PREVISOES_FICCIA.items():
        if cidade in message:
            return previsao

    # 3. Resposta Padrão (Fallback)
    return f'Desculpe, a IA em Python não entendeu a cidade "{user_message}". Tente perguntar sobre "Manaus" ou "São Paulo".'


# 🌐 Rota da API que o JavaScript irá chamar
@app.route('/api/chat', methods=['POST'])
def chat():
    # Pega os dados JSON enviados pelo JavaScript
    data = request.get_json()
    user_message = data.get('message', '')

    # Chama a função de IA em Python
    bot_response = get_python_bot_response(user_message)

    # Retorna a resposta como JSON
    return jsonify({'response': bot_response})

# 🚀 Executa o servidor
if __name__ == '__main__':
    print("\n--- INICIANDO SERVIDOR PYTHON ---")
    print("O servidor rodará em http://127.0.0.1:5000/ (Mantenha esta janela aberta)")
    app.run(debug=True)
