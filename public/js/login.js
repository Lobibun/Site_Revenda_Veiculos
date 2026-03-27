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
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, senha }),
            });

            if (resposta.ok) {
                this.reset();
                window.location.replace("/admin");
            } else {
                erroBox.textContent = "E-mail ou senha incorretos!";
                erroBox.style.display = "block";
            }
        } catch (error) {
            console.error("Erro ao conectar com o servidor:", error);
            alert("Ocorreu um erro. Tente novamente mais tarde.");
        }
        
        btn.disabled = false;
        btn.textContent = "Entrar";
    });