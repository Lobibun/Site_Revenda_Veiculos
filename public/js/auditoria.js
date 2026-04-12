let logsGlobais = [];

// Carrega os dados assim que a página abre
document.addEventListener("DOMContentLoaded", carregarAuditoria);

async function carregarAuditoria() {
    try {
        const response = await fetch('/admin/api/auditoria');
        
        if (response.status === 403) {
            Swal.fire('Acesso Negado', 'Você não tem permissão para ver esta página.', 'error')
            .then(() => window.location.href = '/admin');
            return;
        }

        const dados = await response.json();
        logsGlobais = dados;
        renderizarTabela(logsGlobais);
    } catch (erro) {
        console.error("Erro ao carregar auditoria:", erro);
        Swal.fire('Erro', 'Não foi possível carregar os logs do sistema.', 'error');
    }
}

function renderizarTabela(logs) {
    const tbody = document.getElementById("tabelaAuditoria");
    tbody.innerHTML = "";

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 30px; color: #6c757d;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    logs.forEach((log, index) => {
        // Formatar a data (Padrão BR)
        const dataFormatada = new Date(log.data_hora).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><small style="color: #6c757d;">${dataFormatada}</small></td>
            <td><strong>${log.nome_usuario}</strong> <small style="color: #6c757d;">(ID: ${log.usuario_id})</small></td>
            <td><span class="badge-${log.acao}">${log.acao}</span></td>
            <td>${log.entidade}</td>
            <td>#${log.entidade_id}</td>
            <td class="text-center">
                <button class="btn-secundario" style="padding: 6px 12px; font-size: 14px;" onclick="verDetalhes(${index})" title="Ver o que mudou">
                    <i class="fa-solid fa-eye"></i> Ver
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarTabela() {
    const termoUsuario = document.getElementById("filtroUsuario").value.toLowerCase();
    const termoAcao = document.getElementById("filtroAcao").value;
    const termoEntidade = document.getElementById("filtroEntidade").value;
    
    // Pegando os valores das datas
    const dataInicio = document.getElementById("filtroDataInicio").value; 
    const dataFim = document.getElementById("filtroDataFim").value;

    const logsFiltrados = logsGlobais.filter(log => {
        const matchUsuario = log.nome_usuario.toLowerCase().includes(termoUsuario);
        const matchAcao = termoAcao === "" || log.acao === termoAcao;
        const matchEntidade = termoEntidade === "" || log.entidade === termoEntidade;
        
        // Lógica para filtrar por data (pegamos apenas a parte YYYY-MM-DD do banco de dados)
        let matchData = true;
        const dataLogStr = log.data_hora.substring(0, 10); 

        if (dataInicio && dataLogStr < dataInicio) {
            matchData = false; // O log é mais antigo que a data inicial
        }
        if (dataFim && dataLogStr > dataFim) {
            matchData = false; 
        }
        
        return matchUsuario && matchAcao && matchEntidade && matchData;
    });

    renderizarTabela(logsFiltrados);
}

function limparFiltros() {
    document.getElementById("filtroUsuario").value = "";
    document.getElementById("filtroAcao").value = "";
    document.getElementById("filtroEntidade").value = "";
    
    // Limpando as datas
    document.getElementById("filtroDataInicio").value = "";
    document.getElementById("filtroDataFim").value = "";
    
    renderizarTabela(logsGlobais);
}

function verDetalhes(index) {
    const log = logsGlobais[index];
    let htmlDetalhes = "Sem detalhes adicionais.";

    if (log.detalhes) {
        try {
            const objDetalhes = typeof log.detalhes === 'string' ? JSON.parse(log.detalhes) : log.detalhes;
            
            htmlDetalhes = `<div class="swal-detalhes"><ul style="padding-left: 20px; margin: 0; list-style: none;">`;
            for (const [chave, valor] of Object.entries(objDetalhes)) {
                const chaveFormatada = chave.replace(/_/g, ' ').toUpperCase();
                htmlDetalhes += `<li style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;"><strong>${chaveFormatada}:</strong> ${valor}</li>`;
            }
            htmlDetalhes += `</ul></div>`;
        } catch(e) {
            htmlDetalhes = `<div class="swal-detalhes">${log.detalhes}</div>`;
        }
    }

    Swal.fire({
        title: `Detalhes da Ação`,
        html: `
            <p style="margin-bottom: 20px; text-align: left;"><strong>Ação:</strong> ${log.acao} em ${log.entidade} #${log.entidade_id}</p>
            ${htmlDetalhes}
        `,
        icon: 'info',
        confirmButtonColor: '#000000',
        confirmButtonText: 'Fechar'
    });
}