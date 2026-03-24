document.addEventListener("DOMContentLoaded", function() {

    const form = document.getElementById("form-contato");
    const emailInput = document.getElementById("email");
    const erroEmail = document.getElementById("erro-email");

    form.addEventListener("submit", function(e) {
        e.preventDefault();

        const email = emailInput.value;
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!regex.test(email)) {
            erroEmail.textContent = "Digite um email válido!";
            emailInput.style.border = "2px solid red";
            return;
        }

        erroEmail.textContent = "";
        emailInput.style.border = "1px solid #ccc";

        alert("Mensagem enviada com sucesso!");
        form.reset();
    });

});