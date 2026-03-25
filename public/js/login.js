document
    .getElementById("login-form")
    .addEventListener("submit", async function (e) {
        e.preventDefault();

        const usuario = this.usuario.value;
        const senha = this.senha.value;

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
            alert("Usuário ou senha incorretos!");
        }
    });
