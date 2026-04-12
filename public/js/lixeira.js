// Carrega as configurações E a tabela ao iniciar a página
document.addEventListener("DOMContentLoaded", () => {
    carregarConfiguracao();
    carregarLixeira();
});

// ==========================================
// CONFIGURAÇÕES DE LIMPEZA
// ==========================================
async function carregarConfiguracao() {
    try {
        const res = await fetch("/admin/api/configuracoes/limpeza");
        if (res.ok) {
            const dados = await res.json();
            document.getElementById("select-dias-limpeza").value = dados.dias;
        }
    } catch (erro) {
        console.error("Erro ao carregar configurações:", erro);
    }
}

async function salvarConfigLimpeza() {
    const dias = document.getElementById("select-dias-limpeza").value;
    try {
        const res = await fetch("/admin/api/configuracoes/limpeza", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dias })
        });
        const dados = await res.json();
        
        if (dados.sucesso) {
            abrirModalConfirmacao("Sucesso!", `A lixeira agora será limpa automaticamente a cada ${dias} dias.`, "Ok", () => {});
        } else {
            alert(dados.erro);
        }
    } catch (erro) {
        console.error("Erro ao salvar configuração:", erro);
    }
}

// ==========================================
// TABELA DA LIXEIRA
// ==========================================
async function carregarLixeira() {
    try {
        const resposta = await fetch("/admin/api/lixeira");
        
        if (resposta.status === 403) {
            alert("Acesso negado. Apenas administradores e gerentes podem aceder à lixeira.");
            window.location.href = "/admin"; 
            return;
        }

        if (!resposta.ok) throw new Error("Falha ao buscar lixeira");

        const itens = await resposta.json();
        renderizarTabela(itens);
    } catch (erro) {
        console.error("Erro ao carregar lixeira:", erro);
        document.getElementById("tabela-lixeira").innerHTML = `
            <tr><td colspan="4" class="mensagem-tabela" style="color: #a00b0b;">Erro ao carregar os dados.</td></tr>
        `;
    }
}

function renderizarTabela(itens) {
    const tbody = document.getElementById("tabela-lixeira");
    tbody.innerHTML = "";

    if (itens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="mensagem-tabela">A lixeira está vazia neste momento.</td></tr>`;
        return;
    }

    itens.forEach(item => {
        const tr = document.createElement("tr");
        
        const dataDeletado = new Date(item.deletado_em).toLocaleDateString("pt-BR", {
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute:'2-digit'
        });

        let infoTipo = "";
        if (item.tipo === "carro") {
            infoTipo = `<span class="badge-tipo badge-carro">🚗 Veículo</span>`;
        } else if (item.tipo === "vendedor") {
            infoTipo = `<span class="badge-tipo badge-vendedor">👔 Vendedor</span>`;
        } else {
            infoTipo = `<span class="badge-tipo badge-usuario">👤 Usuário</span>`;
        }

        // Trocámos a <div> por <nav> aqui:
        tr.innerHTML = `
            <td>${infoTipo}</td>
            <td style="font-weight: 500;">${item.nome}</td>
            <td>${dataDeletado}</td>
            <td class="coluna-acoes">
                <nav class="acoes-flex">
                    <button onclick="restaurarItem('${item.tipo}', '${item.id}')" class="btn-restaurar">♻️ Restaurar</button>
                    <button onclick="excluirDefinitivo('${item.tipo}', '${item.id}')" class="btn-vermelho">🗑️ Excluir Definitivo</button>
                </nav>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function restaurarItem(tipo, id) {
    abrirModalConfirmacao(
        "Restaurar Item", 
        "Deseja recuperar este item da lixeira e devolvê-lo ao sistema?", 
        "Sim, Restaurar", 
        async () => {
            try {
                const res = await fetch(`/admin/api/lixeira/restaurar/${tipo}/${id}`, { method: "PUT" });
                const dados = await res.json();
                if (dados.sucesso) {
                    carregarLixeira();
                } else {
                    alert(dados.erro || "Erro ao restaurar.");
                }
            } catch (erro) {
                console.error("Erro ao restaurar:", erro);
            }
        }
    );
}

function excluirDefinitivo(tipo, id) {
    abrirModalConfirmacao(
        "Exclusão Permanente", 
        "ATENÇÃO: Esta ação não pode ser desfeita. Todos os dados e as pastas de imagens serão apagados do servidor. Continuar?", 
        "Sim, Excluir", 
        async () => {
            try {
                const res = await fetch(`/admin/api/lixeira/excluir/${tipo}/${id}`, { method: "DELETE" });
                const dados = await res.json();
                if (dados.sucesso) {
                    carregarLixeira();
                } else {
                    alert(dados.erro || "Erro ao excluir.");
                }
            } catch (erro) {
                console.error("Erro ao excluir definitivamente:", erro);
            }
        }
    );
}