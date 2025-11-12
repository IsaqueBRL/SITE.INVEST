// Aguarda o carregamento completo do documento HTML
document.addEventListener('DOMContentLoaded', function() {
    // 1. Seleciona o botão pelo ID
    const botao = document.getElementById('meuBotao');
    
    // 2. Adiciona um "ouvinte de evento" para o clique
    botao.addEventListener('click', function() {
        // Ação a ser executada quando o botão for clicado
        alert('Botão Clicado! Sua lógica JavaScript pode começar aqui.');
        
        // Exemplo de manipulação do DOM:
        const h2 = document.querySelector('#conteudo-principal h2');
        if (h2.textContent === 'Sua Área de Criação') {
            h2.textContent = 'Conteúdo Alterado por JS!';
        } else {
            h2.textContent = 'Sua Área de Criação';
        }
    });
    
    // Você pode adicionar qualquer outra lógica JavaScript aqui,
    // como carregar dados, validar formulários, criar animações, etc.
    console.log("O script.js foi carregado com sucesso!");
});
