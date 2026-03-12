let paginaAtual = 1;

function carregarCarros(){

fetch(`/carros?pagina=${paginaAtual}`)
.then(response => response.json())
.then(data => {

const list = document.getElementById("lista-carros");

list.innerHTML = "";

const carros = data.carros;

carros.forEach(carro => {

const card = criarCardCarro(carro);

list.appendChild(card);

});

criarPaginacao(data.totalPaginas);

})
.catch(error => {
console.error('Erro ao carregar carros:', error);
});

}



function criarPaginacao(totalPaginas){

const paginacao = document.getElementById("paginacao");
paginacao.innerHTML = "";

// BOTÃO ANTERIOR
if(paginaAtual > 1){
    const prev = document.createElement("button");
    prev.textContent = "◀";

    prev.onclick = () => {
        paginaAtual--;
        carregarCarros();
    };

    paginacao.appendChild(prev);
}

let inicio = Math.max(1, paginaAtual - 2);
let fim = Math.min(totalPaginas, paginaAtual + 2);

// PRIMEIRA PÁGINA
if(inicio > 1){
    const btn = document.createElement("button");
    btn.textContent = 1;

    btn.onclick = () => {
        paginaAtual = 1;
        carregarCarros();
    };

    paginacao.appendChild(btn);

    if(inicio > 2){
        const dots = document.createElement("span");
        dots.textContent = "...";
        paginacao.appendChild(dots);
    }
}

// PÁGINAS DO MEIO
for(let i = inicio; i <= fim; i++){

    const btn = document.createElement("button");
    btn.textContent = i;

    if(i === paginaAtual){
        btn.classList.add("pagina-atual");
    }

    btn.onclick = () => {
        paginaAtual = i;
        carregarCarros();
    };

    paginacao.appendChild(btn);
}

// ÚLTIMA PÁGINA
if(fim < totalPaginas){

    if(fim < totalPaginas - 1){
        const dots = document.createElement("span");
        dots.textContent = "...";
        paginacao.appendChild(dots);
    }

    const btn = document.createElement("button");
    btn.textContent = totalPaginas;

    btn.onclick = () => {
        paginaAtual = totalPaginas;
        carregarCarros();
    };

    paginacao.appendChild(btn);
}

// BOTÃO PRÓXIMO
if(paginaAtual < totalPaginas){

    const next = document.createElement("button");
    next.textContent = "▶";

    next.onclick = () => {
        paginaAtual++;
        carregarCarros();
    };

    paginacao.appendChild(next);
}

}

carregarCarros();