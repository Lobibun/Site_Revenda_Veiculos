// --- LÓGICA DE LOGIN ---
document
    .getElementById("login-form")
    .addEventListener("submit", async function (e) {
        e.preventDefault();

        const email = this.email.value;
        const senha = this.senha.value;
        const erroBox = document.getElementById("erro-box");
        const btn = document.getElementById("btn-login");

        erroBox.style.display = "none";
        btn.disabled = true;
        btn.textContent = "Entrando...";
        try {
            const resposta = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, senha }),
            });

            // Captura o "recibo" invisível do servidor que diz quantas tentativas restam
            const tentativasRestantes = resposta.headers.get(
                "ratelimit-remaining",
            );

            if (resposta.ok) {
                this.reset();
                window.location.replace("/admin");
            } else if (resposta.status === 429) {
                // Já foi bloqueado
                const dados = await resposta.json();
                erroBox.textContent = dados.erro;
                erroBox.style.display = "block";
            } else {
                // Errou a senha, mas ainda não foi bloqueado
                if (tentativasRestantes === "1") {
                    // O AVISO ANTES DO BLOQUEIO
                    erroBox.innerHTML =
                        "<strong>Senha incorreta!</strong><br>CUIDADO: Você só tem mais 1 tentativa antes de ser bloqueado por 15 minutos.";
                } else {
                    // Erro normal (mostra quantas faltam)
                    erroBox.textContent = `E-mail ou senha incorretos! (Restam ${tentativasRestantes} tentativas)`;
                }
                erroBox.style.display = "block";
            }
        } catch (error) {
            console.error("Erro:", error);
            alert("Ocorreu um erro. Tente novamente mais tarde.");
        } finally {
            btn.disabled = false;
            btn.textContent = "Entrar no Sistema";
        }
    });

// --- CONTROLE DO MODAL ---
const linkEsqueceu = document.getElementById("link-esqueceu");
const modalRecuperar = document.getElementById("modal-recuperar");
const btnCancelar = document.getElementById("btn-cancelar-recuperar");

linkEsqueceu.onclick = (e) => {
    e.preventDefault();
    modalRecuperar.style.display = "flex";
};

btnCancelar.onclick = () => {
    modalRecuperar.style.display = "none";
};

// --- LÓGICA DE RECUPERAÇÃO (Igual ao Login) ---
document.getElementById("form-recuperar").onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("email-recuperacao").value;
    const btn = document.getElementById("btn-enviar-recuperar");

    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
        const res = await fetch("/api/esqueceu-senha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        const dados = await res.json();

        if (res.ok) {
            // Sucesso
            Swal.fire(
                "Sucesso!",
                "Link de recuperação enviado! Verifique seu e-mail.",
                "success",
            );
            document.getElementById("modal-recuperar").style.display = "none";
            document.getElementById("form-recuperar").reset(); // Limpa o campo de email
        } else {
            // Erro customizado vindo do servidor (ex: Email não cadastrado)
            Swal.fire(
                "Aviso!",
                dados.erro || "Erro ao tentar enviar o link.",
                "warning",
            );
        }
    } catch (error) {
        console.error("Erro:", error);
        Swal.fire(
            "Erro!",
            "Ocorreu um erro de comunicação com o servidor. Tente novamente.",
            "error",
        );
    } finally {
        btn.disabled = false;
        btn.textContent = "Enviar Link";
    }
};
