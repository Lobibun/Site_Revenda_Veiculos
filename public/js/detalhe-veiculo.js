async function  carregarDetalhesVeiculo() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) return;

    const resposta = await fetch(`/carros/${id}`);
    const carro = await resposta.json();

    const container = document.getElementById("detalhe-veiculo");

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

    container.innerHTML = `

    <article class="veiculo-detalhe">

        <header class="titulo-veiculo">
            <h1>${carro.marca} ${carro.modelo}</h1>
        </header>    
    
    <section class="carrossel">

        <button class="btn-carrossel" id="anterior">
            <i class="fa-solid fa-chevron-left"></i>
        </button>

        <ul class="slides">
            ${fotosHTML}
        </ul>

         <button class="btn-carrossel" id="proximo">
             <i class="fa-solid fa-chevron-right"></i>
        </button>

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
    
 }

    carregarDetalhesVeiculo();