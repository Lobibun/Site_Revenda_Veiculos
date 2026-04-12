async function carregarDetalhesVeiculo() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) return;

    try {
        const [resposta, resVendedores] = await Promise.all([
            fetch(`/carros/${id}`),
            fetch(`/vendedores`),
        ]);

        if (!resposta.ok) throw new Error("Carro não encontrado");
        const carro = await resposta.json();

        let vendedores = [];
        if (resVendedores.ok) {
            vendedores = await resVendedores.json();
        }

        const container = document.getElementById("detalhe-veiculo");
        const miniaturasModal = document.getElementById("miniaturas-modal");

        // FOTOS
        const fotosHTML =
            carro.fotos && carro.fotos.length
                ? carro.fotos
                      .map(
                          (f) =>
                              `<li class="slide"><figure><img src="${f.caminho}" alt="${carro.marca} ${carro.modelo}"></figure></li>`,
                      )
                      .join("")
                : `<li class="slide"><figure><img src="${carro.imagem_principal}" alt="${carro.marca} ${carro.modelo}"></figure></li>`;

        const miniaturasHTML =
            carro.fotos && carro.fotos.length
                ? carro.fotos
                      .map(
                          (f, i) =>
                              `<img src="${f.caminho}" class="miniatura" data-index="${i}" alt="${carro.marca} ${carro.modelo} - miniatura ${i + 1}">`,
                      )
                      .join("")
                : `<img src="${carro.imagem_principal}" class="miniatura" data-index="0" alt="${carro.marca} ${carro.modelo} - miniatura">`;

        const miniaturasModalHTML =
            carro.fotos && carro.fotos.length
                ? carro.fotos
                      .map(
                          (f, i) =>
                              `<img src="${f.caminho}" data-index="${i}" alt="Ampliada ${i}">`,
                      )
                      .join("")
                : `<img src="${carro.imagem_principal}" data-index="0" alt="Ampliada">`;

        // SELOS
        let seloFipe = "";
        if (Number(carro.preco) < Number(carro.fipe)) {
            seloFipe = `<span class="selo-fipe-detalhe"><i class="fa-solid fa-arrow-trend-down"></i> Abaixo da FIPE</span>`;
        }

        let tagStatus = "";
        const isVendido = carro.status === "Vendido" || carro.status === "vendido";
        
        if (isVendido) {
            tagStatus = `<span class="badge-status vendido"><i class="fa-solid fa-tag"></i> VENDIDO</span>`;
        } else {
            tagStatus = `<span class="badge-status disponivel"><i class="fa-solid fa-check-circle"></i> DISPONÍVEL</span>`;
        }

        // PREÇO INTEGRADO NA FICHA TÉCNICA
        let ddPreco = `<dd class="preco-destaque-dd">R$ ${Number(carro.preco).toLocaleString("pt-BR")}</dd>`;

        if (carro.preco_antigo && Number(carro.preco) < Number(carro.preco_antigo)) {
            const percentualDesconto = Math.round(
                ((Number(carro.preco_antigo) - Number(carro.preco)) /
                    Number(carro.preco_antigo)) *
                    100,
            );

            ddPreco = `
                <dd class="preco-destaque-dd preco-com-desconto">
                    <span class="preco-antigo-wrapper">
                        <del>R$ ${Number(carro.preco_antigo).toLocaleString("pt-BR")}</del>
                        <mark class="tag-desconto">-${percentualDesconto}%</mark>
                    </span>
                    <span>R$ ${Number(carro.preco).toLocaleString("pt-BR")}</span>
                </dd>
            `;
        }

        // MENSAGEM INTELIGENTE DO WHATSAPP (Condicional com base no status do carro)
        let textoWhatsApp = "";
        if (!isVendido) {
            const mensagemCustomizada = `Olá! Vi o veículo ${carro.marca} ${carro.modelo} no site e tenho interesse.`;
            textoWhatsApp = `?text=${encodeURIComponent(mensagemCustomizada)}`;
        }

        // VENDEDORES
        const listaVendedoresHTML = vendedores
            .map((v) => {
                const numeroTelefone = v.telefone ? v.telefone.replace(/\D/g, "") : "";
                const linkFinalWhatsApp = `https://wa.me/55${numeroTelefone}${textoWhatsApp}`;
                
                return `
                <a href="${linkFinalWhatsApp}" class="vendedor-card" target="_blank" rel="noopener noreferrer">
                    <img src="${v.foto || ""}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(v.nome)}&background=25D366&color=fff'" alt="Foto de ${v.nome}">
                    <span class="nome-vendedor">${v.nome}</span>
                </a>
                `;
            })
            .join("");

        const contatosWhatsApp = `
            <aside class="contato-vendedores">
                <h3><i class="fa-brands fa-whatsapp"></i> Fale com nossos vendedores</h3>
                
                <search class="busca-vendedor">
                    <i class="fa-solid fa-search"></i>
                    <input type="text" id="input-pesquisa-vendedor" placeholder="Buscar vendedor..." aria-label="Buscar vendedor">
                </search>

                <address class="lista-vendedores" style="font-style: normal;">
                    ${listaVendedoresHTML || "<p>Nenhum vendedor cadastrado no momento.</p>"}
                </address>
            </aside>
        `;

        // HTML FINAL MONTADO
        container.innerHTML = `
<article class="veiculo-detalhe">

    <header class="titulo-veiculo">
        <h1>${carro.marca} <span>${carro.modelo}</span></h1>
        <aside class="tags-topo">
            ${seloFipe}
            ${tagStatus}
        </aside>
    </header>    

    <figure class="galeria-container">
        <section class="carrossel">
            <ul class="slides">
                ${fotosHTML}
            </ul>
        </section>
        <nav class="miniaturas" aria-label="Miniaturas do veículo">
            ${miniaturasHTML}
        </nav>
    </figure>

    ${contatosWhatsApp}

    <section class="info-veiculo">
        <article class="bloco-detalhes">
            <h2><i class="fa-solid fa-list"></i> Ficha Técnica e Valor</h2>
            <dl class="detalhes-detalhe">
                <dt class="dt-preco">Valor</dt>
                ${ddPreco}

                <dt>Ano</dt>
                <dd>${carro.ano}</dd>
                
                <dt>Quilometragem</dt>
                <dd>${carro.quilometragem} km</dd>
                
                <dt>Combustível</dt>
                <dd>${carro.Combustivel || carro.combustivel}</dd>
                
                <dt>Câmbio</dt>
                <dd>${carro.cambio}</dd>
                
                <dt>FIPE</dt>
                <dd>R$ ${Number(carro.fipe).toLocaleString("pt-BR")}</dd>
                
                <dt>Leilão</dt>
                <dd>${carro.leilao == 1 || carro.leilao === "Sim" || carro.leilao === true ? "Sim" : "Não"}</dd>
            </dl>
        </article>

        <article class="opcionais">
            <h2><i class="fa-solid fa-star"></i> Opcionais</h2>
            <ul class="opcionais-lista">
                ${
                    carro.opcionais && carro.opcionais.length
                        ? carro.opcionais
                              .map((op) => `<li>${op.nome || op}</li>`)
                              .join("")
                        : "<li>Nenhum opcional informado</li>"
                }
            </ul>
        </article>
    </section>

</article>
        `;

        // LÓGICA DO FILTRO DE PESQUISA DOS VENDEDORES
        const inputBusca = document.getElementById("input-pesquisa-vendedor");
        if (inputBusca) {
            inputBusca.addEventListener("input", (e) => {
                const termo = e.target.value.toLowerCase();
                const cardsVendedores = container.querySelectorAll(".vendedor-card");

                cardsVendedores.forEach((card) => {
                    const nome = card.querySelector(".nome-vendedor").textContent.toLowerCase();
                    if (nome.includes(termo)) {
                        card.style.display = "flex";
                    } else {
                        card.style.display = "none";
                    }
                });
            });
        }

        // LÓGICA DE NAVEGAÇÃO E MODAL INTACTA
        let indexAtual = 0;

        const slides = container.querySelectorAll(".slide");
        const miniaturas = container.querySelectorAll(".miniatura");
        miniaturasModal.innerHTML = miniaturasModalHTML;

        const modal = document.getElementById("modal-imagem");
        const imgAmpliada = document.getElementById("img-ampliada");
        const fechar = document.querySelector(".fechar");
        const miniaturasModalImgs = miniaturasModal.querySelectorAll("img");

        function atualizarModal() {
            const imgAtual = slides[indexAtual].querySelector("img");
            imgAmpliada.src = imgAtual.src;
        }

        function mostrarSlide(index) {
            slides.forEach((slide, i) => {
                slide.style.display = i === index ? "flex" : "none";
            });

            miniaturas.forEach((mini, i) => {
                mini.classList.toggle("ativa", i === index);
            });

            indexAtual = index;
        }

        miniaturasModalImgs.forEach((mini) => {
            mini.addEventListener("click", () => {
                indexAtual = Number(mini.dataset.index);
                atualizarModal();
                mostrarSlide(indexAtual);

                miniaturasModalImgs.forEach((m) => m.classList.remove("ativa"));
                mini.classList.add("ativa");
            });
        });

        miniaturas.forEach((mini) => {
            mini.addEventListener("click", () => {
                mostrarSlide(Number(mini.dataset.index));
            });
        });

        slides.forEach((slide, i) => {
            const img = slide.querySelector("img");
            img.addEventListener("click", () => {
                modal.style.display = "block";
                indexAtual = i;
                atualizarModal();

                miniaturasModalImgs.forEach((m) => m.classList.remove("ativa"));
                if (miniaturasModalImgs[indexAtual]) {
                    miniaturasModalImgs[indexAtual].classList.add("ativa");
                }
            });
        });

        fechar.addEventListener("click", () => {
            modal.style.display = "none";
        });

        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });

        let startX = 0;

        imgAmpliada.addEventListener("touchstart", (e) => {
            startX = e.touches[0].clientX;
        });

        imgAmpliada.addEventListener("touchend", (e) => {
            let endX = e.changedTouches[0].clientX;

            if (startX - endX > 50) {
                proximoSlide();
            } else if (endX - startX > 50) {
                slideAnterior();
            }
        });

        imgAmpliada.addEventListener("click", (e) => {
            const largura = imgAmpliada.clientWidth;
            const cliqueX = e.offsetX;

            if (cliqueX < largura / 2) {
                slideAnterior();
            } else {
                proximoSlide();
            }
        });

        function proximoSlide() {
            indexAtual = (indexAtual + 1) % slides.length;
            atualizarModal();
            mostrarSlide(indexAtual);
            atualizarMiniaturaModal();
        }

        function slideAnterior() {
            indexAtual = (indexAtual - 1 + slides.length) % slides.length;
            atualizarModal();
            mostrarSlide(indexAtual);
            atualizarMiniaturaModal();
        }

        function atualizarMiniaturaModal() {
            miniaturasModalImgs.forEach((m) => m.classList.remove("ativa"));
            if (miniaturasModalImgs[indexAtual]) {
                miniaturasModalImgs[indexAtual].classList.add("ativa");
            }
        }

        mostrarSlide(0);
    } catch (erro) {
        console.error("Erro ao carregar os detalhes:", erro);
        document.getElementById("detalhe-veiculo").innerHTML =
            "<p style='text-align:center; padding: 50px; color: #ff6b6b;'>Erro ao carregar os dados do veículo.</p>";
    }
}

carregarDetalhesVeiculo();

async function carregarCarrosRelacionados() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) return;

    try {
        const resposta = await fetch(`/carros/${id}/relacionados`);
        if (!resposta.ok) throw new Error("Erro ao carregar relacionados");

        const carros = await resposta.json();
        const container = document.getElementById("carros-relacionados");

        container.innerHTML = "";

        carros.forEach((carro) => {
            if (typeof criarCardCarro === "function") {
                const card = criarCardCarro(carro);
                container.appendChild(card);
            }
        });
    } catch (erro) {
        console.error("Erro ao carregar carros relacionados:", erro);
    }
}

carregarCarrosRelacionados();