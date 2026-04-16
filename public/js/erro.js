document.addEventListener('DOMContentLoaded', () => {
    // 1. Lógica do Timer de Redirecionamento
    let segundosRestantes = 15;
    const displaySegundos = document.getElementById('segundos');

    const contador = setInterval(() => {
        segundosRestantes--;
        displaySegundos.textContent = segundosRestantes;

        if (segundosRestantes <= 0) {
            clearInterval(contador);
            window.location.href = '/'; // Volta para a home
        }
    }, 1000);

    // 2. Lógica para capturar o erro da URL (opcional)
    // Se você chamar erro.html?tipo=500, a página se adapta
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo');

    if (tipo === '500') {
        document.getElementById('codigo-erro').textContent = '500';
        document.getElementById('titulo-erro').textContent = 'Erro Interno';
        document.getElementById('mensagem-erro').textContent = 'Nossos motores falharam! Estamos trabalhando para consertar o servidor.';
    } else if (tipo === '401') {
        document.getElementById('codigo-erro').textContent = '401';
        document.getElementById('titulo-erro').textContent = 'Acesso Negado';
        document.getElementById('mensagem-erro').textContent = 'Você não tem permissão para acessar esta área ou sua sessão expirou.';
    }
});