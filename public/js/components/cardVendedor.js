function CriarCardVendedor(vendedor) {
    const card = document.createElement("article");
    card.classList.add("card-vendedor");

    // Limpa o telefone: remove tudo que não for número
    let telefoneLimpo = vendedor.telefone.replace(/\D/g, '');
    
    // Adiciona o código do Brasil (55) na frente, se não tiver
    if (!telefoneLimpo.startsWith('55')) {
        telefoneLimpo = '55' + telefoneLimpo;
    }

    // Cria a mensagem padrão que vai aparecer quando abrir o Zap
    const mensagemPadrao = encodeURIComponent(`Olá ${vendedor.nome}! Gostaria de informações sobre os veículos da loja.`);
    const linkZap = `https://wa.me/${telefoneLimpo}?text=${mensagemPadrao}`;

    // Imagem padrão caso o vendedor não tenha foto cadastrada
    const fotoCaminho = vendedor.foto ? vendedor.foto : "img/vendedores/padrao.jpg";

    card.innerHTML = `
        <figure class="foto-container">
            <img src="${fotoCaminho}" class="foto-vendedor" alt="Foto do ${vendedor.nome}">
        </figure>

        <section class="info-vendedor">
            <h2>${vendedor.nome}</h2>
            <p><i class="fa-solid fa-phone"></i> ${vendedor.telefone}</p>
            <p><i class="fa-solid fa-envelope"></i> ${vendedor.email}</p>
            
            <a href="${linkZap}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
                <i class="fa-brands fa-whatsapp"></i> Chamar no WhatsApp
            </a>
        </section>
    `;
    return card;
}