document.getElementById("login-form")?.addEventListener("submit", function(e){
    e.preventDefault();

    const usuario = this.usuario.value;
    const senha = this.senha.value;

    if(usuario === "admin" && senha === "1234")
    {
        window.location.href = "dashboard.html";
    }

    else
    {
        alert("Usuário ou senha incorretos!");
    }

});