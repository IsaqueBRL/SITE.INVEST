# app.py

from flask import Flask, request, jsonify
from flask_cors import CORS # Necessário para permitir comunicação entre o JS e o Python

# Inicializa o aplicativo Flask
app = Flask(__name__)
# Habilita CORS (Cross-Origin Resource Sharing) para evitar erros de segurança no navegador
CORS(app)

# Dicionário de Previsões Fictícias
PREVISOES_FICCIA = {
    'manaus': 'Hoje em Manaus a temperatura será 32°C com chuva leve no final da tarde.',
    'são paulo': 'Em São Paulo teremos 25°C e céu nublado com sol tímido.',
    'rio': 'No Rio de Janeiro a máxima é de 38°C com sol escaldante, ideal para a praia!',
    # Adicione mais cidades ou lógicas aqui
}

# 🤖 Função da nossa "IA" (agora em Python)
def get_python_bot_response(user_message):
    message = user_message.lower().strip()

    # 1. Respostas Fixas
    if any(palavra in message for palavra in ['olá', 'oi', 'bom dia']):
        return 'Olá! Que bom ter você por aqui. Qual cidade fictícia você quer a previsão?'

    if 'como você está' in message:
        return 'Eu estou rodando em Python e Flask, então estou ótimo! E você?'

    # 2. Lógica de Previsão do Tempo
    for cidade, previsao in PREVISOES_FICCIA.items():
        if cidade in message or cidade.split()[0] in message: # Verifica nome completo ou primeira parte
            return previsao

    # 3. Resposta Padrão
    return 'Desculpe, a IA em Python não entendeu essa cidade ou comando. Tente perguntar sobre "Manaus" ou "São Paulo".'


# 🌐 Rota da API que o JavaScript irá chamar
@app.route('/api/chat', methods=['POST'])
def chat():
    # Pega os dados JSON enviados pelo JavaScript
    data = request.get_json()
    user_message = data.get('message', '')

    # Chama a função de IA em Python
    bot_response = get_python_bot_response(user_message)

    # Retorna a resposta como JSON para o JavaScript
    return jsonify({'response': bot_response})

# 🚀 Executa o servidor
if __name__ == '__main__':
    # O servidor rodará em http://127.0.0.1:5000/
    print("Servidor Python rodando em http://127.0.0.1:5000/")
    app.run(debug=True)
