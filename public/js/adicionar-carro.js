document.addEventListener("DOMContentLoaded", () => {
    carregarMarcas();
    carregarCombustiveis();
    carregarOpcionais();
});

async function carregarMarcas() {
    try {
        const res = await fetch("/marcas");
        const marcas = await res.json();
        const select = document.getElementById("marca");
        const options = marcas.map(marca => `<option value="${marca.id}">${marca.nome}</option>`);
        select.innerHTML = '<option value="">Selecione a marca</option>' + options.join("");
    } catch (error) {
        console.error("Erro ao carregar marcas:", error);
    }
}

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
        const container = document.getElementById("grid-opcionais"); // Ajustado para pegar o div interno
        const html = opcionais.map(opcional => `
            <label>
                <input type="checkbox" name="opcionais" value="${opcional.id}">
                ${opcional.nome}
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
        lista.style.display = "grid";
    } else {
        lista.style.display = "none";
        document.querySelectorAll("input[name='opcionais']").forEach(el => (el.checked = false));
    }
});

// ==========================================
// UPLOAD DE FOTOS: ZOOM, REMOVER E CAPA
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

    this.value = ''; // Limpa o input para permitir selecionar a mesma imagem de novo se quiser
    atualizarPreviewFotos();
});

function atualizarPreviewFotos() {
    previewContainer.innerHTML = ""; 

    arquivosFotos.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            
            // Container principal
            const itemPreview = document.createElement('article');
            itemPreview.classList.add('preview-item');

            // Imagem (AQUI ELE CHAMA O utils.js AUTOMATICAMENTE)
            const img = document.createElement('img');
            img.src = e.target.result;
            img.classList.add('img-ampliavel');
            img.addEventListener('click', () => abrirLightbox(e.target.result));

            // Botão "X" de remover
            const btnRemover = document.createElement('button');
            btnRemover.classList.add('btn-remover-foto');
            btnRemover.type = 'button';
            btnRemover.innerHTML = '&times;';
            btnRemover.addEventListener('click', function() {
                arquivosFotos.splice(index, 1);
                atualizarPreviewFotos(); // Recarrega para ajustar a Capa
            });

            // Seção inferior para escolher a "Capa" usando a nova classe CSS
            const divCapa = document.createElement('div');
            divCapa.classList.add('preview-capa-box');
            divCapa.innerHTML = `
                <label>
                    <input type="radio" name="foto_principal_index" value="${index}" ${index === 0 ? 'checked' : ''} style="margin:0; width:14px; height:14px; cursor:pointer;"> 
                    Capa
                </label>
            `;

            // Monta tudo
            itemPreview.appendChild(img);
            itemPreview.appendChild(btnRemover);
            itemPreview.appendChild(divCapa);
            previewContainer.appendChild(itemPreview);
        }
        reader.readAsDataURL(file);
    });

    // Atualiza o texto do contador
    contadorFotos.textContent = `${arquivosFotos.length}/${MAX_FOTOS} fotos adicionadas.`;
}

// ==========================================
// ENVIO DO FORMULÁRIO
// ==========================================
document.getElementById("form-veiculo").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    
    // 1. Limpamos qualquer resquício de opcionais que o FormData tentou pegar sozinho
    formData.delete("opcionais");

    // 2. Verificamos se o switch/checkbox mestre está ativado
    const temOpcionais = document.getElementById("tem-opcionais").checked;

    // 3. Captura manual à prova de falhas (busca na tela toda)
    if (temOpcionais) {
        const opcionaisMarcados = document.querySelectorAll("input[name='opcionais']:checked");
        
        opcionaisMarcados.forEach(checkbox => {
            formData.append("opcionais", checkbox.value);
        });
    }
    
    if (!formData.get("marca_id")) return Swal.fire('Atenção', 'Selecione a marca.', 'warning');
    if (!formData.get("combustivel")) return Swal.fire('Atenção', 'Selecione o combustível.', 'warning');
    if (arquivosFotos.length === 0) return Swal.fire('Atenção', 'Adicione pelo menos uma foto.', 'warning');

    // === NOVA LÓGICA DO DESTAQUE ===
    const checkDestaque = document.getElementById("input-destaque");
    const isDestaque = (checkDestaque && checkDestaque.checked) ? 1 : 0;
    formData.append("destaque", isDestaque);
    // ===============================

    // Pega o índice da foto selecionada como capa (se não houver, padrão 0)
    const capaSelecionada = document.querySelector('input[name="foto_principal_index"]:checked');
    formData.set("foto_principal_index", capaSelecionada ? capaSelecionada.value : 0);

    // Adiciona os arquivos armazenados no array
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
            arquivosFotos = [];
            atualizarPreviewFotos(); // Zera o preview
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