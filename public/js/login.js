document
    .getElementById("login-form")
    .addEventListener("submit", async function (e) {
        e.preventDefault();

        const usuario = this.usuario.value;
        const senha = this.senha.value;
        const erroBox = document.getElementById("erro-box");
        const btn = document.getElementById("btn-login");

        erroBox.style.display = "none";

        btn.disabled = true;
        btn.textContent = "Entrando...";
        try {
        const resposta = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ usuario, senha }),
        });

        if (resposta.ok) {
            window.location.href = "/admin";
        } else {
            erroBox.textContent = "Usuário ou senha incorretos!";
            erroBox.style.display = "block";
        }
        } catch (error) {
        console.error("Erro ao conectar com o servidor:", error);
        alert("Ocorreu um erro. Tente novamente mais tarde.");
        }
        btn.disabled = false;
        btn.textContent = "Entrar";
    });
