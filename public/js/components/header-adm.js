window.abrirModalConfirmacao = function(titulo, mensagem, textoBotao, callback) {
    const modalAntigo = document.getElementById("modal-generico");
    if (modalAntigo) modalAntigo.remove();

    const overlay = document.createElement("div");
    overlay.id = "modal-generico";
    overlay.className = "modal-overlay";
    overlay.style.display = "flex";

    overlay.innerHTML = `
        <article class="modal-box">
            <h3>${titulo}</h3>
            <p>${mensagem}</p>
            <section class="modal-botoes">
                <button class="btn-cancelar" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn-confirmar" id="btn-confirmar-modal">${textoBotao}</button>
            </section>
        </article>
    `;

    document.body.appendChild(overlay);

    document.getElementById("btn-cancelar-modal").addEventListener("click", () => {
        overlay.remove();
    });

    document.getElementById("btn-confirmar-modal").addEventListener("click", () => {
        overlay.remove();
        callback(); 
    });
};


class CabecalhoAdmin extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <header class="topo-admin">
            <section class="logo-admin">
            <a href="/admin">
                <img src="/Img/Logo.png" alt="Logo da Revendedora" width="170" />
            </a>
            <span>Painel de Controle</span>
            </section>
            <nav class="menu-admin">
            <ul>
                <li><a href="/admin">Dashboard</a></li>
                <li><a href="/index.html" target="_blank" class="btn-ver-site">Ver Site</a></li>
                <li><a href="/logout" class="btn-logout">Sair</a></li>
            </ul>
            </nav>
        </header>
        `;

       const btnLogout = this.querySelector(".btn-logout");
        if (btnLogout) {
            btnLogout.addEventListener("click", function (e) {
                e.preventDefault();
                
                abrirModalConfirmacao(
                    "Deseja realmente sair?", 
                    "Sua sessão será encerrada e você precisará logar novamente.", 
                    "Sim, sair", 
                    () => { 
                        window.location.replace("/logout"); 
                    }
                );
            });
        }
    } 
} 

customElements.define("cabecalho-admin", CabecalhoAdmin);

class RodapeAdmin extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <footer class="rodape-admin">
            <p>&copy; 2026 Revendedora de Carros. Área Restrita. Todos os direitos reservados.</p>
        </footer>
        `;
    }
}

customElements.define("rodape-admin", RodapeAdmin);