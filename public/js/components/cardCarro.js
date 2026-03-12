function criarCardCarro(carro){

const card = document.createElement("article");
card.classList.add("card-carro");

let selo = "";

if (Number(carro.preco) < Number(carro.fipe)) {
    selo = '<span class="selo-fipe">Abaixo da FIPE</span>';
}

card.innerHTML = `
<img src="${carro.imagem_principal}" class="foto-carro" alt="Foto do ${carro.marca} ${carro.modelo}">

<p class="info-carro-bar">
<span><i class="fa-solid fa-gas-pump"></i> ${carro.Combustivel}</span>
<span><i class="fa-solid fa-road"></i> ${carro.quilometragem} km</span>
<span><i class="fa-solid fa-coins"></i> FIPE: R$ ${Number(carro.fipe).toLocaleString('pt-BR')}</span>
</p>

<div class="topo-carro">
<h2>${carro.marca} ${carro.modelo}</h2>
<span class="preco">R$ ${Number(carro.preco).toLocaleString('pt-BR')}</span>
</div>

<ul class="detalhes-lista">
<li><i class="fa-solid fa-calendar"></i> ${carro.ano}</li>
<li>Câmbio: ${carro.cambio}</li>
<li><span class="label-destaque">Opcionais:</span> ${carro.Opcionais ? 'Sim' : 'Não'}</li>
<li><span class="label-destaque">Leilão:</span> ${carro.leilao ? 'Sim' : 'Não'}</li>
</ul>
`;

return card;

}