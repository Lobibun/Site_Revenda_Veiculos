document.addEventListener("DOMContentLoaded", async () => {
    
    const modal = document.getElementById("modal-novo-usuario");
    const btnAbrirModal = document.getElementById("btn-abrir-modal");
    const btnFecharModal = document.getElementById("btn-fechar-modal");
    const formNovoUsuario = document.getElementById("form-novo-usuario");
    const listaUsuarios = document.getElementById("lista-usuarios");
    const selectNivel = document.getElementById("novo-nivel");

    // --- LÓGICA DA FOTO (PREVIEW NO CADASTRO) ---
    const inputFotoNovo = document.getElementById("nova-foto");
    const imgPreviewNovo = document.getElementById("nova-preview-foto");
    const previewContainer = document.getElementById("preview-container");
    const labelUpload = document.getElementById("label-upload-foto");
    const FOTO_PADRAO = "/img/default-avatar.png";

    window.resetarModalCadastro = function() {
        if(formNovoUsuario) formNovoUsuario.reset();
        if(imgPreviewNovo) imgPreviewNovo.src = FOTO_PADRAO;
        if(previewContainer) previewContainer.classList.add("oculto");
        if(labelUpload) labelUpload.classList.remove("oculto");
        if(modal) {
            modal.classList.add("oculto");
            modal.style.display = "none";
        }
        document.body.classList.remove("modal-aberto");
    };

    if (inputFotoNovo && imgPreviewNovo) {
        inputFotoNovo.addEventListener("change", function (e) {
            const arquivo = e.target.files[0];
            if (arquivo) {
                const leitor = new FileReader();
                leitor.onload = function (evento) {
                    imgPreviewNovo.src = evento.target.result;
                    if(previewContainer) previewContainer.classList.remove("oculto");
                    if(labelUpload) labelUpload.classList.add("oculto"); 
                };
                leitor.readAsDataURL(arquivo);
            }
        });
    }

    // 1. DESCOBRIR QUEM ESTÁ LOGADO
    let usuarioLogado = null;
    try {
        const resMe = await fetch("/admin/me");
        usuarioLogado = await resMe.json();
    } catch (e) {
        console.error("Erro ao identificar usuário logado.");
    }

    if (usuarioLogado && usuarioLogado.nivel === 'gerente') {
        if (selectNivel) {
            Array.from(selectNivel.options).forEach(option => {
                if (option.value === 'admin' || option.value === 'gerente') {
                    option.style.display = 'none';
                }
            });
        }
    }

    // Abrir o Modal de Cadastro
    if(btnAbrirModal) {
        btnAbrirModal.addEventListener("click", () => {
            modal.classList.remove("oculto");
            modal.style.display = "flex";
            document.body.classList.add("modal-aberto");
        });
    }
    
    if(btnFecharModal) btnFecharModal.addEventListener("click", window.resetarModalCadastro);
    
    // Chama o Utils.js para fechar se clicar no fundo
    if(typeof window.configurarFechamentoModalClickFora === "function"){
        window.configurarFechamentoModalClickFora("modal-novo-usuario", window.resetarModalCadastro);
    }

    // 2. CADASTRAR NOVO USUÁRIO
    if(formNovoUsuario) {
        formNovoUsuario.addEventListener("submit", async (e) => {
            e.preventDefault();

            const btnSubmit = formNovoUsuario.querySelector('button[type="submit"]');
            const textoOriginal = btnSubmit.textContent;
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Salvando...";

            const formData = new FormData();
            formData.append("nome", document.getElementById("novo-nome").value);
            formData.append("email", document.getElementById("novo-email").value);
            formData.append("senha", document.getElementById("nova-senha").value);
            formData.append("nivel", document.getElementById("novo-nivel").value);
            
            const fotoInput = document.getElementById("nova-foto").files[0];
            if (fotoInput) formData.append("foto", fotoInput);

            try {
                const resposta = await fetch("/admin/usuarios", {
                    method: "POST",
                    body: formData
                });

                if (resposta.ok) {
                    Swal.fire('Sucesso!', 'Usuário cadastrado com sucesso!', 'success');
                    window.resetarModalCadastro();
                    carregarUsuarios();
                } else {
                    const erro = await resposta.json();
                    Swal.fire('Atenção', erro.mensagem || erro.erro, 'warning');
                }
            } catch (error) {
                Swal.fire('Erro', 'Erro de comunicação com o servidor.', 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = textoOriginal;
            }
        });
    }
    
    // 3. BUSCAR E LISTAR OS USUÁRIOS
    async function carregarUsuarios() {
        if(!listaUsuarios) return;

        try {
            const resposta = await fetch("/admin/api/usuarios");
            const usuarios = await resposta.json();

            listaUsuarios.innerHTML = ""; 

            if (usuarios.length === 0) {
                listaUsuarios.innerHTML = `<tr><td colspan="5" class="msg-tabela">Nenhum usuário encontrado.</td></tr>`;
                return;
            }

            usuarios.forEach(user => {
                let fotoCaminho = user.foto ? user.foto : "/img/default-avatar.png";
                if (!fotoCaminho.startsWith("http") && !fotoCaminho.startsWith("/")) fotoCaminho = "/" + fotoCaminho;

                let btnExcluirHtml = "";
                let nivelHtml = "";
                let podeExcluir = false;

                if (usuarioLogado && usuarioLogado.nivel === 'admin' && user.id !== usuarioLogado.id) {
                    podeExcluir = true;
                    nivelHtml = `
                        <select class="select-cargo" onchange="window.alterarCargo(${user.id}, this.value)">
                            <option value="vendedor" ${user.nivel === 'vendedor' ? 'selected' : ''}>Vendedor</option>
                            <option value="gerente" ${user.nivel === 'gerente' ? 'selected' : ''}>Gerente</option>
                            <option value="admin" ${user.nivel === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    `;
                } else {
                    let nomeNivel = "Vendedor";
                    if (user.nivel === "admin") nomeNivel = "Administrador";
                    if (user.nivel === "gerente") nomeNivel = "Gerente";
                    
                    nivelHtml = `<span class="badge badge-${user.nivel}">${nomeNivel}</span>`;
                    
                    if (usuarioLogado && usuarioLogado.nivel === 'gerente' && user.nivel === 'vendedor') {
                        podeExcluir = true;
                    }
                }

                if (podeExcluir) {
                    btnExcluirHtml = `<button class="btn-excluir" onclick="window.deletarUsuario(${user.id})"><i class="fa-solid fa-trash"></i> Excluir</button>`;
                } else {
                    btnExcluirHtml = `<span style="color: #666; font-size: 13px;">Restrito</span>`;
                }

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><img src="${fotoCaminho}" alt="Foto" class="foto-avatar" onclick="window.abrirLightbox('${fotoCaminho}')"></td>
                    <td><strong>${user.nome}</strong></td>
                    <td>${user.email}</td>
                    <td>${nivelHtml}</td>
                    <td>${btnExcluirHtml}</td>
                `;
                listaUsuarios.appendChild(tr);
            });

        } catch (error) {
            listaUsuarios.innerHTML = `<tr><td colspan="5" class="msg-tabela" style="color:#dc3545 !important;">Erro ao carregar a lista de usuários.</td></tr>`;
        }
    }

    window.carregarUsuariosGlobais = carregarUsuarios;
    carregarUsuarios();
});

// =========================================================
// FUNÇÕES GLOBAIS
// =========================================================

window.deletarUsuario = function(id) {
    if(typeof window.deletarRegistroGenerico === "function") {
        window.deletarRegistroGenerico(
            `/admin/usuarios/${id}`, 
            'O usuário foi removido com sucesso.', 
            () => {
                if(window.carregarUsuariosGlobais) window.carregarUsuariosGlobais();
                else window.location.reload();
            }
        );
    }
};

window.alterarCargo = async function(id, novoNivel) {
    const confirmacao = await Swal.fire({
        title: `Alterar para ${novoNivel.toUpperCase()}?`,
        text: `Tem certeza que deseja mudar o nível de acesso deste usuário?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#a00b0b',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, alterar!',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacao.isConfirmed) {
        if(window.carregarUsuariosGlobais) window.carregarUsuariosGlobais();
        else window.location.reload(); 
        return;
    }

    try {
        const resposta = await fetch(`/admin/usuarios/${id}/nivel`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ novoNivel })
        });

        if (resposta.ok) {
            Swal.fire({
                title: 'Sucesso!',
                text: 'Cargo atualizado com sucesso!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            const erro = await resposta.json();
            Swal.fire('Erro!', erro.erro || 'Não foi possível alterar.', 'error')
            .then(() => { if(window.carregarUsuariosGlobais) window.carregarUsuariosGlobais(); });
        }
    } catch (error) {
        Swal.fire('Erro!', 'Falha de comunicação com o servidor.', 'error')
        .then(() => { if(window.carregarUsuariosGlobais) window.carregarUsuariosGlobais(); });
    }
};