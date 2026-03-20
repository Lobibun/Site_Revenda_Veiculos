const express = require('express');
const mysql = require('mysql2/promise');

const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const nomeCarro = req.body.marca + "-" + req.body.modelo;
        const pasta = path.join(__dirname, "public/img/carros/" + nomeCarro);

        if (!fs.existsSync(pasta)) {
            fs.mkdirSync(pasta, { recursive: true });
        }

        cb(null, pasta);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const app = express();
app.use(express.json());
app.use(express.static('public'));

// conexão com MySQL
let db;

async function conectarBanco() {
    db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'alan1234',
        database: 'revendedora'
    });

    console.log("Conectado ao MySQL");
}

conectarBanco();

app.get('/carros', async (req, res) => {

try {

    const pagina = parseInt(req.query.pagina) || 1;
    const limite = 12;
    const offset = (pagina - 1) * limite;

    const sqlCarros = `
        SELECT 
        Carros.*,
        Marcas.nome AS marca,
        (SELECT caminho 
        FROM FotosCarro 
        WHERE carro_id = Carros.id 
        LIMIT 1) AS imagem_principal
        FROM Carros
        JOIN Marcas ON Carros.marca_id = Marcas.id
        ORDER BY criado_em DESC
        LIMIT ? OFFSET ?
        `;

    const sqlTotal = `SELECT COUNT(*) AS total FROM Carros`;

    const [totalResult] = await db.query(sqlTotal);
    const totalCarros = totalResult[0].total;
    const totalPaginas = Math.ceil(totalCarros / limite);

    const [carros] = await db.query(sqlCarros, [limite, offset]);

    res.json({
        carros: carros,
        totalPaginas: totalPaginas
    });

} catch (erro) {

    console.error(erro);
    res.status(500).json({ erro: "Erro ao carregar carros" });

}

});
app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});

app.post("/admin/adicionar-carro", upload.array("fotos", 5), (req, res) => {

    const { marca_id, modelo, ano, preco, fipe, quilometragem, cambio } = req.body;

const sql = `
INSERT INTO Carros (marca_id, modelo, ano, preco, fipe, quilometragem, cambio, status)
VALUES (?, ?, ?, ?, ?, ?, ?, 'Disponível')
`;

db.query(sql, [marca_id, modelo, ano, preco, fipe, quilometragem, cambio], (err, result) => {

        if (err) {
            console.log(err);
            return res.json({ mensagem: "Erro ao salvar" });
        }

        const carroId = result.insertId;
        if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
            const caminho = file.path
            .split("public")[1]
            .replace(/\\/g, "/");

            const sqlFoto = `
            INSERT INTO FotosCarro (carro_id, caminho)
            VALUES (?, ?)
            `;

            db.query(sqlFoto,[carroId, caminho]);

        });
    }

        res.json({ mensagem: "Carro adicionado com sucesso!" });

    });

});


app.get("/carros/destaques", async (req, res) => {

try {

const [carros] = await db.query(`
SELECT 
Carros.*,
Marcas.nome AS marca,
(SELECT caminho 
FROM FotosCarro 
WHERE carro_id = Carros.id 
LIMIT 1) AS imagem_principal
FROM Carros
JOIN Marcas ON Carros.marca_id = Marcas.id
ORDER BY destaque DESC, criado_em DESC
LIMIT 6
`);

res.json(carros);

} catch (erro) {

console.error(erro);
res.status(500).json({ erro: "Erro ao carregar destaques" });

}

});

app.get("/carros/:id", async (req, res) => {
    try {

        const id = req.params.id;

        const [carros] = await db.query(`
        SELECT 
        Carros.*,
        Marcas.nome AS marca,
        (SELECT caminho 
        FROM FotosCarro 
        WHERE carro_id = Carros.id 
        LIMIT 1) AS imagem_principal
        FROM Carros
        JOIN Marcas ON Carros.marca_id = Marcas.id
        WHERE Carros.id = ?
        `, [id]);

        if (carros.length === 0) {
            return res.status(404).json({ erro: "Carro não encontrado" });
        }

        const carro = carros[0];

        const [fotos] = await db.query(`
            SELECT caminho
            FROM FotosCarro
            WHERE carro_id = ?
         `, [id]);
         carro.fotos = fotos;

        const [opcionais] = await db.query(`
        SELECT Opcionais.nome
        FROM CarroOpcionais
        JOIN Opcionais ON CarroOpcionais.opcional_id = Opcionais.id
        WHERE CarroOpcionais.carro_id = ?
        `, [id]);

        carro.opcionais = opcionais;

        res.json(carro);

    } catch (erro) {

        console.error(erro);
        res.status(500).json({ erro: "Erro ao carregar detalhes do carro" });

    }

});

app.get("/carros/:id/relacionados", async (req, res) => {
    const id = req.params.id;

    const [carroAtual] = await db.query(`SELECT * FROM Carros WHERE id = ?`, [id]);
    const [todosCarros] = await db.query(`
    SELECT 
    Carros.*,
    Marcas.nome AS marca,
    (SELECT caminho 
    FROM FotosCarro 
    WHERE carro_id = Carros.id 
    LIMIT 1) AS imagem_principal
    FROM Carros
    JOIN Marcas ON Carros.marca_id = Marcas.id
    WHERE Carros.id != ?`, [id]);

    const atual = carroAtual[0];

    const relacionados = todosCarros
        .map(c => {
            let score = 0;

            if (c.marca_id === atual.marca_id) score += 50;

            const diff = Math.abs(c.preco - atual.preco);
            score += Math.max(0, 100 - diff / 1000);

            return { ...c, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

        res.json(relacionados);
});

app.get("/vendedores", async (req, res) => {
    try {
        const [vendedores] = await db.query(`
            SELECT id, nome, telefone, email, foto
            FROM Vendedores
            `);

            res.json(vendedores);

    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao carregar vendedores" });
    }
});