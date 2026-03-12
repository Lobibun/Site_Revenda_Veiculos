function carregarDestaques() {

    fetch("/carros/destaques")
        .then(response => response.json())
        .then(data => {

            const container = document.getElementById('carros-destaque');
            container.innerHTML = "";

            data.forEach(carro => {

                const card = criarCardCarro(carro);
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error("Erro ao carregar carros em destaque:", error);
        });
}

carregarDestaques();
