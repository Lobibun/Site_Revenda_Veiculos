document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form-contato");
    const nomeInput = document.getElementById("nome");
    const emailInput = document.getElementById("email");
    const mensagemInput = document.getElementById("mensagem");
    const btnEnviar = document.getElementById("btn-enviar");

    form.addEventListener("submit", async function (e) {
        e.preventDefault(); // Impede a página de recarregar

        const nome = nomeInput.value.trim();
        const email = emailInput.value.trim();
        const mensagem = mensagemInput.value.trim();
        
        // Regra rígida para validar formato de e-mail (ex: nome@dominio.com)
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!regexEmail.test(email))  {
            Swal.fire({
                icon: 'error',
                title: 'E-mail Inválido',
                text: 'Por favor, digite um e-mail verdadeiro.',
                confirmButtonColor: 'var(--cor-primaria)'
            });
            emailInput.style.borderColor = "var(--cor-primaria)";
            return;
        }

        emailInput.style.borderColor = "var(--cor-borda)";

        // Muda o texto do botão enquanto carrega
        btnEnviar.textContent = "Enviando...";
        btnEnviar.disabled = true;

        try {
            // Chama a rota que criamos no server.js
            const resposta = await fetch('/api/contato', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, mensagem })
            });

            const dados = await resposta.json();

            if (resposta.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Sucesso!',
                    text: 'Sua mensagem foi enviada. Responderemos em breve.',
                    confirmButtonColor: '#28a745'
                });
                form.reset(); // Limpa os campos
            } else {
                Swal.fire({ icon: 'error', title: 'Oops...', text: dados.erro, confirmButtonColor: '#a00b0b' });
            }
        } catch (erro) {
            Swal.fire({ icon: 'error', title: 'Erro de Conexão', text: 'O servidor não respondeu. Tente novamente.', confirmButtonColor: '#a00b0b' });
        } finally {
            btnEnviar.textContent = "Enviar Mensagem";
            btnEnviar.disabled = false;
        }
    });
});