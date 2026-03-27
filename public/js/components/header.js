class Cabecalho extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <header class="topo-site">
            <a href="index.html">
                <img src="Img/Logo.png" alt="Logo da Revendedora" width="170" />
            </a>

            <nav class="menu-principal">
                <ul>
                    <li><a href="index.html">Home</a></li>
                    <li><a href="carros.html">Carros</a></li>
                    <li><a href="vendedores.html">Vendedores</a></li>
                    <li><a href="sobre.html">Sobre nós</a></li>
                    <li><a href="contato.html">Contato</a></li>
                </ul>
            </nav>
        </header>
        `;
    }
}

customElements.define("cabecalho-site", Cabecalho);