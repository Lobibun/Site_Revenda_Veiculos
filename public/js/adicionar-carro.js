async function carregarMarcas() {
    try {
        const res = await fetch("/marcas");
        const marcas = await res.json();

        const select = document.getElementById("marca");

        const options = marcas.map(
            (marca) => `<option value="${marca.id}">${marca.nome}</option>`,
        );
        select.innerHTML =
            '<option value="">Selecione a marca</option>' + options.join("");
    } catch (error) {
        console.error("Erro ao carregar marcas:", error);
        alert("Erro ao carregar marcas.");
    }
}

function carregarCombustiveis() {
    const combustiveis = [
        "Gasolina",
        "Etanol",
        "Flex",
        "Diesel",
        "Híbrido",
        "Elétrico",
    ];
    const select = document.getElementById("combustivel");

    const options = combustiveis.map(
        (combustivel) =>
            `<option value="${combustivel}">${combustivel}</option>`,
    );
    select.innerHTML =
        '<option value="">Selecione o combustível</option>' + options.join("");
}

async function carregarOpcionais() {
    try {
        const res = await fetch("/opcionais");
        const opcionais = await res.json();

        const container = document.getElementById("lista-opcionais");

        const html = opcionais
            .map(
                (opcional) => `
    <label>
        <input type="checkbox" name="opcionais" value="${opcional.id}">
        ${opcional.nome}
    </label>
    `,
            )
            .join("");

        container.innerHTML = html;
    } catch (error) {
        console.error("Erro ao carregar opcionais:", error);
    }
}

document
    .getElementById("tem-opcionais")
    .addEventListener("change", function () {
        const lista = document.getElementById("lista-opcionais");
        if (this.checked) {
            lista.style.display = "block";
        } else {
            lista.style.display = "none";
        }

        document
            .querySelectorAll("input[name='opcionais']")
            .forEach((el) => (el.checked = false));
    });

document
    .getElementById("form-carro")
    .addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = new FormData(this);

        const temOpcionais = document.getElementById("tem-opcionais").checked;

        if (!temOpcionais) {
            formData.delete("opcionais");
        }

        if (!formData.get("marca_id")) {
            alert("Por favor, selecione a marca do carro.");
            return;
        }

        if (!formData.get("combustivel")) {
            alert("Por favor, selecione o combustível do carro.");
            return;
        }

        const btn = this.querySelector("button");
        btn.disabled = true;
        btn.textContent = "Enviando...";

        try {
            const resposta = await fetch("/admin/adicionar-carro", {
                method: "POST",
                body: formData,
            });

            const resultado = await resposta.json();
            alert(resultado.mensagem);

            this.reset();
            document.getElementById("lista-opcionais").style.display = "none";

        } catch (error) {
            console.error("Erro ao adicionar carro:", error);
            alert("Erro ao adicionar carro.");
        }

        btn.disabled = false;
        btn.textContent = "Adicionar Carro";
    });

carregarMarcas();
carregarCombustiveis();
carregarOpcionais();
