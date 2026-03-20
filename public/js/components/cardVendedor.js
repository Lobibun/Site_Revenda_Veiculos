function CriarCardVendedor(vendedor) {
    const card = document.createElement("article");
    card.classList.add("card-vendedor");

    card.innerHTML = `
<a href="detalhe-vendedor.html?id=${vendedor.id}" class="link-vendedor">
<img src="${vendedor.foto}" class="foto-vendedor" alt="Foto do ${vendedor.nome}">

<article class="barra"></article>

<section class="info-vendedor">

<h2>${vendedor.nome}</h2>
<p><i class="fa-solid fa-phone"></i> ${vendedor.telefone}</p>
<p><i class="fa-solid fa-envelope"></i> ${vendedor.email}</p>
</section>
</a>
`;
    return card;

}