async function  carregarDetalhesVeiculo() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) return;

    const resposta = await fetch(`/carros/${id}`);
    const carro = await resposta.json();

    const container = document.getElementById("detalhe-veiculo");
    const miniaturasModal = document.getElementById("miniaturas-modal");
    const fotosHTML = carro.fotos.length
    ? carro.fotos.map(f => `
        <li class="slide">
            <img src="${f.caminho}" alt="${carro.marca} ${carro.modelo}">
        </li>
        `).join("")
        : `<li class="slide">
            <img src="${carro.imagem_principal}" alt="${carro.marca} ${carro.modelo}">
            </li>`;

    const listaOpcionais = carro.opcionais.length
    ? carro.opcionais.map(op => `<li>${op.nome}</li>`).join("")
    : "<li>Sem opcionais informados</li>";

    const miniaturasHTML = carro.fotos.length  
    ? carro.fotos.map((f, i) => `
        <img src="${f.caminho}" class="miniatura" data-index="${i}" alt="${carro.marca} ${carro.modelo}">
    `).join("")
    : `<img src="${carro.imagem_principal}" class="miniatura" data-index="0" alt="${carro.marca} ${carro.modelo}">`;

    const miniaturasModalHTML = carro.fotos.length  
    ? carro.fotos.map((f, i) => `
    <img src="${f.caminho}" data-index="${i}">
    `).join("")
:   `<img src="${carro.imagem_principal}" data-index="0">`;    

    container.innerHTML = `
    <article class="veiculo-detalhe">

        <header class="titulo-veiculo">
            <h1>${carro.marca} ${carro.modelo}</h1>
        </header>    
    
    <section class="carrossel">
        <ul class="slides">
            ${fotosHTML}
        </ul>
    </section>
    <section class="miniaturas">
        ${miniaturasHTML}
    </section>

        <p class="preco-status">
            <span class="preco-detalhe">
                R$ ${Number(carro.preco).toLocaleString('pt-BR')}
            </span>
            <span class="status ${carro.status === 'Disponível' ? 'disponivel' : 'vendido'}">
                ${carro.status}
            </span>
        </p>

    <section class="info-veiculo">
        <h2>Detalhes do Veículo</h2>
        <ul class="detalhes-detalhe">
            <li><strong>Ano:</strong> ${carro.ano}</li>
            <li><strong>Quilometragem:</strong> ${carro.quilometragem} km</li>
            <li><strong>Combustível:</strong> ${carro.Combustivel}</li>
            <li><strong>Câmbio:</strong> ${carro.cambio}</li>
            <li><strong>FIPE:</strong> R$ ${Number(carro.fipe).toLocaleString('pt-BR')}</li>
            <li><strong>Leilão:</strong> ${carro.leilao ? "Sim" : "Não"}</li>
        </ul>

    </section>
    
    <section class="opcionais">
        <h2>Opcionais</h2>
        <ul class="opcionais-lista">
            ${carro.opcionais.length
            ? carro.opcionais.map(op => `
                <li>${op.nome}</li>
            `).join("")
            : "<li>Sem opcionais informados</li>"}
        </ul>
    </section>
</article>

 `;
    
let indexAtual = 0;

const slides = container.querySelectorAll(".slide");
const miniaturas = container.querySelectorAll(".miniatura");
miniaturasModal.innerHTML = miniaturasModalHTML;
// MODAL
const modal = document.getElementById("modal-imagem");
const imgAmpliada = document.getElementById("img-ampliada");
const fechar = document.querySelector(".fechar");

const miniaturasModalImgs = miniaturasModal.querySelectorAll("img");

miniaturasModalImgs.forEach(mini => {
    mini.addEventListener("click", () => {
        indexAtual = Number(mini.dataset.index);
        atualizarModal();
        mostrarSlide(indexAtual);

        // atualizar destaque
        miniaturasModalImgs.forEach(m => m.classList.remove("ativa"));
        mini.classList.add("ativa");
    });
});

// MOSTRAR SLIDE
function mostrarSlide(index) {
    slides.forEach((slide, i) => {
        slide.style.display = i === index ? "flex" : "none";
    });

    miniaturas.forEach((mini, i) => {
        mini.classList.toggle("ativa", i === index);
    });

    indexAtual = index;
}

// CLIQUE NAS MINIATURAS
miniaturas.forEach(mini => {
    mini.addEventListener("click", () => {
        mostrarSlide(Number(mini.dataset.index));
    });
});

// ABRIR MODAL AO CLICAR NA IMAGEM
slides.forEach((slide, i) => {
    const img = slide.querySelector("img");

    img.addEventListener("click", () => {
        modal.style.display = "block";
        indexAtual = i;
        atualizarModal();
    });
});

// ATUALIZA IMAGEM DO MODAL
function atualizarModal() {
    const imgAtual = slides[indexAtual].querySelector("img");
    imgAmpliada.src = imgAtual.src;
}

// FECHAR MODAL
fechar.addEventListener("click", () => {
    modal.style.display = "none";
});

modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});


// 👉 SWIPE (ARRASTAR)
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

// 👉 CLICK ESQUERDA/DIREITA (DESKTOP)
imgAmpliada.addEventListener("click", (e) => {
    const largura = imgAmpliada.clientWidth;
    const cliqueX = e.offsetX;

    if (cliqueX < largura / 2) {
        slideAnterior();
    } else {
        proximoSlide();
    }
});

// FUNÇÕES DE NAVEGAÇÃO
function proximoSlide() {
    indexAtual = (indexAtual + 1) % slides.length;
    atualizarModal();
    mostrarSlide(indexAtual);
}

function slideAnterior() {
    indexAtual = (indexAtual - 1 + slides.length) % slides.length;
    atualizarModal();
    mostrarSlide(indexAtual);
}

// iniciar
mostrarSlide(0);

 }

    carregarDetalhesVeiculo();


async function carregarCarrosRelacionados() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) return;

    const resposta = await fetch(`/carros/${id}/relacionados`);
    const carros = await resposta.json();

    const container = document.getElementById("carros-relacionados");

    container.innerHTML = "";

    carros.forEach(carro => {
        const card = criarCardCarro(carro);
        container.appendChild(card);
    });

}

carregarCarrosRelacionados();

