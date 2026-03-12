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