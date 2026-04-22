document.addEventListener("DOMContentLoaded", () => {
    carregarMarcas();
    carregarCombustiveis();
    carregarOpcionais();
    configurarFiltros();
});

// ==========================================
// 1. SELECT CUSTOMIZADO DE MARCAS (COM BUSCA)
// ==========================================
async function carregarMarcas() {
    try {
        const res = await fetch("/marcas");
        const marcas = await res.json();
        const ul = document.getElementById("lista-marcas-dropdown");
        
        ul.innerHTML = ""; // Limpa a lista
        
        marcas.forEach(marca => {
            const li = document.createElement("li");
            li.textContent = marca.nome;
            // Quando clica num item, seleciona ele e fecha a caixa
            li.onclick = () => selecionarMarca(marca.id, marca.nome);
            ul.appendChild(li);
        });
    } catch (error) {
        console.error("Erro ao carregar marcas:", error);
    }
}

function toggleMarcaDropdown() {
    const dropdown = document.querySelector('.custom-select-dropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
    
    // Foca na barra de pesquisa automaticamente ao abrir
    if(dropdown.style.display === 'flex') {
        document.getElementById('busca-marca-interna').focus();
    }
}

function selecionarMarca(id, nome) {
    document.getElementById('marca_id_hidden').value = id; 
    document.getElementById('texto-marca-selecionada').textContent = nome; 
    document.querySelector('.custom-select-dropdown').style.display = 'none'; 
    
    // Limpa a barra de pesquisa para a próxima vez
    document.getElementById('busca-marca-interna').value = ""; 
    filtrarMarcasDropdown(); 
}

function filtrarMarcasDropdown() {
    const termo = document.getElementById("busca-marca-interna").value.toLowerCase();
    const itens = document.querySelectorAll("#lista-marcas-dropdown li");
    
    itens.forEach(li => {
        li.style.display = li.textContent.toLowerCase().includes(termo) ? "" : "none";
    });
}

// Fechar a caixa de marcas se o usuário clicar fora dela
document.addEventListener("click", function(event) {
    const container = document.getElementById("custom-marca-container");
    // Se o clique não foi dentro da caixa e nem no botão de abrir, fecha a caixa
    if (container && !container.contains(event.target)) {
        const dropdown = document.querySelector('.custom-select-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
});

// ==========================================
// 2. DADOS BÁSICOS (COMBUSTÍVEL E OPCIONAIS)
// ==========================================
function carregarCombustiveis() {
    const combustiveis = ["Gasolina", "Etanol", "Flex", "Diesel", "Híbrido", "Elétrico"];
    const select = document.getElementById("combustivel");
    const options = combustiveis.map(c => `<option value="${c}">${c}</option>`);
    select.innerHTML = '<option value="">Selecione o combustível</option>' + options.join("");
}

async function carregarOpcionais() {
    try {
        const res = await fetch("/opcionais");
        const opcionais = await res.json();
        const container = document.getElementById("grid-opcionais");
        const html = opcionais.map(opcional => `
            <label class="item-opcional">
                <input type="checkbox" name="opcionais" value="${opcional.id}">
                <span>${opcional.nome}</span>
            </label>
        `).join("");
        container.innerHTML = html;
    } catch (error) {
        console.error("Erro ao carregar opcionais:", error);
    }
}

document.getElementById("tem-opcionais").addEventListener("change", function () {
    const lista = document.getElementById("lista-opcionais");
    if (this.checked) {
        lista.style.display = "block"; 
    } else {
        lista.style.display = "none";
        document.querySelectorAll("input[name='opcionais']").forEach(el => (el.checked = false));
    }
});

// ==========================================
// 3. UPLOAD DE FOTOS: ZOOM, REMOVER E CAPA
// ==========================================
let arquivosFotos = [];
const MAX_FOTOS = 5;
const inputFotos = document.getElementById('upload-fotos');
const previewContainer = document.getElementById('preview-fotos');
const contadorFotos = document.getElementById('contador-fotos');

inputFotos.addEventListener('change', function(event) {
    const novasFotos = Array.from(event.target.files);
    const espacoLivre = MAX_FOTOS - arquivosFotos.length;

    if (novasFotos.length > espacoLivre) {
        Swal.fire('Limite atingido', `Você só pode adicionar mais ${espacoLivre} foto(s).`, 'warning');
        arquivosFotos.push(...novasFotos.slice(0, espacoLivre));
    } else {
        arquivosFotos.push(...novasFotos);
    }

    this.value = ''; 
    atualizarPreviewFotos();
});

function atualizarPreviewFotos() {
    previewContainer.innerHTML = ""; 

    arquivosFotos.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            
            const itemPreview = document.createElement('article');
            itemPreview.classList.add('preview-item');

            const img = document.createElement('img');
            img.src = e.target.result;
            img.classList.add('img-ampliavel');
            img.addEventListener('click', () => abrirLightbox(e.target.result));

            const btnRemover = document.createElement('button');
            btnRemover.classList.add('btn-remover-foto');
            btnRemover.type = 'button';
            btnRemover.innerHTML = '&times;';
            btnRemover.addEventListener('click', function() {
                arquivosFotos.splice(index, 1);
                atualizarPreviewFotos(); 
            });

            const divCapa = document.createElement('div'); // Apenas para a formatação da capa no seu CSS
            divCapa.classList.add('preview-capa-box');
            divCapa.innerHTML = `
                <label style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                    <input type="radio" name="foto_principal_index" value="${index}" ${index === 0 ? 'checked' : ''} style="margin:0; width:14px; height:14px; cursor:pointer;"> 
                    Capa
                </label>
            `;

            itemPreview.appendChild(img);
            itemPreview.appendChild(btnRemover);
            itemPreview.appendChild(divCapa);
            previewContainer.appendChild(itemPreview);
        }
        reader.readAsDataURL(file);
    });

    contadorFotos.textContent = `${arquivosFotos.length}/${MAX_FOTOS} fotos adicionadas.`;
}

// ==========================================
// 4. ENVIO DO FORMULÁRIO COMPLETO
// ==========================================
document.getElementById("form-veiculo").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    formData.delete("opcionais");
    formData.delete("fotos");

    // ==========================================
    // 🚀 NOVO: CAPTURANDO OS NOMES PARA O MAKE
    // ==========================================
    
    // Pega o nome da marca que está escrito na tela
    const marcaNome = document.getElementById('texto-marca-selecionada').textContent;
    formData.append("marca_nome", marcaNome !== "Selecione a marca..." ? marcaNome : "Marca Indisponível");

    // Pega a palavra exata do combustível (ex: "Flex", "Gasolina")
    const selectCombustivel = document.getElementById('combustivel');
    if (selectCombustivel && selectCombustivel.selectedIndex >= 0) {
        const combustivelNome = selectCombustivel.options[selectCombustivel.selectedIndex].text;
        formData.append("combustivel_nome", combustivelNome);
    }
    // ==========================================

    const temOpcionais = document.getElementById("tem-opcionais").checked;

    if (temOpcionais) {
        const opcionaisMarcados = document.querySelectorAll("input[name='opcionais']:checked");
        opcionaisMarcados.forEach(checkbox => {
            formData.append("opcionais", checkbox.value);
        });
    }
    
    if (!formData.get("marca_id")) return Swal.fire('Atenção', 'Selecione a marca.', 'warning');
    if (!formData.get("combustivel")) return Swal.fire('Atenção', 'Selecione o combustível.', 'warning');
    if (arquivosFotos.length === 0) return Swal.fire('Atenção', 'Adicione pelo menos uma foto.', 'warning');

    const checkDestaque = document.getElementById("input-destaque");
    const isDestaque = (checkDestaque && checkDestaque.checked) ? 1 : 0;
    formData.append("destaque", isDestaque);

    const capaSelecionada = document.querySelector('input[name="foto_principal_index"]:checked');
    formData.set("foto_principal_index", capaSelecionada ? capaSelecionada.value : 0);

    arquivosFotos.forEach(file => formData.append("fotos", file));

    const btn = this.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
        const resposta = await fetch("/admin/adicionar-carro", {
            method: "POST",
            body: formData,
        });

        const resultado = await resposta.json();

        if (resposta.ok) {
            Swal.fire('Sucesso!', resultado.mensagem, 'success');
            this.reset();
            document.getElementById("lista-opcionais").style.display = "none";
            
            // Reseta a marca personalizada
            document.getElementById('texto-marca-selecionada').textContent = "Selecione a marca...";
            document.getElementById('marca_id_hidden').value = "";
            
            arquivosFotos = [];
            atualizarPreviewFotos();
        } else {
            Swal.fire('Erro', resultado.mensagem || 'Ocorreu um problema.', 'error');
        }
    } catch (error) {
        console.error("Erro:", error);
        Swal.fire('Erro', 'Erro de conexão ao adicionar veículo.', 'error');
    }

    btn.disabled = false;
    btn.textContent = "Cadastrar Veículo";
});

// ==========================================
// 5. FILTRO DE OPCIONAIS (GRID PRINCIPAL)
// ==========================================
function configurarFiltros() {
    document.getElementById("busca-opcional")?.addEventListener("input", function() {
        const termo = this.value.toLowerCase();
        const labels = document.querySelectorAll("#grid-opcionais .item-opcional");
        labels.forEach(label => {
            const spanTexto = label.querySelector("span").textContent.toLowerCase();
            label.style.display = spanTexto.includes(termo) ? "flex" : "none";
        });
    });
}

// ==========================================
// 6. ADICIONAR, GERENCIAR E EDITAR (USANDO MODAL NATIVO)
// ==========================================

// --- ABRIR E FECHAR MODAIS ---
function abrirGerenciarMarcas() {
    document.getElementById('modal-marcas').style.display = 'flex';
    carregarListaGerenciar('marcas', 35);
}
function fecharModalMarcas() {
    document.getElementById('modal-marcas').style.display = 'none';
}

function abrirGerenciarOpcionais() {
    document.getElementById('modal-opcionais').style.display = 'flex';
    carregarListaGerenciar('opcionais', 39);
}
function fecharModalOpcionais() {
    document.getElementById('modal-opcionais').style.display = 'none';
}

// --- FECHAR MODAL AO CLICAR FORA (OVERLAY) ---
window.addEventListener('click', function(event) {
    const modalMarcas = document.getElementById('modal-marcas');
    const modalOpcionais = document.getElementById('modal-opcionais');

    // Se o elemento clicado for o próprio fundo escuro (overlay), fecha o modal correspondente
    if (event.target === modalMarcas) {
        fecharModalMarcas();
    }
    if (event.target === modalOpcionais) {
        fecharModalOpcionais();
    }
});

// --- CARREGAR LISTAS DENTRO DOS MODAIS ---
async function carregarListaGerenciar(tipo, limiteSeguranca) {
    try {
        const res = await fetch(`/${tipo}`);
        const lista = await res.json();
        const ul = document.getElementById(`lista-${tipo}-modal`);
        ul.innerHTML = "";

        lista.forEach(item => {
            const ehProtegido = item.id <= limiteSeguranca;
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.padding = "10px";
            li.style.borderBottom = "1px solid #333";

            // Se for protegido, esconde os botões e bota um cadeado
            li.innerHTML = `
                <span style="color: ${ehProtegido ? '#aaa' : '#fff'};">${item.nome} ${ehProtegido ? '<i class="fas fa-lock" style="font-size: 0.8em; margin-left:5px;" title="Padrão de Fábrica"></i>' : ''}</span>
                ${!ehProtegido ? `
                <nav style="display: flex; gap: 12px;">
                    <button type="button" onclick="editarItem('${tipo}', ${item.id}, '${item.nome}')" style="background:none; border:none; color:#4ea8de; cursor:pointer; font-size:1.1rem;" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                    <button type="button" onclick="deletarItem('${tipo}', ${item.id}, '${item.nome}')" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:1.1rem;" title="Excluir"><i class="fas fa-trash"></i></button>
                </nav>` : `<span style="font-size: 0.8rem; color: #666; font-style: italic;">Não editável</span>`}
            `;
            ul.appendChild(li);
        });
    } catch (error) {
        console.error(`Erro ao carregar gerenciamento de ${tipo}:`, error);
    }
}

// --- FILTROS DE PESQUISA DENTRO DOS MODAIS ---
function filtrarMarcas() {
    const termo = document.getElementById('pesquisa-marca').value.toLowerCase();
    const itens = document.querySelectorAll('#lista-marcas-modal li');
    itens.forEach(li => {
        const texto = li.querySelector('span').textContent.toLowerCase();
        li.style.display = texto.includes(termo) ? "flex" : "none";
    });
}

function filtrarOpcionais() {
    const termo = document.getElementById('pesquisa-opcional').value.toLowerCase();
    const itens = document.querySelectorAll('#lista-opcionais-modal li');
    itens.forEach(li => {
        const texto = li.querySelector('span').textContent.toLowerCase();
        li.style.display = texto.includes(termo) ? "flex" : "none";
    });
}

// --- ADICIONAR NOVOS ---
async function adicionarNovaMarca() {
    const input = document.getElementById('nova-marca-input');
    let nome = input && input.value ? input.value : null;

    if (!nome) {
        const result = await Swal.fire({ title: 'Nova Marca', input: 'text', showCancelButton: true, confirmButtonColor: '#cc0000' });
        nome = result.value;
    }

    if (nome) {
        await enviarItem('marcas', 'POST', { nome });
        if(input) input.value = ''; // limpa o input do modal
    }
}

async function adicionarNovoOpcional() {
    const input = document.getElementById('novo-opcional-input');
    let nome = input && input.value ? input.value : null;

    if (!nome) {
        const result = await Swal.fire({ title: 'Novo Opcional', input: 'text', showCancelButton: true, confirmButtonColor: '#cc0000' });
        nome = result.value;
    }

    if (nome) {
        await enviarItem('opcionais', 'POST', { nome });
        if(input) input.value = '';
    }
}

// --- EDITAR E DELETAR ---
async function editarItem(rota, id, nomeAtual) {
    const { value: novoNome } = await Swal.fire({
        title: `Editar: ${nomeAtual}`,
        input: 'text',
        inputValue: nomeAtual,
        showCancelButton: true,
        confirmButtonColor: '#4ea8de',
        confirmButtonText: 'Atualizar',
        background: '#1a1a1a', color: '#fff'
    });

    if (novoNome && novoNome !== nomeAtual) {
        await enviarItem(`${rota}/${id}`, 'PUT', { nome: novoNome });
    }
}

async function deletarItem(rota, id, nome) {
    const confirm = await Swal.fire({ 
        title: `Excluir ${nome}?`, 
        text: "Não será possível se estiver em uso.", 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#d33', 
        confirmButtonText: 'Sim' 
    });
    
    if (confirm.isConfirmed) {
        await enviarItem(`${rota}/${id}`, 'DELETE', null);
    }
}

// --- ENVIO GENÉRICO PARA O BACKEND ---
async function enviarItem(rotaComId, metodo, corpo) {
    try {
        const opcoes = { method: metodo, headers: { 'Content-Type': 'application/json' } };
        if (corpo) opcoes.body = JSON.stringify(corpo);
        
        const res = await fetch(`/admin/api/${rotaComId}`, opcoes);
        const data = await res.json();

        const tipoBase = rotaComId.split('/')[0];

        if (res.ok) {
            // Espera o usuário dar OK no alerta de sucesso antes de atualizar
            await Swal.fire('Sucesso!', data.mensagem, 'success');
            
            // Atualiza a página de trás e a lista do modal aberto
            if (tipoBase === 'marcas') {
                carregarMarcas();
                if (document.getElementById('modal-marcas').style.display === 'flex') {
                    carregarListaGerenciar('marcas', 35);
                }
            } else if (tipoBase === 'opcionais') {
                carregarOpcionais();
                if (document.getElementById('modal-opcionais').style.display === 'flex') {
                    carregarListaGerenciar('opcionais', 39);
                }
            }
        } else {
            await Swal.fire('Atenção', data.mensagem, 'warning');
        }
    } catch (err) {
        await Swal.fire('Erro', 'Erro ao conectar ao servidor.', 'error');
    }
}