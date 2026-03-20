async function CarregarVendedores() {
    const list= document.getElementById("lista-vendedores");
    list.innerHTML = "";
    try{
    const response = await fetch("/vendedores");
    const vendedores = await response.json();

    vendedores.forEach(vendedor => {
        const card = CriarCardVendedor(vendedor);
        list.appendChild(card);
    });
}
    catch(error){
        console.error("Erro ao carregar vendedores:", error);
        list.innerHTML = "<p>Erro ao carregar vendedores. Tente novamente mais tarde.</p>";
}
}
CarregarVendedores();