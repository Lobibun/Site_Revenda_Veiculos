document.addEventListener("DOMContentLoaded", async () => {
    
    // === 1. LÓGICA DAS ABAS ===
    const itensMenu = document.querySelectorAll("#menu-perfil li");
    const abasConteudo = document.querySelectorAll(".secao-aba");

    itensMenu.forEach((item) => {
        item.addEventListener("click", () => {
            itensMenu.forEach((i) => i.classList.remove("ativo"));
            abasConteudo.forEach((aba) => aba.classList.remove("ativa"));

            item.classList.add("ativo");
            const abaId = item.getAttribute("data-aba");
            document.getElementById(abaId).classList.add("ativa");
        });
    });

    // === 2. CARREGAR DADOS DO USUÁRIO ===
    try {
        const resMe = await fetch("/admin/me");
        if (!resMe.ok) throw new Error("Não autorizado");
        const meusDados = await resMe.json();

        if (meusDados) {
            const elNomeExibicao = document.getElementById("perfil-nome-exibicao");
            const elEmailExibicao = document.getElementById("perfil-email-exibicao");
            const elCargo = document.getElementById("perfil-cargo");
            const elFoto = document.getElementById("perfil-foto");

            if (elNomeExibicao) elNomeExibicao.textContent = meusDados.nome;
            if (elEmailExibicao) elEmailExibicao.textContent = meusDados.email;

            let nomeNivel = "Vendedor";
            if (meusDados.nivel === "admin") nomeNivel = "Administrador";
            if (meusDados.nivel === "gerente") nomeNivel = "Gerente";
            if (elCargo) elCargo.textContent = nomeNivel;

            if (meusDados.foto && elFoto) {
                elFoto.src = meusDados.foto;
            }

            const inputEditNome = document.getElementById("edit-nome");
            if (inputEditNome) inputEditNome.value = meusDados.nome;

            const inputEmailAtual = document.getElementById("email-atual");
            if (inputEmailAtual) inputEmailAtual.value = meusDados.email;
        }
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        const elNomeErro = document.getElementById("perfil-nome-exibicao");
        if (elNomeErro) elNomeErro.textContent = "Erro ao carregar";
    }

    // === 3. TROCAR E SALVAR APENAS A FOTO ===
    const inputFoto = document.getElementById("edit-foto");
    const imgNoCracha = document.getElementById("perfil-foto");
    const btnSalvarFoto = document.getElementById("btn-salvar-foto");

    if (inputFoto && imgNoCracha) {
        // Pré-visualização
        inputFoto.addEventListener("change", function (e) {
            const arquivo = e.target.files[0];
            if (arquivo) {
                const leitor = new FileReader();
                leitor.onload = function (evento) {
                    imgNoCracha.src = evento.target.result;
                };
                leitor.readAsDataURL(arquivo);
                
                if (btnSalvarFoto) btnSalvarFoto.style.display = "block";
            }
        });
    }

    if (btnSalvarFoto) {
        btnSalvarFoto.addEventListener("click", async () => {
            const arquivoFoto = inputFoto.files[0];
            if (!arquivoFoto) return;

            const inputNome = document.getElementById("edit-nome").value || document.getElementById("perfil-nome-exibicao").textContent;

            const formData = new FormData();
            formData.append("nome", inputNome); 
            formData.append("foto", arquivoFoto);

            btnSalvarFoto.textContent = "Salvando...";
            btnSalvarFoto.disabled = true;

            try {
                const resposta = await fetch("/admin/api/atualizar-perfil", {
                    method: "PUT",
                    body: formData
                });
                const dados = await resposta.json();

                if (resposta.ok) {
                    Swal.fire({
                        icon: "success",
                        title: "Foto Atualizada!",
                        showConfirmButton: false,
                        timer: 1500
                    });
                    
                    btnSalvarFoto.style.display = "none"; 
                    if (dados.novaUrlFoto) imgNoCracha.src = dados.novaUrlFoto;
                } else {
                    Swal.fire({ icon: "error", title: "Erro", text: dados.mensagem || "Não foi possível salvar a foto.", confirmButtonColor: "#a00b0b" });
                }
            } catch (erro) {
                Swal.fire({ icon: "error", title: "Erro de Conexão", text: "Verifique sua internet e tente novamente.", confirmButtonColor: "#a00b0b" });
            } finally {
                btnSalvarFoto.textContent = "Salvar Nova Foto";
                btnSalvarFoto.disabled = false;
            }
        });
    }

    // === 4. SALVAR APENAS O NOME ===
    const formDados = document.getElementById("form-editar-dados");
    if (formDados) {
        formDados.addEventListener("submit", async (e) => {
            e.preventDefault();

            const inputNome = document.getElementById("edit-nome").value;
            const btnSalvar = formDados.querySelector("button");

            const formData = new FormData();
            formData.append("nome", inputNome);

            btnSalvar.textContent = "Salvando...";
            btnSalvar.disabled = true;

            try {
                const resposta = await fetch("/admin/api/atualizar-perfil", {
                    method: "PUT",
                    body: formData
                });
                const dados = await resposta.json();

                if (resposta.ok) {
                    Swal.fire({
                        icon: "success",
                        title: "Nome Atualizado!",
                        showConfirmButton: false,
                        timer: 1500
                    });
                    
                    const elNomeExibicao = document.getElementById("perfil-nome-exibicao");
                    if (elNomeExibicao) elNomeExibicao.textContent = inputNome;
                } else {
                    Swal.fire({ icon: "error", title: "Erro", text: dados.mensagem || "Não foi possível alterar o nome.", confirmButtonColor: "#a00b0b" });
                }
            } catch (erro) {
                Swal.fire({ icon: "error", title: "Erro de Conexão", confirmButtonColor: "#a00b0b" });
            } finally {
                btnSalvar.textContent = "Salvar Dados";
                btnSalvar.disabled = false;
            }
        });
    }

    // === 5. ATUALIZAR E-MAIL ===
    const formEmail = document.getElementById("form-editar-email");
    if (formEmail) {
        formEmail.addEventListener("submit", async (e) => {
            e.preventDefault();
            const novoEmail = document.getElementById("edit-email").value;
            const btnSalvar = formEmail.querySelector("button");

            btnSalvar.textContent = "Enviando...";
            btnSalvar.disabled = true;

            Swal.fire({
                title: "Processando...",
                text: "Aguarde enquanto geramos seu link de segurança.",
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                const resposta = await fetch("/admin/api/solicitar-alteracao-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ novoEmail: novoEmail }),
                });

                await new Promise(resolve => setTimeout(resolve, 600));
                const dados = await resposta.json();

                if (resposta.ok) {
                    Swal.fire({
                        icon: "success",
                        title: "Tudo certo!",
                        text: "Verifique a caixa de entrada do seu E-MAIL ATUAL para confirmar a alteração.",
                        confirmButtonColor: "#28a745",
                    });
                    formEmail.reset();
                } else {
                    Swal.fire({ icon: "error", title: "Não foi possível", text: dados.mensagem, confirmButtonColor: "#a00b0b" });
                }
            } catch (erro) {
                Swal.fire({ icon: "error", title: "Erro de conexão", text: "Tente novamente.", confirmButtonColor: "#a00b0b" });
            } finally {
                btnSalvar.textContent = "Atualizar E-mail";
                btnSalvar.disabled = false;
            }
        });
    }

    // === 6. ATUALIZAR SENHA ===
    const formSenha = document.getElementById("form-editar-senha");
    if (formSenha) {
        formSenha.addEventListener("submit", async (e) => {
            e.preventDefault();
            const senhaAtual = document.getElementById("senha-atual").value;
            const novaSenha = document.getElementById("edit-senha").value;
            const btnSenha = formSenha.querySelector("button");

            btnSenha.textContent = "Enviando e-mail...";
            btnSenha.disabled = true;

            Swal.fire({
                title: "Processando...",
                text: "Aguarde enquanto enviamos o e-mail de confirmação.",
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                const resposta = await fetch("/admin/api/solicitar-alteracao-senha", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ senhaAtual, novaSenha }),
                });

                await new Promise(resolve => setTimeout(resolve, 600));
                const resultado = await resposta.json();

                if (resposta.ok) {
                    Swal.fire({
                        icon: "success",
                        title: "Sucesso!",
                        text: "Verifique seu e-mail e clique no link para confirmar a nova senha.",
                        confirmButtonColor: "#28a745",
                    });
                    formSenha.reset();
                } else {
                    Swal.fire({ icon: 'error', title: 'Atenção!', text: resultado.mensagem, confirmButtonColor: '#a00b0b' });
                }
            } catch (erro) {
                Swal.fire({ icon: "error", title: "Erro de conexão", text: "Tente novamente.", confirmButtonColor: "#a00b0b" });
            } finally {
                btnSenha.textContent = "Atualizar Senha";
                btnSenha.disabled = false;
            }
        });
    }
});