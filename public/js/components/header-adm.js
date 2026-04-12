window.abrirModalConfirmacao = function (
    titulo,
    mensagem,
    textoBotao,
    callback,
) {
    const modalAntigo = document.getElementById("modal-generico");
    if (modalAntigo) modalAntigo.remove();

    const overlay = document.createElement("div");
    overlay.id = "modal-generico";
    overlay.className = "modal-overlay";
    overlay.style.display = "flex";

    overlay.innerHTML = `
        <article class="modal-box" style="text-align: center;">
            <h3 style="margin-bottom: 10px; color: var(--cor-primaria);">${titulo}</h3>
            <p style="margin-bottom: 25px; color: var(--cor-texto); font-size: 16px;">${mensagem}</p>
            <section style="display: flex; gap: 15px; justify-content: center;">
                <button class="btn-secundario" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn-vermelho" id="btn-confirmar-modal">${textoBotao}</button>
            </section>
        </article>
    `;

    document.body.appendChild(overlay);

    document
        .getElementById("btn-cancelar-modal")
        .addEventListener("click", () => {
            overlay.remove();
        });

    document
        .getElementById("btn-confirmar-modal")
        .addEventListener("click", () => {
            if (callback) callback();
            overlay.remove();
        });
};

class CabecalhoAdmin extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <header class="topo-admin" id="header-admin">
            <section class="logo-admin">
            <a href="/admin">
                <img src="/Img/Logo.png" alt="Logo da Revendedora" width="170" />
            </a>
            <span>Painel de Controle</span>
            </section>
            <nav class="menu-admin">
                <ul>
                    <li><a href="/admin">Dashboard</a></li>

                    <li class="dropdown">
                        <a href="javascript:void(0)" class="dropbtn">Veículos ▾</a>
                        <ul class="dropdown-content">
                            <li><a href="/admin/adicionar">Adicionar Veículo</a></li>
                            <li><a href="/admin/gerenciar-carros">Gerenciar Veículos</a></li>
                        </ul>
                    </li>

                    <li class="dropdown" id="menu-vendedores">
                        <a href="javascript:void(0)" class="dropbtn">Vendedores ▾</a>
                        <ul class="dropdown-content">
                            <li><a href="/admin/adicionar-vendedor">Adicionar Vendedor</a></li>
                            <li><a href="/admin/modificar-vendedores">Gerenciar Vendedores</a></li>
                        </ul>
                    </li>

                    <li class="dropdown" id="menu-sistema">
                        <a href="javascript:void(0)" class="dropbtn" style="display: flex; align-items: center; gap: 5px;">
                            Sistema ▾
                            <span id="badge-sistema-principal" style="display: none; background: #e74c3c; color: #fff; padding: 2px 6px; border-radius: 10px; font-size: 11px; font-weight: bold;">0</span>
                        </a>
                        <ul class="dropdown-content">
                            <li>
                                <a href="/admin/mensagens" style="display: flex; justify-content: space-between; align-items: center;">
                                    Mensagens
                                    <span id="badge-sistema-dropdown" style="display: none; background: #e74c3c; color: #fff; padding: 2px 6px; border-radius: 10px; font-size: 11px; font-weight: bold;">0</span>
                                </a>
                            </li>
                            <li class="item-restrito-sistema"><a href="/admin/usuarios">Usuários do Sistema</a></li>
                            <li class="item-restrito-sistema"><a href="/admin/auditoria">Auditoria</a></li>
                            <li class="item-restrito-sistema"><a href="/admin/lixeira">Lixeira</a></li>
                        </ul>
                    </li>

                    <li><a href="/admin/historico-vendas">Histórico</a></li>
                    <li><a href="/admin/perfil">Meu Perfil</a></li> 
                    <li><a href="/" class="btn-ver-site" target="_blank">Ver Site</a></li>
                    <li><a href="/logout" class="btn-logout">Sair</a></li>
                </ul>
            </nav>
        </header>
        `;

        // 1. Lógica de Nível de Acesso (Agora esconde apenas os itens restritos do Sistema)
        fetch("/admin/me")
            .then((response) => {
                if (!response.ok) return null;
                return response.json();
            })
            .then((usuario) => {
                if (usuario && usuario.nivel === "vendedor") {
                    

                    // Oculta apenas as opções restritas dentro de Sistema
                    const itensRestritos = this.querySelectorAll(".item-restrito-sistema");
                    itensRestritos.forEach(item => {
                        item.style.display = "none";
                    });
                }
            })
            .catch((erro) =>
                console.warn("Aviso: Sessão expirada ou usuário não encontrado."),
            );

        // 2. Lógica para buscar Mensagens Não Lidas (Atualiza as duas bolinhas)
        fetch("/admin/api/mensagens/nao-lidas")
            .then((response) => {
                if (response.ok) return response.json();
                return { total: 0 };
            })
            .then((dados) => {
                const badgePrincipal = this.querySelector("#badge-sistema-principal");
                const badgeDropdown = this.querySelector("#badge-sistema-dropdown");
                
                if (dados.total > 0) {
                    if (badgePrincipal) {
                        badgePrincipal.textContent = dados.total;
                        badgePrincipal.style.display = "inline-block";
                    }
                    if (badgeDropdown) {
                        badgeDropdown.textContent = dados.total;
                        badgeDropdown.style.display = "inline-block";
                    }
                }
            })
            .catch(() => {
                console.warn("Não foi possível carregar a notificação de mensagens.");
            });

        // 3. Lógica de Logout
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
                    },
                );
            });
        }

        // 4. Lógica de Cabeçalho Inteligente
        let ultimoScroll = 0;
        const header = this.querySelector("#header-admin");

        window.addEventListener("scroll", () => {
            const scrollAtual = window.pageYOffset || document.documentElement.scrollTop;

            if (scrollAtual > ultimoScroll && scrollAtual > 100) {
                header.style.transform = "translateY(-100%)";
            } else {
                header.style.transform = "translateY(0)";
            }

            if (scrollAtual > 0) {
                header.style.boxShadow = "0 4px 15px rgba(0,0,0,0.6)";
            } else {
                header.style.boxShadow = "none";
            }
            ultimoScroll = scrollAtual <= 0 ? 0 : scrollAtual;
        });
    }
}

customElements.define("cabecalho-admin", CabecalhoAdmin);
customElements.define("rodape-admin", class extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <footer class="rodape-admin">
            <p>&copy; 2026 Revendedora de Carros. Área Restrita. Todos os direitos reservados.</p>
        </footer>
        `;
    }
});