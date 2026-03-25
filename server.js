const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");

const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.use(session({
    secret: "segredo-top",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false 
    }
}));

function verificarLogin(req, res, next) {
    if (!req.session.usuario) {
        return res.status(403).send("Acesso negado");
    }
    next();
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const nomeCarro = req.body.modelo.replace(/\s+/g, "-");
        const pasta = path.join(__dirname, "public/img/carros/" + nomeCarro);
        if (!fs.existsSync(pasta)) {
            fs.mkdirSync(pasta, { recursive: true });
        }
        cb(null, pasta);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage: storage });

// LOGIN (TEMPORÁRIO)
app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === "admin" && senha === "1234") {
        req.session.usuario = usuario;
        return res.json({ sucesso: true });
    }
    res.sendStatus(401);
});

// LOGOUT
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login.html");
});

//  ROTA ADMIN (PROTEGIDA)
app.get("/admin", verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin/dashboard.html"));
});


// conexão com MySQL
let db;

async function conectarBanco() {
    db = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "alan1234",
        database: "revendedora",
    });

    console.log("Conectado ao MySQL");
}

conectarBanco();

app.get("/carros", async (req, res) => {
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
            totalPaginas: totalPaginas,
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao carregar carros" });
    }
});

app.get("/admin/adicionar", verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin/adicionar-carro.html"));
});


app.post("/admin/adicionar-carro", verificarLogin, upload.array("fotos", 5), async (req, res) => {
    try {
        const { marca_id, modelo, ano, preco, fipe, quilometragem, cambio, combustivel } = req.body;

        // 1. INSERIR CARRO
        const [result] = await db.execute(`
            INSERT INTO Carros 
            (marca_id, modelo, ano, preco, fipe, quilometragem, cambio, combustivel, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Disponível')
        `, [
            marca_id,
            modelo,
            ano,
            preco,
            fipe,
            quilometragem,
            cambio,
            combustivel
        ]);

        const carroId = result.insertId;

        // 2. OPCIONAIS
        const opcionais = req.body.opcionais;

        if (opcionais) {
            const lista = Array.isArray(opcionais) ? opcionais : [opcionais];

            for (const opcionalId of lista) {
                await db.execute(`
                    INSERT INTO CarroOpcionais (carro_id, opcional_id)
                    VALUES (?, ?)
                `, [carroId, opcionalId]);
            }
        }

        // 3. FOTOS
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const caminho = file.path
                    .split("public")[1]
                    .replace(/\\/g, "/");

                await db.execute(`
                    INSERT INTO FotosCarro (carro_id, caminho)
                    VALUES (?, ?)
                `, [carroId, caminho]);
            }
        }

        res.json({ mensagem: "Carro adicionado com sucesso!" });

    } catch (erro) {
        console.error("ERRO AO SALVAR:", erro);
        res.status(500).json({ mensagem: "Erro ao salvar carro" });
    }
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

        const [carros] = await db.query(
            `
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
        `,
            [id],
        );

        if (carros.length === 0) {
            return res.status(404).json({ erro: "Carro não encontrado" });
        }

        const carro = carros[0];

        const [fotos] = await db.query(
            `
            SELECT caminho
            FROM FotosCarro
            WHERE carro_id = ?
         `,
            [id],
        );
        carro.fotos = fotos;

        const [opcionais] = await db.query(
            `
        SELECT Opcionais.nome
        FROM CarroOpcionais
        JOIN Opcionais ON CarroOpcionais.opcional_id = Opcionais.id
        WHERE CarroOpcionais.carro_id = ?
        `,
            [id],
        );

        carro.opcionais = opcionais;

        res.json(carro);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao carregar detalhes do carro" });
    }
});

app.get("/carros/:id/relacionados", async (req, res) => {
    const id = req.params.id;

    const [carroAtual] = await db.query(`SELECT * FROM Carros WHERE id = ?`, [
        id,
    ]);
    const [todosCarros] = await db.query(
        `
    SELECT 
    Carros.*,
    Marcas.nome AS marca,
    (SELECT caminho 
    FROM FotosCarro 
    WHERE carro_id = Carros.id 
    LIMIT 1) AS imagem_principal
    FROM Carros
    JOIN Marcas ON Carros.marca_id = Marcas.id
    WHERE Carros.id != ?`,
        [id],
    );

    const atual = carroAtual[0];

    const relacionados = todosCarros
        .map((c) => {
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

app.get("/marcas", async (req, res) => {
    try {
        const [marcas] = await db.query("SELECT * FROM Marcas");
        res.json(marcas);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao carregar marcas" });
    }
});

app.get("/opcionais", async (req, res) => {
    try {
        const [opcionais] = await db.query("SELECT * FROM Opcionais");
        res.json(opcionais);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao carregar opcionais" });
    }
});

app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});