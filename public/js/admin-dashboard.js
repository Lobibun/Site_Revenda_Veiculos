document.addEventListener("DOMContentLoaded", () => {
    // Carrega os números lá de cima
    carregarEstatisticasDashboard();
    
    // Verifica quem está logado e aplica as regras visualmente
    aplicarPermissoes();
});

// ==========================================
// 1. CARREGAR ESTATÍSTICAS
// ==========================================
async function carregarEstatisticasDashboard() {
    try {
        const resposta = await fetch("/admin/api/estatisticas");
        
        if (resposta.ok) {
            const dados = await resposta.json();
            
            // Preenche os campos numéricos
            document.getElementById("stat-estoque").textContent = dados.estoque;
            document.getElementById("stat-vendidos").textContent = dados.vendidos;
            document.getElementById("stat-vendedores").textContent = dados.vendedores;
            document.getElementById("stat-mensagens").textContent = dados.mensagens_nao_lidas;
        } else {
            console.error("Erro ao carregar estatísticas.");
            marcarErroNasEstatisticas();
        }
    } catch (erro) {
        console.error("Falha de comunicação:", erro);
        marcarErroNasEstatisticas();
    }
}

function marcarErroNasEstatisticas() {
    document.getElementById("stat-estoque").textContent = "-";
    document.getElementById("stat-vendidos").textContent = "-";
    document.getElementById("stat-vendedores").textContent = "-";
    document.getElementById("stat-mensagens").textContent = "-";
}

// ==========================================
// 2. APLICAR PERMISSÕES (ESCONDER CARTÕES)
// ==========================================
async function aplicarPermissoes() {
    try {
        // Usa a mesma rota do seu header para saber quem está logado
        const resposta = await fetch("/admin/me"); 
        
        if (resposta.ok) {
            const usuario = await resposta.json();
            
            // Verifica se o nível do usuário logado é 'vendedor'
            if (usuario && usuario.nivel === "vendedor") {
                
                // Busca os cartões através dos IDs que colocamos no HTML
                const cardLixeira = document.getElementById("card-lixeira");
                const cardUsuarios = document.getElementById("card-usuarios");
                const cardAuditoria = document.getElementById("card-auditoria");

                // Esconde eles da tela!
                if (cardLixeira) cardLixeira.style.display = "none";
                if (cardUsuarios) cardUsuarios.style.display = "none";
                if (cardAuditoria) cardAuditoria.style.display = "none";
            }
        }
    } catch (erro) {
        console.error("Erro ao verificar permissões no dashboard: ", erro);
    }
}