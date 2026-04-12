document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. MÁSCARA DE TELEFONE
    // ==========================================
    function aplicarMascaraTelefone(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.setAttribute("maxlength", "15"); 
        input.addEventListener("input", function (e) {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
            if (!x) {
                e.target.value = '';
                return;
            }
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        });
    }

    aplicarMascaraTelefone("telefone");
    aplicarMascaraTelefone("edit-telefone");

    // ==========================================
    // 2. PREVIEW DE FOTO (PÁGINA ADICIONAR)
    // ==========================================
    const inputFotoAdd = document.getElementById("foto");
    const previewContainerAdd = document.getElementById("add-preview-container");
    const previewImgAdd = document.getElementById("add-preview-img");
    const btnRemoverFotoAdd = document.getElementById("btn-remover-foto");
    const uploadLabel = document.querySelector('label[for="foto"]');

    function removerFotoAdd() {
        if(inputFotoAdd) inputFotoAdd.value = ""; 
        if(previewContainerAdd) previewContainerAdd.classList.add("oculto"); 
        if(previewImgAdd) previewImgAdd.src = ""; 
        if(uploadLabel) uploadLabel.classList.remove("oculto");
    }

    if (inputFotoAdd && previewContainerAdd) {
        inputFotoAdd.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImgAdd.src = event.target.result;
                    previewContainerAdd.classList.remove("oculto"); 
                    if(uploadLabel) uploadLabel.classList.add("oculto"); 
                };
                reader.readAsDataURL(file);
            } else {
                removerFotoAdd();
            }
        });
    }

    if (btnRemoverFotoAdd) {
        btnRemoverFotoAdd.addEventListener("click", removerFotoAdd);
    }

    // ==========================================
    // 3. ADICIONAR NOVO VENDEDOR
    // ==========================================
    const formVendedor = document.getElementById("form-vendedor");
    if (formVendedor) {
        formVendedor.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(formVendedor);
            
            const btnSubmit = formVendedor.querySelector('button[type="submit"]');
            const textoOriginal = btnSubmit.textContent;
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Salvando...";
            
            try {
                const response = await fetch("/admin/vendedores", { method: "POST", body: formData });
                const data = await response.json();

                if (response.ok) {
                    await Swal.fire({ title: "Sucesso!", text: "Vendedor cadastrado com sucesso!", icon: "success", heightAuto: false });
                    window.location.href = "/admin/modificar-vendedores";
                } else {
                    Swal.fire({ title: "Erro!", text: data.erro || "Erro ao cadastrar", icon: "error", heightAuto: false });
                }
            } catch (erro) {
                console.error("Erro ao salvar:", erro);
                Swal.fire({ title: "Erro!", text: "Ocorreu um erro interno no servidor.", icon: "error", heightAuto: false });
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = textoOriginal;
            }
        });
    }

    // ==========================================
    // 4. CARREGAR LISTA NA PÁGINA "GERENCIAR"
    // ==========================================
    const tabelaBody = document.getElementById("tabela-vendedores-body");
    if (tabelaBody) {
        carregarVendedores();
    }

    async function carregarVendedores() {
        try {
            const response = await fetch("/vendedores");
            const vendedores = await response.json();
            
            tabelaBody.innerHTML = "";
            
            if (vendedores.length === 0) {
                tabelaBody.innerHTML = "<tr><td colspan='5' style='text-align: center;'>Nenhum vendedor cadastrado.</td></tr>";
                return;
            }

            const iconeLapis = `<svg viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>`;
            const iconeLixeira = `<svg viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`;

            vendedores.forEach(vend => {
                let fotoSrc = vend.foto ? vend.foto : "/img/default-avatar.png";
                if (!fotoSrc.startsWith("http") && !fotoSrc.startsWith("/")) fotoSrc = "/" + fotoSrc;
                
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><img src="${fotoSrc}" alt="Foto" class="foto-avatar" style="cursor: pointer;" onclick="window.abrirLightbox('${fotoSrc}')" title="Ampliar"></td>
                    <td>${vend.nome}</td>
                    <td>${vend.email}</td>
                    <td>${vend.telefone}</td>
                    <td>
                        <button onclick="window.abrirModalVendedor(${vend.id})" class="btn-acao btn-editar" title="Editar Vendedor">
                            ${iconeLapis}
                        </button>
                        <button onclick="window.deletarVendedor(${vend.id})" class="btn-acao btn-excluir" title="Excluir Vendedor">
                            ${iconeLixeira}
                        </button>
                    </td>
                `;
                tabelaBody.appendChild(tr);
            });
        } catch (erro) {
            console.error("Erro ao carregar lista:", erro);
        }
    }
    window.carregarVendedoresGlobais = carregarVendedores;

    // ==========================================
    // 5. EVENTOS DO MODAL DE EDIÇÃO
    // ==========================================
    const formEditar = document.getElementById("form-editar-vendedor");
    if(formEditar) {
        formEditar.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("edit-id-vendedor").value;
            
            // 1º Criamos o FormData VAZIO
            const formData = new FormData();

            // 2º Adicionamos os TEXTOS PRIMEIRO (Isto evita a pasta sem nome!)
            formData.append("nome", document.getElementById("edit-nome").value);
            formData.append("email", document.getElementById("edit-email").value);
            formData.append("telefone", document.getElementById("edit-telefone").value);

            // 3º Adicionamos a FOTO POR ÚLTIMO (se houver)
            const fotoInput = document.getElementById("edit-foto");
            if (fotoInput && fotoInput.files.length > 0) {
                formData.append("foto", fotoInput.files[0]);
            }

            const btnSalvar = document.getElementById("btn-salvar-vendedor");
            const textoAntigo = btnSalvar.textContent;
            btnSalvar.disabled = true;
            btnSalvar.textContent = "Salvando...";

            try {
                const resposta = await fetch("/admin/vendedores/" + id, {
                    method: "PUT",
                    body: formData,
                });

                const resultado = await resposta.json();

                if (resposta.ok) {
                    await Swal.fire({ title: "Sucesso!", text: "O vendedor foi atualizado.", icon: "success", heightAuto: false });
                    window.fecharModalVendedor();
                    if(window.carregarVendedoresGlobais) window.carregarVendedoresGlobais();
                } else {
                    Swal.fire({ title: "Erro!", text: resultado.erro || "Erro ao atualizar", icon: "error", heightAuto: false });
                }
            } catch (erro) {
                console.error("Erro:", erro);
                Swal.fire({ title: "Erro!", text: "Falha na comunicação com o servidor.", icon: "error", heightAuto: false });
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.textContent = textoAntigo;
            }
        });
    }

    const inputFotoEdit = document.getElementById("edit-foto");
    if(inputFotoEdit) {
        inputFotoEdit.addEventListener("change", (e) => {
            const container = document.getElementById("edit-preview-foto-vendedor");
            const file = e.target.files[0];
            if (file && container) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    container.innerHTML = `<img src="${event.target.result}" alt="Nova Foto" onclick="window.abrirLightbox('${event.target.result}')" title="Ampliar">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Fechar Modal 
    const btnFecharModal = document.getElementById("btn-fechar-modal-vendedor");
    if(btnFecharModal) btnFecharModal.addEventListener("click", window.fecharModalVendedor);
    
    if(typeof configurarFechamentoModalClickFora === "function"){
        configurarFechamentoModalClickFora("modal-editar-vendedor", window.fecharModalVendedor);
    }

    // Eventos do Lightbox (Zoom de Foto)
    const btnFecharLz = document.querySelector(".btn-fechar-lightbox");
    const lightbox = document.getElementById("lightbox-foto");

    if(btnFecharLz) btnFecharLz.addEventListener("click", window.fecharLightbox);
    
    if(lightbox) {
        lightbox.addEventListener("click", (e) => {
            // Fecha se clicar no fundo preto
            if(e.target === lightbox || e.target.classList.contains("lightbox-content")) {
                window.fecharLightbox();
            }
        });
    }
});


// ========================================================
// FUNÇÕES GLOBAIS (Devem ficar FORA do DOMContentLoaded)
// ========================================================

window.fecharModalVendedor = function() {
    const modal = document.getElementById("modal-editar-vendedor");
    if(modal) {
        modal.classList.add("oculto");
        modal.style.display = "none"; // Garante que esconde
    }
    document.body.classList.remove("modal-aberto");
}

// === A SOLUÇÃO DO BUG ESTÁ AQUI ABAIXO === //

window.fecharLightbox = function() {
    const lightboxEl = document.getElementById("lightbox-foto");
    const imgEl = document.getElementById("lightbox-img");
    if(lightboxEl) {
        lightboxEl.classList.add("oculto");
        lightboxEl.style.display = "none"; // Garante que esconde ao fechar
    }
    if(imgEl) imgEl.src = ""; // Limpa a imagem para não bugar a próxima abertura
};

window.abrirLightbox = function(src) {
    const lightboxEl = document.getElementById("lightbox-foto");
    const imgEl = document.getElementById("lightbox-img");
    if(lightboxEl && imgEl) {
        imgEl.src = src;
        lightboxEl.classList.remove("oculto");
        lightboxEl.style.display = "flex"; // QUEBRA O "EFEITO CHICLETE" E FORÇA APARECER
    }
};

window.abrirModalVendedor = async function (id) {
    const modal = document.getElementById("modal-editar-vendedor");
    if(modal) {
        modal.classList.remove("oculto");
        modal.style.display = "flex"; // Força aparecer
    }
    document.body.classList.add("modal-aberto");

    try {
        const resposta = await fetch(`/vendedores`); 
        const vendedores = await resposta.json();
        const vendedor = vendedores.find(v => String(v.id) === String(id));

        if (!vendedor) throw new Error("Vendedor não encontrado");

        document.getElementById("edit-id-vendedor").value = vendedor.id;
        document.getElementById("edit-nome").value = vendedor.nome;
        document.getElementById("edit-email").value = vendedor.email;
        document.getElementById("edit-telefone").value = vendedor.telefone;
        document.getElementById("edit-foto").value = "";

        const previewContainer = document.getElementById("edit-preview-foto-vendedor");
        let fotoSrc = vendedor.foto ? vendedor.foto : "/img/default-avatar.png";
        if (!fotoSrc.startsWith("http") && !fotoSrc.startsWith("/")) fotoSrc = "/" + fotoSrc; 
        
        previewContainer.innerHTML = `<img src="${fotoSrc}" alt="Preview" onclick="window.abrirLightbox('${fotoSrc}')" title="Ampliar">`;
    } catch (erro) {
        console.error(erro);
        Swal.fire({ title: "Erro!", text: "Não foi possível carregar os dados.", icon: "error", heightAuto: false });
        window.fecharModalVendedor();
    }
};

window.deletarVendedor = async function(id) {
    const confirmacao = await Swal.fire({
        title: 'Tem certeza?',
        text: "Você deseja remover este vendedor permanentemente?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar',
        heightAuto: false
    });

    if (!confirmacao.isConfirmed) return;

    try {
        const response = await fetch(`/admin/vendedores/${id}`, { method: "DELETE" });
        const data = await response.json();
        if (response.ok) {
            await Swal.fire({ title: "Excluído!", text: "Vendedor removido com sucesso!", icon: "success", heightAuto: false });
            if(window.carregarVendedoresGlobais) window.carregarVendedoresGlobais();
            else window.location.reload();
        } else {
            Swal.fire({ title: "Erro!", text: data.erro || "Falha ao excluir", icon: "error", heightAuto: false });
        }
    } catch (erro) {
        Swal.fire({ title: "Erro!", text: "Erro interno ao deletar.", icon: "error", heightAuto: false });
    }
};