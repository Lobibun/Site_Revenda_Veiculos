document.addEventListener('DOMContentLoaded', () => {
    // 1. Pega as informações que o server.js mandou pela URL
    const urlParams = new URLSearchParams(window.location.search);
    const tipo = urlParams.get('tipo'); // sucesso, erro ou aviso
    const msg = urlParams.get('msg');   // a frase

    // 2. Seleciona os elementos da tela para alterar
    const icone = document.getElementById('icone-status');
    const titulo = document.getElementById('titulo-status');
    const mensagem = document.getElementById('mensagem-status');
    const card = document.getElementById('card-status');
    const btn = document.getElementById('btn-voltar');

    // 3. Aplica o texto da mensagem
    if (msg) {
        mensagem.textContent = msg;
    } else {
        mensagem.textContent = "Nenhuma informação foi recebida.";
    }

    // 4. Personaliza cor, ícone e título dependendo do "tipo"
    if (tipo === 'sucesso') {
        icone.textContent = '✅';
        titulo.textContent = 'Sucesso!';
        card.style.borderTopColor = '#28a745'; // Verde
        btn.style.backgroundColor = '#28a745';
    } else if (tipo === 'erro') {
        icone.textContent = '❌';
        titulo.textContent = 'Ops! Algo deu errado.';
        card.style.borderTopColor = '#dc3545'; // Vermelho
        btn.style.backgroundColor = '#dc3545';
    } else if (tipo === 'aviso') {
        icone.textContent = '⚠️';
        titulo.textContent = 'Atenção!';
        card.style.borderTopColor = '#ff9800'; // Laranja
        btn.style.backgroundColor = '#ff9800';
    } else {
        icone.textContent = '🚗';
        titulo.textContent = 'Aviso do Sistema';
    }
});