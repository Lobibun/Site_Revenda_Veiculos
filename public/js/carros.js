let paginaAtual = 1;

function carregarCarros() {
    const params = new URLSearchParams();
    params.append("pagina", paginaAtual);

    // 1. Pega o formulário
    const form = document.getElementById("form-filtro");
    
    // 2. Se o formulário existir na tela, extrai os dados
    if (form) {
        const formData = new FormData(form);
        formData.forEach((valor, chave) => {
            // Ignora campos vazios e remove espaços desnecessários
            if (valor && valor.trim() !== "") {
                params.append(chave, valor.trim());
            }
        });
    }

    // 3. Monta a URL final
    const urlFinal = `/carros?${params.toString()}`;
    
    // RAIO-X: Isso vai aparecer no F12 para sabermos se o JS está funcionando!
    console.log("🔎 URL DE BUSCA:", urlFinal); 

    // 4. Faz a requisição ao servidor
    fetch(urlFinal)
        .then(response => response.json())
        .then(data => {
            const list = document.getElementById("lista-carros");
            list.innerHTML = "";

            // Prevenção extra caso venha indefinido
            if (!data.carros || data.carros.length === 0) {
                list.innerHTML = "<p class='mensagem-vazia'>Nenhum veículo encontrado com estes filtros.</p>";
            } else {
                data.carros.forEach(carro => {
                    const card = criarCardCarro(carro);
                    list.appendChild(card);
                });
            }

            criarPaginacao(data.totalPaginas);
        })
        .catch(error => {
            console.error('❌ Erro ao carregar carros:', error);
        });
}

function criarPaginacao(totalPaginas){
    const paginacao = document.getElementById("paginacao");
    paginacao.innerHTML = "";
    
    // Removido o `if(totalPaginas <= 1) return;` para que o botão da página 1 sempre apareça.

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

    // PÁGINAS DO MEIO (Isso agora garante que o "1" seja renderizado mesmo se for só 1 página)
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

// Configurar os eventos do filtro depois que a página carregar
document.addEventListener('DOMContentLoaded', () => {
    const formFiltro = document.getElementById("form-filtro");
    
    if(formFiltro){
        let timeoutBusca; // Variável para controlar o "atraso" da pesquisa

        // O evento 'input' detecta qualquer tecla digitada e qualquer troca no select (marca)
        formFiltro.addEventListener('input', (e) => {
            // Cancela a busca anterior se o usuário ainda estiver digitando rápido
            clearTimeout(timeoutBusca); 
            
            // Aguarda meio segundo (500ms) após o usuário parar de digitar para ir no servidor
            timeoutBusca = setTimeout(() => {
                paginaAtual = 1; // Sempre volta para a página 1 ao fazer nova busca
                carregarCarros();
            }, 500); 
        });

        // Impede que o form recarregue a página caso alguém aperte a tecla "Enter"
        formFiltro.addEventListener('submit', (e) => {
            e.preventDefault(); 
        });

        // Quando clicar em 'Limpar'
        formFiltro.addEventListener('reset', () => {
            setTimeout(() => {
                paginaAtual = 1;
                carregarCarros();
            }, 10);
        });
    }
});

// Chamada inicial
carregarCarros();