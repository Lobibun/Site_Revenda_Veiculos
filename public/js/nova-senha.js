document.getElementById("form-nova-senha").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const token = new URLSearchParams(window.location.search).get('token');
    const novaSenha = document.getElementById("nova-senha").value;
    const btn = document.getElementById("btn-nova-senha");

    // Desativa o botão enquanto processa
    btn.disabled = true;
    btn.textContent = "Salvando...";

    try {
        const res = await fetch("/api/redefinir-senha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, novaSenha })
        });
        
        const dados = await res.json();

        if (res.ok) {
            // ALERTA DE SUCESSO (Com correção da barra branca)
            await Swal.fire({
                title: "Sucesso!",
                text: dados.mensagem || "Sua senha foi alterada com sucesso!",
                icon: "success",
                heightAuto: false 
            });
            
            // Redireciona para o login após fechar o alerta
            window.location.replace("/login.html");
        } else {
            Swal.fire({
                title: "Erro!",
                text: dados.erro || dados.mensagem || "Não foi possível alterar a senha.",
                icon: "error",
                heightAuto: false
            });
        }
    } catch (erro) {
        console.error("Erro ao redefinir senha:", erro);
        Swal.fire({
            title: "Erro!",
            text: "Falha na comunicação com o servidor. Tente novamente.",
            icon: "error",
            heightAuto: false
        });
    } finally {
        // Reativa o botão
        btn.disabled = false;
        btn.textContent = "Salvar Senha";
    }
});