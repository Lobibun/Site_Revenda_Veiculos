// ==========================================
// 1. FECHAR QUALQUER MODAL CLICANDO FORA (COM PROTEÇÃO DE SELEÇÃO)
// ==========================================
window.configurarFechamentoModalClickFora = function(modalId, funcaoParaLimpar) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    let mousedownTarget = null;

    // Registra onde o clique COMEÇOU (quando aperta o botão do mouse)
    modal.onmousedown = function(e) {
        mousedownTarget = e.target;
    };

    // Só fecha se o clique COMEÇOU e TERMINOU no fundo escuro (modal)
    // Isso evita que arrastar o mouse para selecionar texto feche a tela sem querer
    modal.onmouseup = function(e) {
        if (mousedownTarget === modal && e.target === modal) {
            modal.style.display = "none";  
            document.body.classList.remove("modal-aberto");
            
            if (typeof funcaoParaLimpar === "function") {
                funcaoParaLimpar();
            }
        }
    };
};

// ==========================================
// 2. LIGHTBOX GLOBAL (ZOOM DE FOTOS)
// ==========================================
window.abrirLightbox = function(caminhoDaFoto) {
    const lightbox = document.getElementById("lightbox-foto");
    const lightboxImg = document.getElementById("lightbox-img");
    
    if (lightbox && lightboxImg) {
        lightboxImg.src = caminhoDaFoto;
        lightboxImg.classList.remove("imagem-zoom"); // Tira o zoom antigo
        lightbox.classList.remove("oculto"); 
        lightbox.style.display = "flex";     
    }
};

window.fecharLightbox = function() {
    const lightbox = document.getElementById("lightbox-foto");
    if (lightbox) {
        lightbox.classList.add("oculto"); 
        lightbox.style.display = "none";  
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const lightbox = document.getElementById("lightbox-foto");
    const lightboxImg = document.getElementById("lightbox-img");
    const btnFecharLightbox = document.querySelector(".btn-fechar-lightbox");

    // Fecha se clicar no botão X
    if (btnFecharLightbox) {
        btnFecharLightbox.onclick = window.fecharLightbox;
    }
    
    // Fecha se clicar no fundo escuro
    if (lightbox) {
        lightbox.onclick = function(e) {
            // Só fecha se NÃO for a própria foto e NÃO for o botão X
            if (e.target !== lightboxImg && e.target !== btnFecharLightbox) {
                window.fecharLightbox();
            }
        };
    }

    // Aplica o EFEITO DE ZOOM GIGANTE clicando na foto
    if (lightboxImg) {
        lightboxImg.onclick = function(e) {
            e.stopPropagation(); // Impede que o clique feche a tela preta
            this.classList.toggle("imagem-zoom"); // Dá o zoom
        };
    }
});

// ==========================================
// 3. EXCLUSÃO GENÉRICA COM SWEETALERT
// ==========================================
window.deletarRegistroGenerico = async function(urlEndpoint, mensagemSucesso, callbackSucesso) {
    const confirmacao = await Swal.fire({
        title: 'Tem certeza?',
        text: "Você não poderá reverter essa ação!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacao.isConfirmed) return;

    try {
        const resposta = await fetch(urlEndpoint, { method: "DELETE" });
        if (resposta.ok) {
            Swal.fire('Excluído!', mensagemSucesso, 'success').then(() => {
                if (callbackSucesso) callbackSucesso();
            });
        } else {
            const erro = await resposta.json();
            Swal.fire('Erro!', erro.erro || erro.mensagem || 'Não foi possível excluir.', 'error');
        }
    } catch (error) {
        console.error("Erro ao excluir:", error);
        Swal.fire('Erro!', 'Falha de comunicação com o servidor.', 'error');
    }
};