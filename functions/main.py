# functions/main.py

import functions_framework
from flask import jsonify, request
import firebase_admin
from firebase_admin import db # Importa o Realtime Database

# Verifica e inicializa o app Firebase (apenas uma vez)
try:
    firebase_admin.get_app()
except ValueError:
    # URL do seu Realtime Database
    DB_URL = "https://banco-de-dados-invest-default-rtdb.firebaseio.com"
    firebase_admin.initialize_app(options={'databaseURL': DB_URL})


# 🤖 Função da nossa "IA" (agora acessando o Banco de Dados)
def get_python_bot_response(user_message):
    message = user_message.lower().strip()
    
    # 1. Respostas Fixas
    if any(palavra in message for palavra in ['olá', 'oi', 'bom dia', 'eae']):
        return 'Olá! Que bom ter você por aqui. Qual cidade fictícia você quer a previsão?'
    
    if 'como você está' in message:
        return 'Eu sou uma Cloud Function do Firebase rodando em Python. Estou ótimo! E você?'

    # 2. Busca no Banco de Dados (Exemplo)
    # Tenta obter uma lista de cidades conhecidas
    cidades_conhecidas = ['manaus', 'são paulo', 'rio', 'floripa', 'sp', 'rj']
    
    cidade_buscada = None
    for cidade in cidades_conhecidas:
        if cidade in message:
            cidade_buscada = cidade
            break

    if cidade_buscada:
        try:
            # EXEMPLO DE ACESSO AO DATABASE: Assumindo que você tem dados em /previsoes/manaus
            ref = db.reference(f'previsoes/{cidade_buscada}')
            data = ref.get()
            
            if data and 'texto_previsao' in data:
                return data['texto_previsao']
            else:
                # Se não encontrar no BD, usa uma previsão padrão
                return f"Não encontrei a previsão detalhada para {cidade_buscada} no BD. O céu está limpo!"

        except Exception as e:
            print(f"Erro ao acessar BD: {e}")
            return "Erro interno ao consultar o banco de dados."


    # 3. Resposta Padrão (Fallback)
    return f'Desculpe, a IA em Python não entendeu a cidade "{user_message}". Tente perguntar sobre "Manaus" ou "São Paulo".'


# 🌐 Rota da API (O ponto de entrada da Cloud Function)
# O nome desta função 'chatbotApi' deve ser usado no comando de deploy e no script.js
@functions_framework.http
def chatbotApi(request):
    """Entry point para a função HTTP."""
    
    # Define CORS headers para que o frontend possa acessar
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*'
    }
    
    try:
        data = request.get_json(silent=True)
        if data is None:
             data = {}

        user_message = data.get('message', '')
        
        bot_response = get_python_bot_response(user_message)
        
        return jsonify({'response': bot_response}), 200, headers
        
    except Exception as e:
        return jsonify({'response': f'Erro interno do servidor: {e}'}), 500, headers
