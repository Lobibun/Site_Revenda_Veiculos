document.addEventListener("DOMContentLoaded", () => {
    carregarMensagens();
});

// ==========================================
// 1. BUSCAR MENSAGENS NO SERVIDOR
// ==========================================
async function carregarMensagens() {
    const tbody = document.getElementById("tabela-mensagens");
    
    try {
        const resposta = await fetch("/admin/api/mensagens");
        
        if (!resposta.ok) throw new Error("Erro ao buscar as mensagens.");
        
        const mensagens = await resposta.json();
        
        if (mensagens.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="mensagem-tabela">Sua caixa de entrada está vazia. Nenhuma mensagem recebida.</td></tr>`;
            return;
        }

        tbody.innerHTML = ""; 

        mensagens.forEach(msg => {
            const dataObjeto = new Date(msg.data_envio);
            const dataFormatada = dataObjeto.toLocaleDateString("pt-BR") + " às " + dataObjeto.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });

            const classeLida = msg.lida ? "linha-lida" : "linha-nao-lida";
            
            // LÓGICA DE STATUS COM O NOME DE QUEM RESPONDEU
            let iconeEStatus = "";
            if (msg.respondida) {
                iconeEStatus = `
                    <i class="fas fa-reply-all" style="color: #28a745;" title="Respondida"></i><br>
                    <small style="font-size: 0.75rem; color: #28a745; display: block; margin-top: 5px; font-weight:bold;">
                        Respondida por:<br>${msg.respondida_por || 'Sistema'}
                    </small>
                `;
            } else if (msg.lida) {
                iconeEStatus = `
                    <i class="fas fa-envelope-open" title="Lida"></i><br>
                    <small style="font-size: 0.75rem; color: #888; display: block; margin-top: 5px;">Lida por:<br>${msg.lida_por || 'Sistema'}</small>
                `;
            } else {
                iconeEStatus = `<i class="fas fa-envelope" style="color:#a00b0b;" title="Nova"></i>`;
            }
            
            const tr = document.createElement("tr");
            tr.className = classeLida;
            tr.setAttribute("data-id", msg.id); 

            const dadosCodificados = encodeURIComponent(JSON.stringify(msg));

            tr.innerHTML = `
                <td style="text-align: center; font-size: 1.2rem; vertical-align: middle;">${iconeEStatus}</td>
                <td><strong>${msg.nome}</strong></td>
                <td><small><i class="fas fa-envelope"></i> ${msg.email}</small></td>
                <td><time datetime="${msg.data_envio}">${dataFormatada}</time></td>
                <td>
                    <button type="button" class="btn-ler" onclick="abrirMensagem('${dadosCodificados}')">
                        <i class="fas fa-eye"></i> Ler
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (erro) {
        console.error("Falha ao processar mensagens:", erro);
        tbody.innerHTML = `<tr><td colspan="5" class="mensagem-tabela" style="color: #ff4d4d;">Erro de conexão. Tente recarregar a página.</td></tr>`;
    }
}

// ==========================================
// 2. ABRIR MENSAGEM E MARCAR COMO LIDA
// ==========================================
window.abrirMensagem = async function(dadosCodificados) {
    const msg = JSON.parse(decodeURIComponent(dadosCodificados));
    
    // MOSTRA QUEM RESPONDEU DENTRO DO POP-UP
    let infoLeitura = "";
    if (msg.respondida) {
        infoLeitura = `<div style="background: rgba(40, 167, 69, 0.2); border: 1px solid #28a745; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #28a745; font-size: 0.95rem; margin: 0; font-weight: bold;"><i class="fas fa-check-circle"></i> Respondida por: ${msg.respondida_por || 'Sistema'}</p>
        </div>`;
    } else if (msg.lida) {
        infoLeitura = `<p style="color: #4facfe; font-size: 0.9rem; margin-bottom: 10px;"><i class="fas fa-check-double"></i> Visualizada por: <strong>${msg.lida_por || 'Sistema'}</strong></p>`;
    }

    const result = await Swal.fire({
        title: `<h3 style="color:#fff; margin:0;">Mensagem de ${msg.nome}</h3>`,
        html: `
            <article style="text-align: left; color: #ccc; background: #222; padding: 15px; border-radius: 8px; border: 1px solid #444; margin-top: 15px;">
                ${infoLeitura}
                <p><strong>E-mail:</strong> ${msg.email}</p>
                <hr style="border-color: #444; margin: 15px 0;">
                <p style="white-space: pre-wrap; line-height: 1.5; color: #fff;">${msg.mensagem}</p>
            </article>
        `,
        icon: 'info',
        background: '#1a1a1a',
        showCloseButton: true,
        showDenyButton: true, 
        confirmButtonColor: '#444',
        confirmButtonText: 'Fechar',
        denyButtonColor: '#007bff', 
        denyButtonText: '<i class="fas fa-reply"></i> Responder',
    });

    if (!msg.lida) {
        try {
            const resposta = await fetch(`/admin/api/mensagens/${msg.id}/ler`, { method: 'PUT' });

            if (resposta.ok) {
                const dados = await resposta.json(); 
                
                const linhaTabela = document.querySelector(`tr[data-id="${msg.id}"]`);
                if (linhaTabela) {
                    linhaTabela.classList.remove("linha-nao-lida");
                    linhaTabela.classList.add("linha-lida");
                    
                    const iconeTd = linhaTabela.querySelector("td:first-child");
                    iconeTd.innerHTML = `
                        <i class="fas fa-envelope-open" title="Lida"></i><br>
                        <small style="font-size: 0.75rem; color: #888; display: block; margin-top: 5px;">Lida por:<br>${dados.lida_por}</small>
                    `;
                    
                    msg.lida = 1;
                    msg.lida_por = dados.lida_por;
                    
                    const badges = document.querySelectorAll("#badge-sistema-principal, #badge-sistema-dropdown");
                    badges.forEach(badge => {
                        let atual = parseInt(badge.textContent);
                        if (atual > 0) {
                            badge.textContent = atual - 1;
                            if (atual - 1 === 0) badge.style.display = "none";
                        }
                    });

                    const novoDadoCodificado = encodeURIComponent(JSON.stringify(msg));
                    linhaTabela.querySelector(".btn-ler").setAttribute("onclick", `abrirMensagem('${novoDadoCodificado}')`);
                }
            }
        } catch (erro) {
            console.error("Erro ao avisar o servidor sobre a leitura:", erro);
        }
    }

    if (result.isDenied) {
        abrirModalResposta(msg);
    }
};

// ==========================================
// 3. ENVIAR RESPOSTA POR E-MAIL
// ==========================================
window.abrirModalResposta = async function(msg) {
    const { value: textoResposta } = await Swal.fire({
        title: `Responder para ${msg.nome}`,
        input: 'textarea',
        inputLabel: `Enviando para: ${msg.email}`,
        inputPlaceholder: 'Digite sua resposta aqui...',
        background: '#1a1a1a',
        color: '#fff',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-paper-plane"></i> Enviar E-mail',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#d33',
        inputValidator: (value) => {
            if (!value || value.trim() === '') {
                return 'Você precisa digitar uma mensagem!';
            }
        }
    });

    if (textoResposta) {
        Swal.fire({
            title: 'Enviando...',
            text: 'Aguarde enquanto o e-mail é disparado.',
            background: '#1a1a1a',
            color: '#fff',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const respostaServidor = await fetch(`/admin/api/mensagens/${msg.id}/responder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto_resposta: textoResposta })
            });

            if (respostaServidor.ok) {
                // Pega os dados do servidor (incluindo QUEM respondeu)
                const dadosServidor = await respostaServidor.json();

                // Atualiza o visual da tabela imediatamente para "Respondida" e coloca o nome
                const linhaTabela = document.querySelector(`tr[data-id="${msg.id}"]`);
                if (linhaTabela) {
                    const iconeTd = linhaTabela.querySelector("td:first-child");
                    iconeTd.innerHTML = `
                        <i class="fas fa-reply-all" style="color: #28a745;" title="Respondida"></i><br>
                        <small style="font-size: 0.75rem; color: #28a745; display: block; margin-top: 5px; font-weight:bold;">
                            Respondida por:<br>${dadosServidor.respondida_por}
                        </small>
                    `;
                    
                    // Atualiza o botão para já abrir com a tarja verde e o nome da próxima vez
                    msg.respondida = 1;
                    msg.respondida_por = dadosServidor.respondida_por;
                    const novoDadoCodificado = encodeURIComponent(JSON.stringify(msg));
                    linhaTabela.querySelector(".btn-ler").setAttribute("onclick", `abrirMensagem('${novoDadoCodificado}')`);
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Enviado!',
                    text: 'Sua resposta foi enviada com sucesso para o cliente.',
                    background: '#1a1a1a',
                    color: '#fff',
                    confirmButtonColor: '#28a745'
                });
            } else {
                throw new Error("Erro na resposta do servidor");
            }
        } catch (erro) {
            console.error("Erro ao enviar e-mail:", erro);
            Swal.fire({
                icon: 'error',
                title: 'Ops!',
                text: 'Não foi possível enviar o e-mail. Tente novamente mais tarde.',
                background: '#1a1a1a',
                color: '#fff',
                confirmButtonColor: '#d33'
            });
        }
    }
};