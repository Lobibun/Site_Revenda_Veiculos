function criarCardCarro(carro) {
    const card = document.createElement("article");
    card.classList.add("card-carro");

    // 1. Selo Abaixo da FIPE 
    let seloFipe = "";
    if (Number(carro.preco) < Number(carro.fipe)) {
        seloFipe = '<small class="selo-fipe" style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; position: absolute; top: 10px; left: 10px; z-index: 2;">Abaixo da FIPE</small>';
    }

    // 2. Bloco de Preço COMPACTO (Tudo na mesma linha)
    let blocoPreco = `<strong style="font-size: 1.3rem; color: #fff; display: block;">R$ ${Number(carro.preco).toLocaleString('pt-BR')}</strong>`;
    
    if (carro.preco_antigo && Number(carro.preco) < Number(carro.preco_antigo)) {
        const percentualDesconto = Math.round(((Number(carro.preco_antigo) - Number(carro.preco)) / Number(carro.preco_antigo)) * 100);
        blocoPreco = `
            <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                <strong style="font-size: 1.3rem; color: #fff;">R$ ${Number(carro.preco).toLocaleString('pt-BR')}</strong>
                <del style="color: #888; font-size: 0.85rem;">R$ ${Number(carro.preco_antigo).toLocaleString('pt-BR')}</del> 
                <span style="background: var(--cor-primaria, #a00b0b); color: white; font-size: 0.7rem; padding: 2px 5px; border-radius: 4px; font-weight: bold;">-${percentualDesconto}%</span>
            </div>
        `;
    }

    // 3. Efeito na imagem caso o carro esteja vendido
    const estiloImagem = carro.status === 'Vendido' 
        ? "width: 100%; height: 200px; object-fit: cover; filter: grayscale(100%) opacity(0.7);" 
        : "width: 100%; height: 200px; object-fit: cover;";

    // 4. Etiqueta (badge) de Status
    const corStatus = carro.status === 'Vendido' ? '#dc3545' : '#007bff';
    const iconeStatus = carro.status === 'Vendido' ? '<i class="fa-solid fa-tag"></i>' : '<i class="fa-solid fa-check"></i>';
    const badgeStatus = `<span style="background: ${corStatus}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; margin-left: 5px;">${iconeStatus} ${carro.status}</span>`;

    card.innerHTML = `
        <a href="detalhe-veiculo.html?id=${carro.id}" class="link-carro">
            
            <figure style="margin: 0; position: relative;">
                ${seloFipe}
                <img src="${carro.imagem_principal}" class="foto-carro" alt="Foto do ${carro.marca} ${carro.modelo}" style="${estiloImagem}">
            </figure>

            <section class="info-carro-bar">
                <span><i class="fa-solid fa-gas-pump"></i> ${carro.Combustivel || carro.combustivel}</span>
                <span><i class="fa-solid fa-road"></i> ${carro.quilometragem} km</span>
            </section>

            <header class="topo-carro">
                <h2>${carro.marca} ${carro.modelo}</h2>
                ${blocoPreco}
            </header>

            <ul class="detalhes-lista">
                <li><i class="fa-solid fa-calendar"></i> ${carro.ano}</li>
                <li><span class="label-destaque">Câmbio:</span> ${carro.cambio}</li>
                <li><span class="label-destaque">Opcionais:</span> ${carro.tem_opcionais == 1 || carro.Opcionais == 1 || carro.opcionais == 1 ? 'Sim' : 'Não'}</li>
                <li><span class="label-destaque">Leilão:</span> ${carro.leilao == 1 || carro.leilao === 'Sim' || carro.leilao === true ? 'Sim' : 'Não'}</li>
                
                <li class="linha-status">
                    <span class="label-destaque">Status:</span> ${badgeStatus}
                </li>
            </ul>
        </a>
    `;

    return card;
}