class Cabecalho extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <header class="topo-site" id="header-publico">
            <a href="index.html">
                <img src="Img/Logo.png" alt="Logo da Revendedora" width="170" />
            </a>

            <nav class="menu-principal">
                <ul id="lista-menu-principal">
                    <li><a href="index.html">Home</a></li>
                    <li><a href="carros.html">Carros</a></li>
                    <li><a href="vendedores.html">Vendedores</a></li>
                    <li><a href="sobre.html">Sobre nós</a></li>
                    <li><a href="contato.html">Contato</a></li>
                </ul>
            </nav>
        </header>
        `;

        // ==========================================
        // LÓGICA 1: MOSTRAR BOTÃO SE ESTIVER LOGADO
        // ==========================================
        fetch("/admin/me")
            .then((response) => {
                // Se der erro 401 (Não autorizado), significa que não está logado. Retorna null.
                if (!response.ok) return null;
                return response.json();
            })
            .then((usuario) => {
                if (usuario) {
                    // Usuário está logado! Cria um link extra no menu.
                    const menuLista = this.querySelector("#lista-menu-principal");
                    const liAdmin = document.createElement("li");
                    
                    liAdmin.innerHTML = `
                        <a href="/admin" style="color: var(--cor-primaria, #a00b0b); font-weight: bold;">
                            <i class="fas fa-gauge"></i> Painel Admin
                        </a>
                    `;
                    menuLista.appendChild(liAdmin);
                }
            })
            .catch(() => {
                // Falha silenciosa: visitante comum não vê nada de diferente.
            });

        // ==========================================
        // LÓGICA 2: CABEÇALHO QUE ESCONDE E APARECE
        // ==========================================
        let ultimoScroll = 0;
        const header = this.querySelector("#header-publico");

        window.addEventListener("scroll", () => {
            // Pega a posição atual da rolagem da página
            const scrollAtual = window.pageYOffset || document.documentElement.scrollTop;

            // Se rolou para baixo e passou de 100px (para não bugar no topo)
            if (scrollAtual > ultimoScroll && scrollAtual > 100) {
                // Esconde o cabeçalho jogando ele para cima da tela
                header.style.transform = "translateY(-100%)";
            } else {
                // Se rolou para cima, mostra o cabeçalho novamente
                header.style.transform = "translateY(0)";
            }

            // Adiciona uma sombra suave quando não está no topo absoluto
            if (scrollAtual === 0) {
                header.style.boxShadow = "none";
            } else {
                header.style.boxShadow = "0 4px 10px rgba(0,0,0,0.5)";
            }

            // Atualiza a última posição
            ultimoScroll = scrollAtual <= 0 ? 0 : scrollAtual;
        });
    }
}

customElements.define("cabecalho-site", Cabecalho);