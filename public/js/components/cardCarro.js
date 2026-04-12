function criarCardCarro(carro) {
    const card = document.createElement("article");
    card.classList.add("card-carro");

    // 1. Selo Abaixo da FIPE 
    let seloFipe = "";
    if (Number(carro.preco) < Number(carro.fipe)) {
        seloFipe = '<small class="selo-fipe" style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; position: absolute; top: 10px; left: 10px; z-index: 2;">Abaixo da FIPE</small>';
    }

    // Bloco de Preço e Desconto
    let blocoPreco = `<strong class="preco">R$ ${Number(carro.preco).toLocaleString('pt-BR')}</strong>`;
    if (carro.preco_antigo && Number(carro.preco) < Number(carro.preco_antigo)) {
        const percentualDesconto = Math.round(((Number(carro.preco_antigo) - Number(carro.preco)) / Number(carro.preco_antigo)) * 100);
        blocoPreco = `
            <section style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                <section style="display: flex; align-items: center; gap: 6px;">
                    <del style="color: #999; font-size: 0.85rem;">R$ ${Number(carro.preco_antigo).toLocaleString('pt-BR')}</del> 
                    <span style="background: #ffcccc; color: #cc0000; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; font-weight: bold;">-${percentualDesconto}%</span>
                </section>
                <strong class="preco" style="font-size: 1.2rem; color: #fff;">R$ ${Number(carro.preco).toLocaleString('pt-BR')}</strong>
            </section>
        `;
    }

    // Efeito na imagem caso o carro esteja vendido (Deixa a foto em preto e branco)
    const estiloImagem = carro.status === 'Vendido' 
        ? "width: 100%; height: 220px; object-fit: cover; filter: grayscale(100%) opacity(0.7);" 
        : "width: 100%; height: 220px; object-fit: cover;";

    // 2. Cria a etiqueta (badge) de Status para ir na lista inferior
    const corStatus = carro.status === 'Vendido' ? '#dc3545' : '#007bff';
    const iconeStatus = carro.status === 'Vendido' ? '<i class="fa-solid fa-tag"></i>' : '<i class="fa-solid fa-check"></i>';
    const badgeStatus = `<span style="background: ${corStatus}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; margin-left: 5px;">${iconeStatus} ${carro.status}</span>`;

    card.innerHTML = `
        <a href="detalhe-veiculo.html?id=${carro.id}" class="link-carro" style="text-decoration: none; color: inherit; display: block;">
            
            <figure style="margin: 0; position: relative;">
                ${seloFipe}
                <img src="${carro.imagem_principal}" class="foto-carro" alt="Foto do ${carro.marca} ${carro.modelo}" style="${estiloImagem}">
            </figure>

            <section class="info-carro-bar">
                <span><i class="fa-solid fa-gas-pump"></i> ${carro.Combustivel || carro.combustivel}</span>
                <span><i class="fa-solid fa-road"></i> ${carro.quilometragem} km</span>
                <span><i class="fa-solid fa-coins"></i> FIPE: R$ ${Number(carro.fipe).toLocaleString('pt-BR')}</span>
            </section>

            <header class="topo-carro" style="padding: 15px;">
                <h2 style="margin: 0 0 10px 0; font-size: 1.1rem;">${carro.marca} ${carro.modelo}</h2>
                ${blocoPreco}
            </header>

            <ul class="detalhes-lista" style="padding: 0 15px 15px 15px; margin: 0; list-style: none;">
                <li><i class="fa-solid fa-calendar"></i> ${carro.ano}</li>
                <li><span class="label-destaque">Câmbio:</span> ${carro.cambio}</li>
                <li><span class="label-destaque">Opcionais:</span> ${carro.tem_opcionais == 1 || carro.Opcionais == 1 || carro.opcionais == 1 ? 'Sim' : 'Não'}</li>
                <li><span class="label-destaque">Leilão:</span> ${carro.leilao == 1 || carro.leilao === 'Sim' || carro.leilao === true ? 'Sim' : 'Não'}</li>
                
                <li style="margin-top: 8px; border-top: 1px dashed #ccc; padding-top: 8px; display: flex; align-items: center;">
                    <span class="label-destaque">Status:</span> ${badgeStatus}
                </li>
            </ul>
        </a>
    `;

    return card;
}