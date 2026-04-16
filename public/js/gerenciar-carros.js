let carrosDataGlobal = [];

document.addEventListener("DOMContentLoaded", () => {
    carregarMarcasEdicao();
    carregarCarros();
    carregarOpcionaisEdicao(); 

    // ==========================================
    // FILTROS DA PÁGINA PRINCIPAL
    // ==========================================
    const inputBuscaCarro = document.getElementById("filtro-busca-carro");
    const selectStatusCarro = document.getElementById("filtro-status-carro");

    if(inputBuscaCarro) inputBuscaCarro.addEventListener("input", aplicarFiltrosMain);
    if(selectStatusCarro) selectStatusCarro.addEventListener("change", aplicarFiltrosMain);

    // ==========================================
    // LÓGICA DO SELECT PERSONALIZADO DE MARCAS NO MODAL
    // ==========================================
    const btnSelectMarca = document.getElementById("btn-select-marca");
    const dropdownMarca = document.getElementById("dropdown-marca");
    const inputBuscaMarca = document.getElementById("busca-marca-modal");

    // 1. Abre/fecha a caixinha ao clicar no botão
    if (btnSelectMarca && dropdownMarca) {
        btnSelectMarca.addEventListener("click", () => {
            dropdownMarca.classList.toggle("mostrar");
            if (dropdownMarca.classList.contains("mostrar") && inputBuscaMarca) {
                inputBuscaMarca.focus(); // Foca na pesquisa automaticamente
            }
        });
    }

    // 2. Fecha a caixinha se clicar fora dela
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#container-marca") && dropdownMarca) {
            dropdownMarca.classList.remove("mostrar");
        }
    });

    // 3. Filtra as marcas enquanto digita no modal
    if(inputBuscaMarca) {
        inputBuscaMarca.addEventListener("input", function(e) {
            const termo = e.target.value.toLowerCase();
            const items = document.querySelectorAll(".custom-select-item");
            items.forEach(item => {
                const texto = item.textContent.toLowerCase();
                item.style.display = texto.includes(termo) ? "block" : "none";
            });
        });
    }

    // ==========================================
    // LÓGICA DE BUSCA DE OPCIONAIS NO MODAL
    // ==========================================
    const inputBuscaOpcional = document.getElementById("busca-opcional-modal");
    if(inputBuscaOpcional) {
        inputBuscaOpcional.addEventListener("input", function(e) {
            const termo = e.target.value.toLowerCase();
            const labels = document.querySelectorAll("#edit-grid-opcionais label");
            labels.forEach(label => {
                const texto = label.textContent.toLowerCase();
                // Usamos 'flex' pois é o display original definido no seu CSS
                label.style.display = texto.includes(termo) ? "flex" : "none"; 
            });
        });
    }

    // ==========================================
    // EVENTOS DO FORMULÁRIO E MODAL
    // ==========================================
    const btnFecharModal = document.getElementById("btn-fechar-modal-carro");
    if (btnFecharModal) {
        btnFecharModal.addEventListener("click", fecharModal);
    }

    const formEditarCarro = document.getElementById("form-editar-carro");
    if (formEditarCarro) {
        formEditarCarro.addEventListener("submit", salvarEdicao);
    }
    
    if (typeof configurarFechamentoModalClickFora === "function") {
        configurarFechamentoModalClickFora("modal-editar-carro", fecharModal);
    }

    const editTemOpcionais = document.getElementById("edit-tem-opcionais");
    if (editTemOpcionais) {
        editTemOpcionais.addEventListener("change", function () {
            const lista = document.getElementById("edit-lista-opcionais");
            if (this.checked) {
                lista.style.display = "block";
            } else {
                lista.style.display = "none";
                document.querySelectorAll("#edit-grid-opcionais input[name='opcionais']").forEach(el => el.checked = false);
            }
        });
    }

    const editFotos = document.getElementById("edit-fotos");
    if (editFotos) {
        editFotos.addEventListener("change", function (e) {
            const container = document.getElementById("edit-preview-fotos");
            if (!container) return;
            container.innerHTML = "";

            const files = Array.from(e.target.files).slice(0, 5); 

            files.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const figure = document.createElement("figure");
                    figure.className = "preview-figure";

                    figure.innerHTML = `
                        <img src="${event.target.result}">
                        <label class="preview-label">Nova Foto ${index + 1}</label>
                    `;
                    container.appendChild(figure);
                };
                reader.readAsDataURL(file);
            });
        });
    }
});

// ==========================================
// FUNÇÕES DE CARREGAMENTO (API)
// ==========================================

async function carregarMarcasEdicao() {
    try {
        const resposta = await fetch("/marcas");
        if (resposta.ok) {
            const marcas = await resposta.json();
            const listaCustom = document.getElementById("lista-marcas-custom");
            
            if(listaCustom) {
                listaCustom.innerHTML = ""; // Limpa a lista antes de popular
                marcas.forEach((marca) => {
                    const div = document.createElement("div");
                    div.className = "custom-select-item";
                    div.dataset.id = marca.id; // Salva o ID da marca no elemento
                    div.textContent = marca.nome;
                    
                    // Ação ao clicar em uma marca da lista
                    div.addEventListener("click", () => {
                        // Salva o ID no input invisível para enviar pro servidor
                        document.getElementById("edit-marca_id").value = marca.id;
                        
                        // Atualiza o texto do botão para mostrar a marca escolhida
                        const btnSpan = document.querySelector("#btn-select-marca span");
                        if(btnSpan) btnSpan.textContent = marca.nome;
                        
                        // Esconde o dropdown
                        document.getElementById("dropdown-marca").classList.remove("mostrar");
                    });

                    listaCustom.appendChild(div);
                });
            }
        }
    } catch (erro) {
        console.error("Erro ao carregar marcas no modal:", erro);
    }
}

async function carregarOpcionaisEdicao() {
    try {
        const res = await fetch("/opcionais");
        const opcionais = await res.json();
        const container = document.getElementById("edit-grid-opcionais");
        if(container) {
            const html = opcionais.map(op => `
                <label>
                    <input type="checkbox" name="opcionais" value="${op.id}">
                    ${op.nome}
                </label>
            `).join("");
            container.innerHTML = html;
        }
    } catch (error) {
        console.error("Erro ao carregar opcionais:", error);
    }
}

async function carregarCarros() {
    const listaUl = document.getElementById("lista-carros");
    if(!listaUl) return;
    
    try {
        listaUl.innerHTML = '<li class="msg-estado">Carregando veículos...</li>';
        const resposta = await fetch("/admin/api/carros");
        carrosDataGlobal = await resposta.json(); // Salva os carros na variável global

        renderizarListaCarros(carrosDataGlobal); // Renderiza a lista completa a princípio
    } catch (erro) {
        console.error("Erro:", erro);
        listaUl.innerHTML = '<li class="msg-lista-erro">Erro ao carregar veículos.</li>';
    }
}

function renderizarListaCarros(listaCarros) {
    const listaUl = document.getElementById("lista-carros");
    listaUl.innerHTML = "";

    if (listaCarros.length === 0) {
        listaUl.innerHTML = '<li class="msg-lista-vazia">Nenhum veículo encontrado.</li>';
        return;
    }

    listaCarros.forEach((carro) => {
        const foto = carro.imagem_principal || "https://via.placeholder.com/80x60?text=Sem+Foto";
        const precoFormatado = Number(carro.preco).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });

        let classeStatus = "status-disponivel";
        if (carro.status === "Vendido") classeStatus = "status-vendido";
        if (carro.status === "Reservado") classeStatus = "status-reservado"; 

        let btnStatusHtml = '';
        if (carro.status !== "Vendido") {
            btnStatusHtml = `
            <button onclick="marcarComoVendido(${carro.id})" class="btn-acao btn-vender-tabela" title="Marcar como Vendido" style="color: #28a745; font-size: 1.1rem;">
                <i class="fas fa-hand-holding-dollar"></i>
            </button>`;
        } else {
            btnStatusHtml = `
            <button onclick="desfazerVenda(${carro.id})" class="btn-acao btn-desfazer-tabela" title="Desfazer Venda (Voltar para Disponível)" style="color: #ffc107; font-size: 1.1rem;">
                <i class="fas fa-undo"></i>
            </button>`;
        }

        const itemLi = document.createElement("li");
        itemLi.innerHTML = `
            <article class="carro-item">
                <img src="${foto}" class="foto-lista-personalizada" alt="${carro.modelo}">
                
                <section class="info-principal">
                    <h3>${carro.marca}</h3>
                    <p>${carro.modelo}</p>
                </section>

                <span class="ano-carro-lista">${carro.ano}</span>

                <strong class="info-preco">${precoFormatado}</strong>

                <section>
                    <span class="badge-status ${classeStatus}">${carro.status}</span>
                </section>

                <nav class="acoes-container">
                    ${btnStatusHtml}
                    <button onclick="abrirModal(${carro.id})" class="btn-acao btn-editar-tabela" title="Editar">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button onclick="deletarCarro(${carro.id})" class="btn-acao btn-excluir-tabela" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </nav>
            </article>
        `;
        listaUl.appendChild(itemLi);
    });
}

function aplicarFiltrosMain() {
    const termoBusca = document.getElementById("filtro-busca-carro").value.toLowerCase();
    const statusBusca = document.getElementById("filtro-status-carro").value;

    const carrosFiltrados = carrosDataGlobal.filter(carro => {
        const matchTexto = carro.marca.toLowerCase().includes(termoBusca) || 
                           carro.modelo.toLowerCase().includes(termoBusca) || 
                           String(carro.ano).includes(termoBusca);
        
        const matchStatus = statusBusca === "" || carro.status === statusBusca;

        return matchTexto && matchStatus;
    });

    renderizarListaCarros(carrosFiltrados);
}

// ==========================================
// FUNÇÕES DO MODAL E INTEGRAÇÃO
// ==========================================

window.abrirModal = async function (id) {
    // 1. Resetando os campos de busca do modal
    const buscaMarca = document.getElementById("busca-marca-modal");
    if(buscaMarca) buscaMarca.value = "";
    
    const buscaOpc = document.getElementById("busca-opcional-modal");
    if(buscaOpc) buscaOpc.value = "";
    
    // 2. Reseta a visibilidade da lista de marcas e opcionais
    document.querySelectorAll(".custom-select-item").forEach(item => item.style.display = "block");
    document.querySelectorAll("#edit-grid-opcionais label").forEach(lbl => lbl.style.display = "flex");
    
    const dropdownMarca = document.getElementById("dropdown-marca");
    if(dropdownMarca) dropdownMarca.classList.remove("mostrar");

    // 3. Mostra o modal (adicionando e removendo as classes certas para funcionar o clique fora)
    const modal = document.getElementById("modal-editar-carro");
    if(!modal) return;
    
    modal.classList.remove("oculto"); // IMPORTANTE PARA O CLIQUE FORA FUNCIONAR
    modal.style.display = "flex";
    document.body.classList.add("modal-aberto");

    // 4. Esconde os opcionais inicialmente
    const chkOpcionais = document.getElementById("edit-tem-opcionais");
    const listaOpc = document.getElementById("edit-lista-opcionais");
    
    if(chkOpcionais) chkOpcionais.checked = false;
    if(listaOpc) listaOpc.style.display = "none";
    document.querySelectorAll("#edit-grid-opcionais input[name='opcionais']").forEach(el => el.checked = false);

    // 5. Busca as informações do carro no banco
    try {
        const resposta = await fetch(`/carros/${id}`);
        if (!resposta.ok) throw new Error("Erro ao buscar dados");

        const carro = await resposta.json();

        const setValor = (idDoInput, valor) => {
            const el = document.getElementById(idDoInput);
            if (el) el.value = valor || "";
        };

        setValor("edit-id-carro", carro.id);
        setValor("edit-modelo", carro.modelo);
        setValor("edit-ano", carro.ano);
        setValor("edit-preco", carro.preco);
        setValor("edit-quilometragem", carro.quilometragem);
        setValor("edit-fipe", carro.fipe);
        setValor("edit-cambio", carro.cambio);
        setValor("edit-combustivel", carro.Combustivel || carro.combustivel);

        // Atualiza a Marca (Lógica Nova do Select Personalizado)
        setValor("edit-marca_id", carro.marca_id);
        const itemMarca = document.querySelector(`.custom-select-item[data-id="${carro.marca_id}"]`);
        const btnTexto = document.querySelector("#btn-select-marca span");
        if (itemMarca && btnTexto) {
            btnTexto.textContent = itemMarca.textContent; // Coloca o nome correto da marca
        } else if (btnTexto) {
            btnTexto.textContent = "Marca Selecionada (ID: " + carro.marca_id + ")";
        }

        const selectLeilao = document.getElementById("edit-leilao");
        if (selectLeilao) {
            const temLeilao = carro.leilao === 1 || carro.leilao === "1" || carro.leilao === "Sim" || carro.leilao === true;
            selectLeilao.value = temLeilao ? "Sim" : "Não";
        }

        // Destaque
        const checkDestaque = document.getElementById("input-destaque");
        if (checkDestaque) {
            checkDestaque.checked = (carro.destaque == 1 || carro.destaque === true);
        }

        // Opcionais
        if (carro.Opcionais === 1 || carro.opcionais === 1) {
            if(chkOpcionais) chkOpcionais.checked = true;
            if(listaOpc) listaOpc.style.display = "block";
            
            fetch(`/carros/${id}/opcionais`)
                .then(r => r.json())
                .then(marcados => {
                    marcados.forEach(op => {
                        const idDaOpcao = op.opcional_id || op.id;
                        const checkbox = document.querySelector(`#edit-grid-opcionais input[value="${idDaOpcao}"]`);
                        if(checkbox) checkbox.checked = true;
                    });
                }).catch(e => console.log("Erro ao buscar opcionais:", e));
        }

        const editFotos = document.getElementById("edit-fotos");
        if(editFotos) editFotos.value = "";
        
        const preview = document.getElementById("edit-preview-fotos");
        if (preview) preview.innerHTML = "";

        renderizarGaleriaEdicao(carro);
    } catch (erro) {
        console.error(erro);
        Swal.fire("Erro!", "Não foi possível carregar os dados.", "error");
        fecharModal();
    }
};

function fecharModal() {
    const modal = document.getElementById("modal-editar-carro");
    if(modal) {
        modal.classList.add("oculto"); // IMPORTANTE PARA O CLIQUE FORA FUNCIONAR
        modal.style.display = "none";
        document.body.classList.remove("modal-aberto");
    }
}

function renderizarGaleriaEdicao(carro) {
    const galeria = document.getElementById("galeria-edicao");
    if(!galeria) return;
    
    galeria.innerHTML = "";

    if (!carro.fotos || carro.fotos.length === 0) {
        galeria.innerHTML = "<p class='msg-sem-foto' style='color:#888;'>Nenhuma foto cadastrada.</p>";
        return;
    }

    carro.fotos.forEach((foto) => {
        const figure = document.createElement("figure");
        figure.className = "foto-edit-item";

        const isCapa = foto.caminho === carro.imagem_principal;
        const classeImgCapa = isCapa ? "img-capa-ativa" : "img-capa-inativa";
        const classeBotaoCapa = isCapa ? "btn-capa-ativa" : "btn-capa-inativa";
        const textoBotaoCapa = isCapa ? "⭐ Capa Atual" : "Tornar Capa";

        figure.innerHTML = `
            <img src="${foto.caminho}" class="${classeImgCapa}" alt="Foto do veículo" onclick="abrirLightbox('${foto.caminho}')">
            <button type="button" class="btn-apagar-foto" onclick="apagarFoto(${foto.id}, ${carro.id})" title="Excluir foto">&times;</button>
            <button type="button" class="btn-capa-foto ${classeBotaoCapa}" onclick="definirCapa(${carro.id}, ${foto.id})">
                ${textoBotaoCapa}
            </button>
        `;
        galeria.appendChild(figure);
    });
}

window.apagarFoto = async function (idFoto, idCarro) {
    const confirmacao = await Swal.fire({
        title: 'Excluir Foto?',
        text: "Essa ação não pode ser desfeita!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacao.isConfirmed) {
        try {
            const res = await fetch(`/admin/carros/fotos/${idFoto}`, { method: "DELETE" });
            if (res.ok) {
                const resposta = await fetch(`/carros/${idCarro}`);
                const carroAtualizado = await resposta.json();
                renderizarGaleriaEdicao(carroAtualizado);
                carregarCarros(); 
            } else {
                Swal.fire("Erro", "Erro ao excluir foto.", "error");
            }
        } catch (e) {
            console.error(e);
        }
    }
};

window.definirCapa = async function (idCarro, idFoto) {
    try {
        const res = await fetch(`/admin/carros/${idCarro}/capa/${idFoto}`, { method: "PUT" });
        if (res.ok) {
            const resposta = await fetch(`/carros/${idCarro}`);
            const carroAtualizado = await resposta.json();
            renderizarGaleriaEdicao(carroAtualizado);
            carregarCarros(); 
        } else {
            Swal.fire("Erro", "Erro ao definir capa.", "error");
        }
    } catch (e) {
        console.error(e);
    }
};

window.deletarCarro = function(id) {
    if (typeof deletarRegistroGenerico === "function") {
        deletarRegistroGenerico(
            `/admin/carros/${id}`, 
            'O veículo foi removido com sucesso.', 
            carregarCarros
        );
    }
};

async function salvarEdicao(e) {
    e.preventDefault();

    const idInput = document.getElementById("edit-id-carro");
    if(!idInput) return;
    
    const id = idInput.value;
    const form = document.getElementById("form-editar-carro");
    const formData = new FormData(form);

    const fotosInput = document.getElementById("edit-fotos");
    if (fotosInput && fotosInput.files.length === 0) {
        formData.delete("fotos");
    }

    formData.delete("opcionais"); 
    const chkOpcionais = document.getElementById("edit-tem-opcionais");
    
    if (chkOpcionais && chkOpcionais.checked) {
        const opcionaisMarcados = document.querySelectorAll("#edit-grid-opcionais input[name='opcionais']:checked");
        opcionaisMarcados.forEach(checkbox => {
            formData.append("opcionais", checkbox.value);
        });
    }

    const checkDestaque = document.getElementById("input-destaque");
    const isDestaque = (checkDestaque && checkDestaque.checked) ? 1 : 0;
    formData.append("destaque", isDestaque);

    const btnSalvar = document.getElementById("btn-salvar-edicao");
    if(btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.textContent = "Salvando...";
    }

    try {
        const resposta = await fetch("/admin/carros/" + id, {
            method: "PUT",
            body: formData,
        });

        const resultado = await resposta.json();

        if (resposta.ok) {
            Swal.fire("Sucesso!", "O veículo foi atualizado.", "success");
            fecharModal();
            carregarCarros();
        } else {
            Swal.fire("Erro!", resultado.erro || "Erro ao atualizar", "error");
        }
    } catch (erro) {
        console.error("Erro:", erro);
        Swal.fire("Erro!", "Falha na comunicação com o servidor.", "error");
    } finally {
        if(btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.textContent = "Salvar Alterações";
        }
    }
}

// ==========================================
// FUNÇÕES DE STATUS: VENDER E DESFAZER VENDA
// ==========================================

window.marcarComoVendido = async function (id) {
    const { value: observacao, isConfirmed } = await Swal.fire({
        title: 'Marcar veículo como Vendido?',
        text: 'Opcional: Adicione uma observação (quem vendeu, detalhes da negociação, etc).',
        input: 'textarea',
        inputPlaceholder: 'Digite sua observação aqui...',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, vender!',
        cancelButtonText: 'Cancelar'
    });

    if (isConfirmed) {
        try {
            const resposta = await fetch(`/admin/carros/${id}/vender`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ observacao: observacao || null })
            });

            if (resposta.ok) {
                Swal.fire("Vendido!", "Veículo marcado como vendido.", "success");
                carregarCarros(); 
            } else {
                const erro = await resposta.json();
                Swal.fire("Erro", erro.mensagem || "Não foi possível concluir a venda.", "error");
            }
        } catch (erro) {
            console.error("Erro ao vender:", erro);
            Swal.fire("Erro", "Falha de comunicação com o servidor.", "error");
        }
    }
};

window.desfazerVenda = async function (id) {
    const confirmacao = await Swal.fire({
        title: 'Desfazer Venda?',
        text: "Isso fará o veículo voltar a ficar 'Disponível' no sistema e apagará a observação de venda.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ffc107',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, desfazer',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacao.isConfirmed) {
        try {
            const resposta = await fetch(`/admin/carros/${id}/disponibilizar`, {
                method: "PUT"
            });

            if (resposta.ok) {
                Swal.fire("Desfeito!", "O veículo está disponível novamente.", "success");
                carregarCarros(); 
            } else {
                const erro = await resposta.json();
                Swal.fire("Erro", erro.mensagem || "Não foi possível desfazer a venda.", "error");
            }
        } catch (erro) {
            console.error("Erro ao desfazer venda:", erro);
            Swal.fire("Erro", "Falha de comunicação com o servidor.", "error");
        }
    }
};