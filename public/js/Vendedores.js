async function CarregarVendedores() {
    const list = document.getElementById("lista-vendedores");
    const params = new URLSearchParams();
    const form = document.getElementById("form-filtro-vendedores");
    
    if (form) {
        const formData = new FormData(form);
        formData.forEach((valor, chave) => {
            if (valor && valor.trim() !== "") {
                params.append(chave, valor.trim());
            }
        });
    }

    try {
        const response = await fetch(`/vendedores?${params.toString()}`);
        const vendedores = await response.json();

        list.innerHTML = "";

        if (vendedores.length === 0) {
            list.innerHTML = "<p class='msg-vazia'>Nenhum vendedor encontrado.</p>";
            return;
        }

        vendedores.forEach(vendedor => {
            const card = CriarCardVendedor(vendedor);
            list.appendChild(card);
        });

    } catch (error) {
        console.error("Erro:", error);
    }
}

// Eventos para Pesquisa em Tempo Real
document.addEventListener('DOMContentLoaded', () => {
    CarregarVendedores(); 

    const formFiltro = document.getElementById("form-filtro-vendedores");
    let timeoutBusca;

    formFiltro.addEventListener('input', () => {
        clearTimeout(timeoutBusca);
        timeoutBusca = setTimeout(() => {
            CarregarVendedores();
        }, 400); // Meio segundo de delay para não sobrecarregar o banco
    });

    formFiltro.addEventListener('reset', () => {
        setTimeout(CarregarVendedores, 10);
    });
});