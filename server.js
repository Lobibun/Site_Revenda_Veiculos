const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs"); 

const app = express();
app.use(express.json());

// CONFIGURAÇÃO DA SESSÃO
app.use(session({
    secret: "segredo-top",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false 
    }
}));

// PROTEÇÃO DA PÁGINA DE LOGIN (Impede quem já logou de ver a tela de login)
app.get("/login.html", (req, res, next) => {
    if (req.session.usuario) {
        return res.redirect("/admin");
    }
    next(); 
});

// ARQUIVOS ESTÁTICOS
app.use(express.static("public"));

// MIDDLEWARE DE VERIFICAÇÃO DE LOGIN
function verificarLogin(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect("/login.html");
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    next();
}

// CONFIGURAÇÃO DO MULTER (UPLOAD DE IMAGENS)
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

// CONEXÃO COM O BANCO DE DADOS
let db;
async function conectarBanco() {
    try {
        db = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "alan1234",
            database: "revendedora",
        });
        console.log("✅ Conectado ao MySQL");

        // === VERIFICA SE EXISTE ALGUM USUÁRIO ===
        const [usuarios] = await db.query("SELECT COUNT(*) as total FROM Usuarios");
        
        if (usuarios[0].total === 0) {
            console.log("⚠️ Nenhum usuário encontrado. Criando Admin Mestre...");
            
            // Criptografa a senha 'admin123'
            const senhaCriptografada = await bcrypt.hash("admin123", 10);
            
            // Insere o Admin Mestre no banco
            await db.execute(`
                INSERT INTO Usuarios (nome, email, telefone, senha_hash, nivel) 
                VALUES (?, ?, ?, ?, ?)
            `, ["Administrador", "admin@revendedora.com.br", "(00) 00000-0000", senhaCriptografada, "admin"]);
            
            console.log("✅ Admin Mestre criado com sucesso! E-mail: admin@revendedora.com.br | Senha: admin123");
        }
    } catch (erro) {
        console.error("❌ Erro ao conectar no banco:", erro);
    }
}
conectarBanco();

// ==========================================
// ROTAS DE AUTENTICAÇÃO (NOVO LOGIN SEGURO)
// ==========================================

app.post("/login", async (req, res) => {
    const { email, senha } = req.body;

    try {
        // 1. Busca o usuário pelo E-MAIL
        const [usuarios] = await db.query("SELECT * FROM Usuarios WHERE email = ?", [email]);

        if (usuarios.length === 0) {
            return res.status(401).json({ erro: "E-mail ou senha incorretos" });
        }

        const user = usuarios[0];

        // 2. Compara a senha
        const senhaCorreta = await bcrypt.compare(senha, user.senha_hash);

        if (senhaCorreta) {
            // 3. Salva os dados importantes na sessão!
            req.session.usuario = {
                id: user.id,
                nome: user.nome,
                email: user.email,
                nivel: user.nivel // 'admin' ou 'vendedor'
            };
            return res.json({ sucesso: true });
        } else {
            return res.status(401).json({ erro: "E-mail ou senha incorretos" });
        }
    } catch (erro) {
        console.error("Erro no login:", erro);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login.html");
});

// ==========================================
// ROTAS DO PAINEL ADMIN (PROTEGIDAS)
// ==========================================

app.get("/admin", verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin/dashboard.html"));
});

app.get("/admin/adicionar", verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin/adicionar-carro.html"));
});

app.post("/admin/adicionar-carro", verificarLogin, upload.array("fotos", 5), async (req, res) => {
    try {
        const { marca_id, modelo, ano, preco, fipe, quilometragem, cambio, combustivel } = req.body;

        const [result] = await db.execute(`
            INSERT INTO Carros 
            (marca_id, modelo, ano, preco, fipe, quilometragem, cambio, combustivel, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Disponível')
        `, [marca_id, modelo, ano, preco, fipe, quilometragem, cambio, combustivel]);

        const carroId = result.insertId;
        const opcionais = req.body.opcionais;

        if (opcionais) {
            const lista = Array.isArray(opcionais) ? opcionais : [opcionais];
            for (const opcionalId of lista) {
                await db.execute(`INSERT INTO CarroOpcionais (carro_id, opcional_id) VALUES (?, ?)`, [carroId, opcionalId]);
            }
        }

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const caminho = file.path.split("public")[1].replace(/\\/g, "/");
                await db.execute(`INSERT INTO FotosCarro (carro_id, caminho) VALUES (?, ?)`, [carroId, caminho]);
            }
        }

        res.json({ mensagem: "Carro adicionado com sucesso!" });
    } catch (erro) {
        console.error("ERRO AO SALVAR:", erro);
        res.status(500).json({ mensagem: "Erro ao salvar carro" });
    }
});

// ==========================================
// ROTAS PÚBLICAS (API DO SITE)
// ==========================================

app.get("/carros", async (req, res) => {
    try {
        const pagina = parseInt(req.query.pagina) || 1;
        const limite = 12;
        const offset = (pagina - 1) * limite;

        const sqlCarros = `
            SELECT Carros.*, Marcas.nome AS marca,
            (SELECT caminho FROM FotosCarro WHERE carro_id = Carros.id LIMIT 1) AS imagem_principal
            FROM Carros JOIN Marcas ON Carros.marca_id = Marcas.id
            ORDER BY criado_em DESC LIMIT ? OFFSET ?
        `;
        const sqlTotal = `SELECT COUNT(*) AS total FROM Carros`;

        const [totalResult] = await db.query(sqlTotal);
        const totalPaginas = Math.ceil(totalResult[0].total / limite);
        const [carros] = await db.query(sqlCarros, [limite, offset]);

        res.json({ carros, totalPaginas });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao carregar carros" });
    }
});

app.get("/carros/destaques", async (req, res) => {
    try {
        const [carros] = await db.query(`
            SELECT Carros.*, Marcas.nome AS marca,
            (SELECT caminho FROM FotosCarro WHERE carro_id = Carros.id LIMIT 1) AS imagem_principal
            FROM Carros JOIN Marcas ON Carros.marca_id = Marcas.id
            ORDER BY destaque DESC, criado_em DESC LIMIT 6
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
            SELECT Carros.*, Marcas.nome AS marca,
            (SELECT caminho FROM FotosCarro WHERE carro_id = Carros.id LIMIT 1) AS imagem_principal
            FROM Carros JOIN Marcas ON Carros.marca_id = Marcas.id WHERE Carros.id = ?
        `, [id]);

        if (carros.length === 0) return res.status(404).json({ erro: "Carro não encontrado" });

        const carro = carros[0];
        const [fotos] = await db.query(`SELECT caminho FROM FotosCarro WHERE carro_id = ?`, [id]);
        carro.fotos = fotos;

        const [opcionais] = await db.query(`
            SELECT Opcionais.nome FROM CarroOpcionais
            JOIN Opcionais ON CarroOpcionais.opcional_id = Opcionais.id WHERE CarroOpcionais.carro_id = ?
        `, [id]);
        carro.opcionais = opcionais;

        res.json(carro);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao carregar detalhes do carro" });
    }
});

app.get("/carros/:id/relacionados", async (req, res) => {
    try {
        const id = req.params.id;
        const [carroAtual] = await db.query(`SELECT * FROM Carros WHERE id = ?`, [id]);
        const [todosCarros] = await db.query(`
            SELECT Carros.*, Marcas.nome AS marca,
            (SELECT caminho FROM FotosCarro WHERE carro_id = Carros.id LIMIT 1) AS imagem_principal
            FROM Carros JOIN Marcas ON Carros.marca_id = Marcas.id WHERE Carros.id != ?
        `, [id]);

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
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao buscar relacionados" });
    }
});

app.get("/vendedores", async (req, res) => {
    try {
        const [vendedores] = await db.query(`SELECT id, nome, telefone, email, foto FROM Vendedores`);
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

// INICIAR SERVIDOR
app.listen(3000, () => {
    console.log(" Servidor rodando em http://localhost:3000");
});