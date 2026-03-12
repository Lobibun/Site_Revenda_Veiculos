document.getElementById("form-carro").addEventListener("submit", async function(e) {

    e.preventDefault();

    const formData = new FormData(this);

    const resposta = await fetch("/admin/adicionar-carro", {
        method: "POST",
        body: formData
    });

    const resultado = await resposta.json();

    alert(resultado.mensagem);

});