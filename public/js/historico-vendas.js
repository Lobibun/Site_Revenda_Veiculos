document.addEventListener("DOMContentLoaded", () => {
    // 1. Carrega o número de dias salvo no banco e coloca na caixinha
    carregarConfiguracaoDias();
    
    // 2. Carrega a tabela com os carros vendidos
    carregarHistoricoVendas();
});

// ==========================================
// CONFIGURAÇÃO DE DIAS DE EXIBIÇÃO
// ==========================================

async function carregarConfiguracaoDias() {
    try {
        const resposta = await fetch("/admin/api/configuracoes/vendas");
        if (resposta.ok) {
            const dados = await resposta.json();
            const inputDias = document.getElementById("input-dias-exibicao");
            if (inputDias) {
                // Preenche o input com o valor que já estava salvo no banco!
                inputDias.value = dados.dias;
            }
        }
    } catch (erro) {
        console.error("Erro ao carregar a configuração de dias:", erro);
    }
}

window.salvarConfiguracaoDias = async function() {
    const inputDias = document.getElementById("input-dias-exibicao");
    const dias = parseInt(inputDias.value);

    if (isNaN(dias) || dias < 0) {
        Swal.fire("Atenção", "Por favor, insira um número válido de dias (0 ou mais).", "warning");
        return;
    }

    const btnSalvar = document.querySelector(".config-acao button");
    btnSalvar.textContent = "Salvando...";
    btnSalvar.disabled = true;

    try {
        const resposta = await fetch("/admin/api/configuracoes/vendas", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ dias: dias })
        });

        if (resposta.ok) {
            Swal.fire("Salvo!", "O tempo de exibição foi atualizado com sucesso.", "success");
        } else {
            Swal.fire("Erro", "Não foi possível salvar a configuração.", "error");
        }
    } catch (erro) {
        console.error("Erro ao salvar configuração:", erro);
        Swal.fire("Erro", "Falha de comunicação com o servidor.", "error");
    } finally {
        btnSalvar.textContent = "Salvar";
        btnSalvar.disabled = false;
    }
};

// ==========================================
// TABELA DE HISTÓRICO DE VENDAS
// ==========================================

async function carregarHistoricoVendas() {
    const tbody = document.getElementById("tabela-vendas");
    if (!tbody) return;

    try {
        // Puxa a lista de TODOS os carros com status = 'Vendido' do backend
        const resposta = await fetch("/admin/api/vendas/historico"); 
        
        if (!resposta.ok) throw new Error("Falha ao buscar histórico");
        
        const vendas = await resposta.json();
        
        if (vendas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="mensagem-tabela">Nenhuma venda registrada no histórico ainda.</td></tr>`;
            return;
        }

        tbody.innerHTML = ""; // Limpa a mensagem de "Carregando..."

        vendas.forEach(venda => {
            const dataVenda = new Date(venda.vendido_em).toLocaleDateString("pt-BR");
            
            // Verifica se o preço existe, senão exibe uma mensagem padrão
            let valorFormatado = "Valor não registrado";
            if (venda.preco) {
                valorFormatado = Number(venda.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            }
            
            // Lógica para o status das fotos (badge azul para salvas, badge cinza para limpas após 90 dias)
            let statusArquivo = '<span class="badge-status salvo">Fotos Salvas</span>';
            let fotoUrl = venda.imagem_principal || "https://via.placeholder.com/150x100?text=Sem+Foto";
            
            if (venda.vendido_em) {
                const diasVendido = Math.floor((new Date() - new Date(venda.vendido_em)) / (1000 * 60 * 60 * 24));
                if (diasVendido > 90) {
                    statusArquivo = '<span class="badge-status limpo">Fotos Limpas</span>';
                    fotoUrl = "https://via.placeholder.com/150x100?text=Expirada"; 
                }
            }

            // Controle da Observação (USANDO O NOME CORRETO: observacao_venda)
            let obsHtml = '-';
            if (venda.observacao_venda && venda.observacao_venda.trim() !== '') {
                const obsCodificada = encodeURIComponent(venda.observacao_venda);
                obsHtml = `
                    <button type="button" class="btn-obs-tabela" data-obs="${obsCodificada}" onclick="verObservacao(this)" title="Ler observação">
                        <i class="fas fa-file-alt"></i> Ver
                    </button>
                `;
            }

            const tr = document.createElement("tr");
            
            // Layout moderno sem DIVs genéricas (usando figure e figcaption)
            tr.innerHTML = `
                <td>
                    <figure style="margin: 0; display: flex; align-items: center; gap: 15px;">
                        <img src="${fotoUrl}" alt="Foto Veículo" 
                             style="width: 70px; height: 50px; object-fit: cover; border-radius: 5px; cursor: pointer; border: 1px solid #444;"
                             onclick="verFotoHistorico('${fotoUrl}')"
                             onerror="this.src='https://via.placeholder.com/150x100?text=Sem+Foto'"
                             title="Clique para ampliar">
                        <figcaption style="text-align: left; line-height: 1.3;">
                            <strong class="marca-destaque">${venda.marca || 'Sem Marca'}</strong> <br>
                            <small style="font-size: 0.95rem; color: #ccc;">${venda.modelo || 'Modelo Desconhecido'}</small>
                        </figcaption>
                    </figure>
                </td>
                <td>${venda.ano || '-'}</td>
                <td class="preco-venda">${valorFormatado}</td>
                <td>${venda.vendido_em ? dataVenda : '-'}</td>
                <td style="text-align: center;">${obsHtml}</td>
                <td>${statusArquivo}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (erro) {
        console.error("Erro ao carregar histórico:", erro);
        tbody.innerHTML = `<tr><td colspan="6" class="mensagem-tabela" style="color: #ff4d4d;">Erro ao carregar os dados. Verifique a conexão com o servidor.</td></tr>`;
    }
}

// ==========================================
// FUNÇÕES DE VISUALIZAÇÃO (FOTO / OBSERVAÇÃO)
// ==========================================

window.verFotoHistorico = function(url) {
    if(url.includes("Expirada") || url.includes("Sem+Foto")) {
        Swal.fire({
            title: "Atenção", 
            text: "A foto deste veículo já foi apagada do servidor por ter passado dos 90 dias.", 
            icon: "info",
            background: '#1a1a1a', color: '#fff'
        });
        return;
    }

    Swal.fire({
        imageUrl: url,
        imageAlt: 'Foto do Veículo Vendido',
        showConfirmButton: false,
        showCloseButton: true,
        background: '#1a1a1a',
        color: '#fff',
        customClass: {
            image: 'swal-img-historico'
        }
    });
};

window.verObservacao = function(btn) {
    const obsCodificada = btn.getAttribute('data-obs');
    const obsTexto = decodeURIComponent(obsCodificada);
    
    Swal.fire({
        title: '<h3 style="color:#fff; margin-bottom: 0;">Observação da Venda</h3>',
        html: `<div style="color:#ccc; text-align: left; padding: 15px; background: #222; border-radius: 8px; border: 1px solid #444; margin-top: 10px; white-space: pre-wrap; line-height: 1.5;">${obsTexto}</div>`,
        icon: 'info',
        background: '#1a1a1a',
        showConfirmButton: true,
        confirmButtonColor: '#a00b0b',
        confirmButtonText: 'Fechar'
    });
};