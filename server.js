require('dotenv').config();
const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                // Permite scripts do seu próprio site E do jsdelivr (SweetAlert)
                "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                "script-src-attr": ["'unsafe-inline'"],
                // Permite imagens normais do site e do banco de dados
                "img-src": ["'self'", "data:", "blob:", "https:"],
                "frame-src": ["'self'", "https://www.google.com", "https://maps.google.com"],
            },
        },
    })
);
app.use(express.json());

// Função para padronizar nomes (Ex: "paulo da silva" vira "Paulo Da Silva")
function padronizarTexto(texto) {
    if (!texto) return texto;
    return texto.toLowerCase().replace(/(?:^|\s)\S/g, function (letra) {
        return letra.toUpperCase();
    });
}

// ==========================================
// CONFIGURAÇÃO DO E-MAIL (GLOBAL)
// ==========================================
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ==========================================
// CONFIGURAÇÃO DA SESSÃO
// ==========================================
app.use(
    session({
        secret: "segredo-top",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
        },
    }),
);

// ==========================================
// PROTEÇÃO DE ROTAS (RATE LIMITING)
// ==========================================
const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Bloqueia após 5 tentativas erradas
    standardHeaders: true,
    message: { erro: "Muitas tentativas de login. Tente novamente em 15 minutos." } 
});

// Aplica a proteção ANTES da rota real de login
app.use('/login', limitadorLogin);

// ==========================================
// NOVO: ANTI-SPAM DO FORMULÁRIO DE CONTATO
// ==========================================
const limitadorContato = rateLimit({
    windowMs: 60 * 60 * 1000, // Tempo de bloqueio: 1 hora
    max: 3, // Máximo de 3 mensagens por IP dentro desta 1 hora
    standardHeaders: true,
    // Note que usamos "erro:" para o seu contato.js conseguir ler a mensagem no catch!
    message: { erro: "Você já enviou mensagens suficientes. Por favor, aguarde uma hora antes de tentar novamente." }
});

async function postarViaMake(carro, caminhoFotoLocal) {
    const webhookUrl = "https://hook.us2.make.com/61sorw7psjn55raa32iljw4lm0o3n1s4"; 

    const fotoFakeParaTeste = "https://www.w3schools.com/w3images/cars3.jpg";

    // 🧠 MONTA A LEGENDA NO BACKEND
    const legenda = `
🚗 ${carro.marca} ${carro.modelo}
📅 Ano: ${carro.ano}
🛣️ ${carro.quilometragem} km
⚙️ ${carro.cambio}
⛽ ${carro.combustivel}
💰 R$ ${carro.preco}

${carro.leilao ? "⚠️ LEILÃO" : ""}

📲 Entre em contato agora! numero 48989901958

`;

    try {
        await axios.post(webhookUrl, {
            legenda: legenda, // 👈 ENVIA PRONTO
            photos: [
                {
                    url: fotoFakeParaTeste
                }
            ]
        });

        console.log("✅ Post enviado com legenda pronta!");
    } catch (erro) {
        console.error("❌ Erro ao enviar para o Make:", erro.message);
    }
}

// PROTEÇÃO DA PÁGINA DE LOGIN
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
        // Se for API, erro 401 em JSON
        if (req.originalUrl.includes('/api/')) {
            return res.status(401).json({ erro: "Sessão expirada.", sessaoExpirada: true });
        }
        // Se for página, volta para o login com o aviso de inatividade
        return res.redirect("/login.html?erro=expirado");
    }

    // Se o utilizador está logado, mas tenta aceder a algo que não deve (Exemplo futuro)
    // res.redirect('/erro.html?tipo=401'); 

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
}
// ==========================================
// CONFIGURAÇÃO DE UPLOAD INTELIGENTE E UNIFICADA
// ==========================================
const storageInteligente = multer.diskStorage({
    destination: function (req, file, cb) {
        // SE A PASTA JÁ FOI CRIADA PARA ESTA REQUISIÇÃO, APENAS REUTILIZA!
        if (req.pastaUploadAtual) {
            return cb(null, req.pastaUploadAtual);
        }

        let pastaPrincipal = "outros";
        let subPasta = req.body.id || req.params.id;

        if (req.originalUrl.includes("carro")) {
            pastaPrincipal = "carros";
            if (!subPasta) {
                const modelo = req.body.modelo || "Modelo";
                subPasta = `${modelo}_${Date.now()}`.replace(/\s+/g, "_");
            }
        } else if (req.originalUrl.includes("vendedor")) {
            pastaPrincipal = "vendedores";
            const nome = req.body.nome || "Vendedor";
            subPasta = `${nome}_${Date.now()}`.replace(/\s+/g, "_");
        } else if (
            req.originalUrl.includes("perfil") ||
            req.originalUrl.includes("usuario") ||
            req.originalUrl.includes("atualizar-perfil")
        ) {
            pastaPrincipal = "usuarios";
            if (!subPasta) {
                const nome =
                    req.body.nome || req.session?.usuario?.nome || "Usuario";
                subPasta = `${nome}_${Date.now()}`.replace(/\s+/g, "_");
            }
        } else {
            if (!subPasta) subPasta = `novo_${Date.now()}`;
        }

        const caminhoCompleto = path.join(
            __dirname,
            `public/img/${pastaPrincipal}/${subPasta}`,
        );

        if (!fs.existsSync(caminhoCompleto)) {
            fs.mkdirSync(caminhoCompleto, { recursive: true });
        }

        // SALVA O CAMINHO NA REQUISIÇÃO PARA A PRÓXIMA FOTO USAR O MESMO LUGAR
        req.pastaUploadAtual = caminhoCompleto;
        cb(null, caminhoCompleto);
    },
    filename: function (req, file, cb) {
        // Um pequeno ajuste no filename para evitar que duas fotos tenham exatamente o mesmo nome
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const nomeSeguro = file.fieldname + "-" + uniqueSuffix + ext;
        cb(null, nomeSeguro);
    },
});

// A partir de agora, o sistema inteiro usa apenas este 'upload'!
const upload = multer({ 
    storage: storageInteligente, // Repare que ele puxa a sua variável inteligente aqui!
    limits: { fileSize: 5 * 1024 * 1024 }, // Trava de segurança: Máximo de 5MB por foto
    fileFilter: (req, file, cb) => {
        // Trava de segurança: Deixa passar apenas se for imagem (bloqueia .exe, .php, .pdf, etc)
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de imagem são permitidos.'));
        }
    }
});

// ==========================================
// CONEXÃO COM O BANCO DE DADOS
// ==========================================
let db;
async function conectarBanco() {
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
        });
        console.log("✅ Conectado ao MySQL");

        const queriesAlteracao = [
            `ALTER TABLE Usuarios ADD COLUMN foto VARCHAR(255) DEFAULT NULL`,
            `ALTER TABLE Usuarios ADD COLUMN token_email VARCHAR(255) DEFAULT NULL, ADD COLUMN novo_email_temp VARCHAR(255) DEFAULT NULL, ADD COLUMN expiracao_token BIGINT DEFAULT NULL`,
            `ALTER TABLE Usuarios ADD COLUMN token_senha VARCHAR(255) DEFAULT NULL, ADD COLUMN nova_senha_temp VARCHAR(255) DEFAULT NULL`,
            `ALTER TABLE Usuarios ADD COLUMN token_email_antigo VARCHAR(255) DEFAULT NULL, ADD COLUMN token_email_novo VARCHAR(255) DEFAULT NULL`,
            `ALTER TABLE Usuarios ADD COLUMN status VARCHAR(20) DEFAULT 'ativo', ADD COLUMN token_ativacao VARCHAR(255) DEFAULT NULL`,
            `ALTER TABLE FotosCarro ADD COLUMN is_capa BOOLEAN DEFAULT FALSE`,
        ];

        for (let query of queriesAlteracao) {
            try {
                await db.query(query);
            } catch (e) {
                if (e.code !== "ER_DUP_FIELDNAME")
                    console.error("Erro na alteração de tabela:", e);
            }
        }

        const [usuarios] = await db.query(
            "SELECT COUNT(*) as total FROM Usuarios",
        );
        if (usuarios[0].total === 0) {
            const senhaCriptografada = await bcrypt.hash("admin123", 10);
            await db.execute(
                `
                INSERT INTO Usuarios (nome, email, telefone, senha_hash, nivel, status) 
                VALUES (?, ?, ?, ?, ?, 'ativo')
            `,
                [
                    "Administrador",
                    "admin@revendedora.com.br",
                    "(00) 00000-0000",
                    senhaCriptografada,
                    "admin",
                ],
            );
        }
    } catch (erro) {
        console.error("❌ Erro ao conectar no banco:", erro);
    }
}
conectarBanco();

// ==========================================
// FUNÇÃO GLOBAL DE AUDITORIA
// ==========================================
async function registrarAuditoria(
    usuario_id,
    nome_usuario,
    acao,
    entidade,
    entidade_id,
    detalhes = null,
) {
    try {
        // Converte o objeto Javascript (ex: { nome: "João" }) para um texto JSON válido pro MySQL
        const detalhesParaSalvar = detalhes ? JSON.stringify(detalhes) : null;

        await db.execute(
            `INSERT INTO Auditoria 
            (usuario_id, nome_usuario, acao, entidade, entidade_id, detalhes) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                usuario_id,
                nome_usuario,
                acao,
                entidade,
                entidade_id,
                detalhesParaSalvar,
            ],
        );

        console.log(
            `[AUDITORIA] Ação '${acao}' registrada com sucesso em '${entidade}'.`,
        );
    } catch (erro) {
        // Se der erro, agora ele vai gritar no terminal qual foi o problema exato!
        console.error("❌ ERRO CRÍTICO AO SALVAR AUDITORIA:", erro);
    }
}

// ==========================================
// ROTA DA PÁGINA DE CAIXA DE ENTRADA (MENSAGENS)
// ==========================================
app.get("/admin/mensagens", verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin/mensagens.html"));
});

// ==========================================
// ROTA PARA RECEBER MENSAGENS DE CONTATO
// ==========================================
app.post("/api/contato", limitadorContato, async (req, res) => {
    const { nome, email, mensagem } = req.body;

    // Validação de segurança no backend
    if (!nome || !email || !mensagem) {
        return res
            .status(400)
            .json({ erro: "Preencha todos os campos obrigatórios." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ erro: "E-mail com formato inválido." });
    }

    try {
        // 1. SALVA A MENSAGEM NO BANCO DE DADOS (Nova funcionalidade!)
        await db.execute(
            "INSERT INTO Mensagens (nome, email, mensagem, lida) VALUES (?, ?, ?, FALSE)",
            [nome, email, mensagem],
        );

        // 2. ENVIA O E-MAIL
        const mailOptions = {
            from: `Site da Revendedora <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject: `Novo Contato pelo Site: ${nome}`,
            text: `Você recebeu uma nova mensagem de contato.\n\nNome: ${nome}\nE-mail: ${email}\n\nMensagem:\n${mensagem}`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            sucesso: true,
            mensagem: "Mensagem enviada com sucesso!",
        });
    } catch (error) {
        console.error("Erro ao processar mensagem de contato:", error);
        res.status(500).json({
            erro: "Erro interno do servidor ao enviar a mensagem.",
        });
    }
});

// ==========================================
// 1. ROTA PARA LISTAR MENSAGENS (Para a página Caixa de Entrada)
// ==========================================
app.get("/admin/api/mensagens", verificarLogin, async (req, res) => {
    try {
        const [mensagens] = await db.query(
            "SELECT * FROM Mensagens ORDER BY data_envio DESC",
        );
        res.json(mensagens);
    } catch (erro) {
        console.error("Erro ao buscar mensagens:", erro);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// ==========================================
// ROTA PARA MARCAR MENSAGEM COMO LIDA E AUDITAR
// ==========================================
app.put("/admin/api/mensagens/:id/ler", verificarLogin, async (req, res) => {
    try {
        const id = req.params.id;

        // Pega os dados do usuário que está logado no momento
        const usuarioId = req.session.usuario.id;
        const nomeUsuario = req.session.usuario.nome;

        // 1. Atualiza a mensagem marcando como lida e salvando QUEM leu
        await db.query(
            "UPDATE Mensagens SET lida = 1, lida_por = ? WHERE id = ?",
            [nomeUsuario, id],
        );

        // 2. Registra na sua tabela de Auditoria
        const detalhesAuditoria = JSON.stringify({
            acao: "Visualizou a mensagem de contato",
        });

        await db.query(
            `INSERT INTO Auditoria 
            (usuario_id, nome_usuario, acao, entidade, entidade_id, detalhes) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                usuarioId,
                nomeUsuario,
                "LEITURA",
                "Mensagens",
                id,
                detalhesAuditoria,
            ],
        );

        // 3. Responde para o Frontend enviar o nome pra tela
        res.json({
            mensagem: "Mensagem marcada como lida.",
            lida_por: nomeUsuario,
        });
    } catch (erro) {
        console.error("Erro ao marcar como lida e auditar:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// ==========================================
// ROTA PARA RESPONDER MENSAGEM POR E-MAIL
// ==========================================
app.post(
    "/admin/api/mensagens/:id/responder",
    verificarLogin,
    async (req, res) => {
        try {
            const id = req.params.id;
            const { texto_resposta } = req.body;

            const usuarioId = req.session.usuario.id;
            const nomeUsuario = req.session.usuario.nome;

            // 1. Busca os dados do cliente
            const [mensagens] = await db.query(
                "SELECT nome, email FROM Mensagens WHERE id = ?",
                [id],
            );

            if (mensagens.length === 0) {
                return res
                    .status(404)
                    .json({ erro: "Mensagem não encontrada." });
            }

            const cliente = mensagens[0];

            // 2. Monta e envia o e-mail
            const corpoEmail = `Olá, ${cliente.nome}.\n\n${texto_resposta}\n\nAtenciosamente,\n${nomeUsuario} - Equipe da Revendedora.`;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: cliente.email,
                subject: "Resposta à sua mensagem de contato - Revendedora",
                text: corpoEmail,
            };

            await transporter.sendMail(mailOptions);

            // 3. ATUALIZA A MENSAGEM NO BANCO (Respondida e QUEM respondeu)
            await db.query(
                "UPDATE Mensagens SET respondida = 1, respondida_em = NOW(), respondida_por = ? WHERE id = ?",
                [nomeUsuario, id],
            );

            // 4. Registra na Auditoria
            const detalhesAuditoria = JSON.stringify({
                acao: "Respondeu cliente via painel",
                email_destino: cliente.email,
                mensagem_enviada: texto_resposta.substring(0, 50) + "...",
            });

            await db.query(
                `INSERT INTO Auditoria 
            (usuario_id, nome_usuario, acao, entidade, entidade_id, detalhes) 
            VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    usuarioId,
                    nomeUsuario,
                    "RESPOSTA_EMAIL",
                    "Mensagens",
                    id,
                    detalhesAuditoria,
                ],
            );

            // Retorna o nome de quem respondeu para o Front-end atualizar a tela na hora!
            res.json({
                sucesso: true,
                mensagem: "E-mail enviado!",
                respondida_por: nomeUsuario,
            });
        } catch (erro) {
            console.error("Erro ao responder mensagem:", erro);
            res.status(500).json({ erro: "Erro ao tentar enviar o e-mail." });
        }
    },
);

// ==========================================
// . ROTA PARA CONTAR NÃO LIDAS (Para o balãozinho do cabeçalho)
// ==========================================
app.get("/admin/api/mensagens/nao-lidas", verificarLogin, async (req, res) => {
    try {
        const [resultado] = await db.query(
            "SELECT COUNT(*) as total FROM Mensagens WHERE lida = 0",
        );
        res.json({ total: resultado[0].total });
    } catch (erro) {
        console.error("Erro ao contar mensagens não lidas:", erro);
        res.json({ total: 0 });
    }
});

// ROTA PARA ABRIR A PÁGINA DA LIXEIRA
app.get("/admin/lixeira", verificarLogin, (req, res) => {
    // Bloqueia vendedores de acessarem a página pela URL
    if (req.session.usuario.nivel === "vendedor") {
        return res.redirect("/admin");
    }
    // Envia o arquivo HTML (verifique se o caminho bate com onde você salvou)
    res.sendFile(path.join(__dirname, "admin/lixeira.html"));
});

// ==========================================
// ROTAS DE Configuração de Limpeza da lixeira
// ==========================================

// Buscar quantos dias estão configurados
app.get(
    "/admin/api/configuracoes/limpeza",
    verificarLogin,
    async (req, res) => {
        try {
            const [rows] = await db.query(
                "SELECT valor FROM Configuracoes WHERE chave = 'dias_limpeza_lixeira'",
            );
            res.json({ dias: rows[0]?.valor || "30" });
        } catch (erro) {
            res.status(500).json({ erro: "Erro ao buscar configuração" });
        }
    },
);

// Alterar a quantidade de dias
app.post(
    "/admin/api/configuracoes/limpeza",
    verificarLogin,
    async (req, res) => {
        if (req.session.usuario.nivel !== "admin")
            return res.status(403).json({ erro: "Apenas administradores." });

        const { dias } = req.body;
        try {
            await db.query(
                "UPDATE Configuracoes SET valor = ? WHERE chave = 'dias_limpeza_lixeira'",
                [dias],
            );
            res.json({ sucesso: true, mensagem: "Configuração atualizada!" });
        } catch (erro) {
            res.status(500).json({ erro: "Erro ao salvar configuração" });
        }
    },
);

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================
app.post("/login", async (req, res) => {
    const { email, senha } = req.body;
    try {
        const [usuarios] = await db.query(
            "SELECT * FROM Usuarios WHERE email = ? AND status != 'pendente'",
            [email],
        );
        if (usuarios.length === 0)
            return res.status(401).json({
                erro: "E-mail ou senha incorretos, ou conta inativa.",
            });

        const user = usuarios[0];
        const senhaCorreta = await bcrypt.compare(senha, user.senha_hash);

        if (senhaCorreta) {
            req.session.usuario = {
                id: user.id,
                nome: user.nome,
                email: user.email,
                nivel: user.nivel,
            };
            return res.json({ sucesso: true });
        } else {
            return res.status(401).json({ erro: "E-mail ou senha incorretos" });
        }
    } catch (erro) {
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login.html");
});

// ROTA PARA ABRIR A PÁGINA DE HISTÓRICO DE VENDAS
app.get("/admin/historico-vendas", verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin/historico-vendas.html"));
});

// API PARA BUSCAR OS DADOS DE VENDAS
app.get("/admin/api/vendas", verificarLogin, async (req, res) => {
    try {
        // Busca os carros vendidos ordenados da venda mais recente para a mais antiga
        const [vendas] = await db.query(`
            SELECT c.id, c.modelo, c.ano, c.preco, c.vendido_em, c.imagem_principal, m.nome as marca_nome 
            FROM Carros c
            LEFT JOIN Marcas m ON c.marca_id = m.id
            WHERE c.status = 'vendido'
            ORDER BY c.vendido_em DESC
        `);
        res.json(vendas);
    } catch (erro) {
        console.error("Erro ao carregar histórico de vendas:", erro);
        res.status(500).json({ erro: "Erro interno do servidor" });
    }
});

// ==========================================
// ROTAS DE CONFIGURAÇÃO DO historico do sistema
// ==========================================

// Rota para LER a configuração atual
app.get("/admin/api/configuracoes/vendas", verificarLogin, async (req, res) => {
    try {
        const [config] = await db.query(
            "SELECT valor FROM Configuracoes WHERE chave = 'dias_exibicao_vendidos'",
        );

        // Se a configuração existir, retorna o valor. Se não, retorna 30 por padrão.
        const dias = config.length > 0 ? parseInt(config[0].valor) : 30;

        res.json({ dias: dias });
    } catch (erro) {
        console.error("Erro ao ler configuração:", erro);
        res.status(500).json({ erro: "Erro interno do servidor." });
    }
});

// Rota para ATUALIZAR a configuração
app.put("/admin/api/configuracoes/vendas", verificarLogin, async (req, res) => {
    const { dias } = req.body;

    if (dias === undefined || isNaN(dias) || dias < 0) {
        return res.status(400).json({ erro: "Valor inválido." });
    }

    try {
        // O INSERT ... ON DUPLICATE KEY UPDATE é ótimo aqui.
        // Se a chave não existir, ele cria. Se já existir, ele só atualiza o valor.
        await db.query(
            `INSERT INTO Configuracoes (chave, valor) 
             VALUES ('dias_exibicao_vendidos', ?) 
             ON DUPLICATE KEY UPDATE valor = ?`,
            [dias.toString(), dias.toString()],
        );

        // Opcional: Registrar na auditoria
        await registrarAuditoria(
            req.session.usuario.id,
            req.session.usuario.nome,
            "CONFIGUROU",
            "Sistema",
            null,
            { acao: "Alterou dias de exibição de vendidos", novos_dias: dias },
        );

        res.json({ mensagem: "Configuração atualizada com sucesso!" });
    } catch (erro) {
        console.error("Erro ao salvar configuração:", erro);
        res.status(500).json({
            erro: "Erro interno ao salvar no banco de dados.",
        });
    }
});

// ==========================================
// ROTA PARA LISTAR A TABELA DO HISTÓRICO
// ==========================================
app.get("/admin/api/vendas/historico", verificarLogin, async (req, res) => {
    try {
        const [vendas] = await db.query(`
            SELECT Carros.*, Marcas.nome AS marca 
            FROM Carros 
            LEFT JOIN Marcas ON Carros.marca_id = Marcas.id 
            WHERE Carros.status = 'Vendido' 
            ORDER BY Carros.vendido_em DESC
        `);
        res.json(vendas);
    } catch (erro) {
        console.error("Erro ao buscar histórico de vendas:", erro);
        res.status(500).json({ erro: "Erro interno do servidor." });
    }
});

// ==========================================
// ROTAS DO PAINEL ADMIN E USUÁRIOS
// ==========================================
app.get("/admin", verificarLogin, (req, res) =>
    res.sendFile(path.join(__dirname, "admin/dashboard.html")),
);
app.get("/admin/adicionar", verificarLogin, (req, res) =>
    res.sendFile(path.join(__dirname, "admin/adicionar-carro.html")),
);
app.get("/admin/perfil", verificarLogin, (req, res) =>
    res.sendFile(path.join(__dirname, "admin/perfil.html")),
);
app.get("/admin/usuarios", verificarLogin, (req, res) => {
    if (req.session.usuario.nivel === "vendedor") return res.redirect("/admin");
    res.sendFile(path.join(__dirname, "admin/usuarios.html"));
});
app.get("/admin/gerenciar-carros", verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin/gerenciar-carros.html"));
});

app.get("/admin/adicionar-vendedor", verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin/adicionar-vendedor.html"));
});
app.get("/admin/modificar-vendedores", verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin/modificar-vendedores.html"));
});

// ROTA PARA BUSCAR E LISTAR OS VENDEDORES NA TELA
app.get("/admin/api/vendedores", verificarLogin, async (req, res) => {
    try {
        // Busca todos os vendedores cadastrados no banco
        const [vendedores] = await db.query(
            "SELECT * FROM Vendedores ORDER BY id DESC",
        );
        res.json(vendedores);
    } catch (erro) {
        console.error("Erro ao listar vendedores:", erro);
        res.status(500).json({ erro: "Erro ao buscar a lista de vendedores." });
    }
});



// ==========================================
// ROTA PARA ESTATÍSTICAS DO DASHBOARD
// ==========================================
app.get("/admin/api/estatisticas", verificarLogin, async (req, res) => {
    try {
        // 0. Busca a configuração de dias do histórico (se não achar, assume 30)
        let diasExibicao = 30;
        try {
            const [configDias] = await db.query(
                "SELECT valor FROM Configuracoes WHERE chave = 'dias_exibicao_vendidos'",
            );
            if (configDias.length > 0)
                diasExibicao = parseInt(configDias[0].valor);
        } catch (e) {} // Ignora se a tabela não existir

        // 1. Veículos disponíveis no estoque
        const [estoqueResult] = await db.query(
            "SELECT COUNT(*) AS total FROM Carros WHERE status = 'Disponível'",
        );

        // 2. Veículos vendidos (obedecendo a regra dos dias que o usuário configurou!)
        const [vendidosResult] = await db.query(
            "SELECT COUNT(*) AS total FROM Carros WHERE status = 'Vendido' AND vendido_em >= NOW() - INTERVAL ? DAY",
            [diasExibicao],
        );

        // 3. Vendedores Ativos
        let totalVendedores = 0;
        try {
            const [vendedoresResult] = await db.query(
                "SELECT COUNT(*) AS total FROM Vendedores WHERE status = 'ativo'",
            );
            totalVendedores = vendedoresResult[0].total;
        } catch (e) {}

        // 4. Mensagens não lidas
        let totalMensagens = 0;
        try {
            const [mensagensResult] = await db.query(
                "SELECT COUNT(*) AS total FROM Mensagens WHERE lida = 0 OR lida = FALSE",
            );
            totalMensagens = mensagensResult[0].total;
        } catch (e) {}

        // Envia tudo mastigadinho para o frontend
        res.json({
            estoque: estoqueResult[0].total,
            vendidos: vendidosResult[0].total,
            vendedores: totalVendedores,
            mensagens_nao_lidas: totalMensagens,
        });
    } catch (erro) {
        console.error("Erro ao buscar estatísticas do dashboard:", erro);
        res.status(500).json({ erro: "Erro ao buscar dados." });
    }
});

// API para alimentar a tabela do painel administrativo com os veículos
app.get("/admin/api/carros", verificarLogin, async (req, res) => {
    try {
        const [carros] = await db.query(`
    SELECT Carros.*, Marcas.nome AS marca 
    FROM Carros 
    JOIN Marcas ON Carros.marca_id = Marcas.id 
    WHERE Carros.status = 'Disponível' 
    OR (Carros.status = 'Vendido' AND Carros.vendido_em >= NOW() - INTERVAL 30 DAY)
    ORDER BY Carros.criado_em DESC
`);
        res.json(carros);
    } catch (erro) {
        console.error("Erro ao buscar carros para o admin:", erro);
        res.status(500).json({
            erro: "Erro ao buscar os veículos do sistema.",
        });
    }
});

// BUSCAR DADOS ATUALIZADOS DO BANCO (Incluindo a Foto)
app.get("/admin/me", verificarLogin, async (req, res) => {
    try {
        const idUsuario = req.session.usuario.id;
        // Puxa as informações fresquinhas do Banco de Dados, incluindo a foto!
        const [usuarios] = await db.query(
            "SELECT id, nome, email, nivel, foto FROM Usuarios WHERE id = ?",
            [idUsuario],
        );

        if (usuarios.length > 0) {
            res.json(usuarios[0]);
        } else {
            res.status(404).json({ erro: "Usuário não encontrado" });
        }
    } catch (erro) {
        console.error("Erro ao buscar meus dados:", erro);
        res.status(500).json({ erro: "Erro ao buscar dados do perfil" });
    }
});

app.get("/admin/api/usuarios", verificarLogin, async (req, res) => {
    try {
        if (req.session.usuario.nivel === "vendedor")
            return res.status(403).json({ erro: "Acesso negado." });
        const [usuarios] = await db.query(
            "SELECT id, nome, email, nivel, foto, status, criado_em FROM Usuarios WHERE status = 'ativo'",
        );
        res.json(usuarios);
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao buscar usuários" });
    }
});

// ROTA PARA ATUALIZAR O PERFIL DO USUÁRIO (NOME E FOTO)

app.put(
    "/admin/api/atualizar-perfil",
    verificarLogin,
    upload.single("foto"),
    async (req, res) => {
        try {
            const idUsuario = req.session.usuario.id;
            const { nome } = req.body; // Pega o nome vindo do FormData

            // =========================================================
            // 1. ANTES DE TUDO: Buscar a foto antiga no banco de dados
            // =========================================================
            const [registroAntigo] = await db.execute(
                "SELECT foto FROM Usuarios WHERE id = ?",
                [idUsuario],
            );
            const fotoAntiga =
                registroAntigo.length > 0 ? registroAntigo[0].foto : null;

            // Verifica se o usuário enviou uma foto nova
            let caminhoFoto = req.file
                ? "/img/usuarios/" +
                  path.basename(req.pastaUploadAtual) +
                  "/" +
                  req.file.filename
                : null;

            if (caminhoFoto) {
                // Atualiza o NOME e a FOTO no banco de dados
                await db.execute(
                    "UPDATE Usuarios SET nome = ?, foto = ? WHERE id = ?",
                    [nome, caminhoFoto, idUsuario],
                );
                req.session.usuario.nome = nome; // Atualiza o nome na sessão atual

                // =========================================================
                // 2. A FAXINA: Se enviou foto nova E tinha foto antiga, apaga a antiga!
                // =========================================================
                if (fotoAntiga) {
                    try {
                        const caminhoRelativo = fotoAntiga.replace(
                            /^[/\\]/,
                            "",
                        );
                        const caminhoAbsoluto = path.join(
                            __dirname,
                            "public",
                            caminhoRelativo,
                        );

                        // Deleta o arquivo da foto
                        if (fs.existsSync(caminhoAbsoluto)) {
                            fs.unlinkSync(caminhoAbsoluto);
                        }

                        // Deleta a pasta se ficar vazia
                        const pastaAntiga = path.dirname(caminhoAbsoluto);
                        if (
                            fs.existsSync(pastaAntiga) &&
                            fs.readdirSync(pastaAntiga).length === 0
                        ) {
                            fs.rmdirSync(pastaAntiga);
                        }
                        console.log(
                            "[SISTEMA] Foto antiga do perfil apagada com sucesso.",
                        );
                    } catch (err) {
                        console.error(
                            "[ERRO] Falha ao apagar foto antiga do perfil:",
                            err,
                        );
                    }
                }

                // Registra na auditoria
                await registrarAuditoria(
                    idUsuario,
                    nome,
                    "ATUALIZOU",
                    "Usuarios",
                    idUsuario,
                    { alteracao: "Editou o próprio perfil (Nome e Foto)" },
                );

                // Devolve a URL da nova foto para o frontend atualizar a tela instantaneamente
                res.json({ sucesso: true, novaUrlFoto: caminhoFoto });
            } else {
                // Se NÃO enviou foto, atualiza APENAS o NOME
                await db.execute("UPDATE Usuarios SET nome = ? WHERE id = ?", [
                    nome,
                    idUsuario,
                ]);
                req.session.usuario.nome = nome; // Atualiza o nome na sessão atual

                await registrarAuditoria(
                    idUsuario,
                    nome,
                    "ATUALIZOU",
                    "Usuarios",
                    idUsuario,
                    { alteracao: "Editou o próprio perfil (Apenas Nome)" },
                );

                res.json({ sucesso: true });
            }
        } catch (erro) {
            console.error("Erro ao atualizar perfil:", erro);
            res.status(500).json({
                mensagem:
                    "Ocorreu um erro ao tentar salvar os dados do perfil.",
            });
        }
    },
);

// CRIAR USUÁRIO
app.post(
    "/admin/usuarios",
    verificarLogin,
    upload.single("foto"),
    async (req, res) => {
        try {
            const meuNivel = req.session.usuario.nivel;
            let { nome, email, senha, nivel } = req.body;
            nome = padronizarTexto(nome);

            if (meuNivel === "vendedor")
                return res.status(403).json({ erro: "Acesso negado." });
            if (
                meuNivel === "gerente" &&
                (nivel === "admin" || nivel === "gerente")
            ) {
                return res
                    .status(403)
                    .json({ erro: "Gerentes só podem cadastrar vendedores." });
            }

            let caminhoFoto = req.file
                ? "/img/usuarios/" +
                  path.basename(req.pastaUploadAtual) +
                  "/" +
                  req.file.filename
                : null;
            const senhaCriptografada = await bcrypt.hash(senha, 10);
            const tokenAtivacao = crypto.randomBytes(20).toString("hex");

            const [resultUser] = await db.execute(
                `
            INSERT INTO Usuarios (nome, email, senha_hash, nivel, foto, status, token_ativacao) 
            VALUES (?, ?, ?, ?, ?, 'pendente', ?)
        `,
                [
                    nome,
                    email,
                    senhaCriptografada,
                    nivel,
                    caminhoFoto,
                    tokenAtivacao,
                ],
            );

            await registrarAuditoria(
                req.session.usuario.id,
                req.session.usuario.nome,
                "CRIOU",
                "Usuarios",
                resultUser.insertId,
                { nome: nome, nivel: nivel, email: email },
            );

            const linkAtivacao = `http://localhost:3000/admin/api/ativar-conta/${tokenAtivacao}`;
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Bem-vindo! Ative sua conta no sistema.",
                html: `<p>Olá, ${nome}!</p><p>Clique no link para ativar sua conta: <a href="${linkAtivacao}">${linkAtivacao}</a></p>`,
            };
            await transporter.sendMail(mailOptions);

            res.json({
                sucesso: true,
                mensagem: "E-mail de ativação enviado.",
            });
        } catch (erro) {
            if (erro.code === "ER_DUP_ENTRY")
                return res.status(400).json({ erro: "E-mail já cadastrado!" });
            res.status(500).json({ erro: "Erro ao salvar usuário." });
        }
    },
);

//Solicitar o link de recuperação
app.post("/api/esqueceu-senha", async (req, res) => {
    const { email } = req.body;

    try {
        // Busca o usuário pelo e-mail na tabela Usuarios
        const [usuarios] = await db.query(
            "SELECT id, nome FROM Usuarios WHERE email = ?",
            [email],
        );

        // Por segurança, se o e-mail não existir, não avisamos o invasor.
        // Apenas dizemos que o processo foi iniciado.
        if (usuarios.length === 0) {
            return res.status(200).json({
                mensagem:
                    "Se este e-mail estiver cadastrado, um link de recuperação será enviado.",
            });
        }

        const usuario = usuarios[0];
        // Cria um token aleatório e define validade de 1 hora
        const token = crypto.randomBytes(20).toString("hex");
        const validade = new Date(Date.now() + 3600000); // +1 hora

        // Salva o token no banco de dados
        await db.query(
            "UPDATE Usuarios SET reset_token = ?, reset_expires = ? WHERE id = ?",
            [token, validade, usuario.id],
        );

        const link = `http://${req.headers.host}/redefinir-senha.html?token=${token}`;

        // Envia o e-mail usando o transporter que você já configurou
        await transporter.sendMail({
            from: `"Sistema de Revenda" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Recuperação de Senha",
            html: `
                <div style="font-family: sans-serif; color: #333;">
                    <h2>Olá, ${usuario.nome}!</h2>
                    <p>Você solicitou a redefinição de senha para sua conta no sistema.</p>
                    <p>Clique no botão abaixo para criar uma nova senha. Este link expira em 1 hora.</p>
                    <a href="${link}" style="display: inline-block; padding: 12px 20px; background-color: #a00b0b; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Minha Senha</a>
                    <br><br>
                    <p>Se você não solicitou isso, ignore este e-mail.</p>
                </div>
            `,
        });

        res.json({ mensagem: "E-mail de recuperação enviado com sucesso!" });
    } catch (erro) {
        console.error("Erro ao recuperar senha:", erro);
        res.status(500).json({ mensagem: "Erro interno no servidor." });
    }
});

//Salvar a nova senha
app.post("/api/redefinir-senha", async (req, res) => {
    const { token, novaSenha } = req.body;

    try {
        // Verifica se o token existe e ainda é válido (data atual menor que reset_expires)
        const [usuarios] = await db.query(
            "SELECT id FROM Usuarios WHERE reset_token = ? AND reset_expires > NOW()",
            [token],
        );

        if (usuarios.length === 0) {
            return res.status(400).json({
                mensagem: "O link de recuperação é inválido ou já expirou.",
            });
        }

        // Criptografa a nova senha (usando bcrypt que você já tem no server.js)
        const hash = await bcrypt.hash(novaSenha, 10);

        // Atualiza a senha e limpa o token para não ser usado de novo
        await db.query(
            "UPDATE Usuarios SET senha_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?",
            [hash, usuarios[0].id],
        );

        res.json({
            mensagem:
                "Senha alterada com sucesso! Agora você já pode fazer login.",
        });
    } catch (erro) {
        console.error("Erro ao salvar nova senha:", erro);
        res.status(500).json({ mensagem: "Erro ao processar sua nova senha." });
    }
});

// ATUALIZAR CARGO DE USUÁRIO
app.put("/admin/usuarios/:id/nivel", verificarLogin, async (req, res) => {
    try {
        if (req.session.usuario.nivel !== "admin")
            return res
                .status(403)
                .json({ erro: "Apenas admins podem mudar cargos." });
        const { novoNivel } = req.body;
        const idUsuario = req.params.id;

        const [usuarioAntigo] = await db.query(
            "SELECT nome, nivel FROM Usuarios WHERE id = ?",
            [idUsuario],
        );
        await db.execute("UPDATE Usuarios SET nivel = ? WHERE id = ?", [
            novoNivel,
            idUsuario,
        ]);
        await registrarAuditoria(
            req.session.usuario.id,
            req.session.usuario.nome,
            "ATUALIZOU",
            "Usuarios",
            idUsuario,
            {
                nome: usuarioAntigo[0].nome,
                cargo_antigo: usuarioAntigo[0].nivel,
                cargo_novo: novoNivel,
            },
        );

        res.json({ sucesso: true, mensagem: "Cargo atualizado!" });
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao atualizar cargo." });
    }
});

// DELETAR USUÁRIO (Soft Delete - Enviar para a Lixeira)
app.delete("/admin/usuarios/:id", verificarLogin, async (req, res) => {
    try {
        if (req.session.usuario.nivel !== "admin")
            return res
                .status(403)
                .json({ erro: "Apenas admins podem excluir usuários." });

        const idUsuario = req.params.id;

        if (idUsuario == req.session.usuario.id)
            return res.status(400).json({ erro: "Você não pode se deletar!" });

        const [usuarioAlvo] = await db.query(
            "SELECT nome, email FROM Usuarios WHERE id = ?",
            [idUsuario],
        );

        await db.execute(
            "UPDATE Usuarios SET status = 'deletado', deletado_em = NOW() WHERE id = ?",
            [idUsuario],
        );

        // Registo na Auditoria a informar que foi para a lixeira
        await registrarAuditoria(
            req.session.usuario.id,
            req.session.usuario.nome,
            "DELETOU",
            "Usuarios",
            idUsuario,
            {
                nome: usuarioAlvo[0].nome,
                email: usuarioAlvo[0].email,
                status: "Movido para a Lixeira",
            },
        );

        res.json({ sucesso: true, mensagem: "Usuário movido para a lixeira!" });
    } catch (erro) {
        res.status(500).json({
            erro: "Erro ao enviar utilizador para a lixeira.",
        });
    }
});

// ==========================================
// ROTAS DE RECUPERAÇÃO/ALTERAÇÃO (PERFIL)
// ==========================================

app.get("/admin/api/ativar-conta/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const [usuarios] = await db.query(
            "SELECT id FROM Usuarios WHERE token_ativacao = ?",
            [token],
        );
        if (usuarios.length === 0)
            return res.redirect(
                `/status.html?tipo=erro&msg=O link de ativação é inválido ou sua conta já foi ativada.`,
            );

        await db.execute(
            `UPDATE Usuarios SET status = 'ativo', token_ativacao = NULL WHERE id = ?`,
            [usuarios[0].id],
        );
        return res.redirect(
            `/status.html?tipo=sucesso&msg=Sua conta foi ativada com sucesso. Você já pode fazer login.`,
        );
    } catch (erro) {
        return res.redirect(
            `/status.html?tipo=erro&msg=Ocorreu um erro interno ao tentar ativar sua conta.`,
        );
    }
});

app.post(
    "/admin/api/solicitar-alteracao-email",
    verificarLogin,
    async (req, res) => {
        try {
            const { novoEmail } = req.body;
            const usuarioLogado = req.session.usuario;
            const tokenAntigo = crypto.randomBytes(20).toString("hex");
            const tokenNovo = crypto.randomBytes(20).toString("hex");
            const tempoExpiracao = Date.now() + 3600000;

            await db.execute(
                `UPDATE Usuarios SET token_email_antigo = ?, token_email_novo = ?, novo_email_temp = ?, expiracao_token = ? WHERE id = ?`,
                [
                    tokenAntigo,
                    tokenNovo,
                    novoEmail,
                    tempoExpiracao,
                    usuarioLogado.id,
                ],
            );

            const linkAntigo = `http://localhost:3000/admin/api/confirmar-email/${tokenAntigo}`;
            const linkNovo = `http://localhost:3000/admin/api/confirmar-email/${tokenNovo}`;

            await transporter.sendMail({
                from: `<${process.env.EMAIL_USER}>`,
                to: usuarioLogado.email,
                subject: "Confirme a troca do seu e-mail",
                html: `<p>Para autorizar a troca de e-mail, clique: <a href="${linkAntigo}">${linkAntigo}</a></p>`,
            });
            await transporter.sendMail({
                from: `<${process.env.EMAIL_USER}>`,
                to: novoEmail,
                subject: "Confirme seu Novo E-mail",
                html: `<p>Para confirmar este novo e-mail, clique: <a href="${linkNovo}">${linkNovo}</a></p>`,
            });

            res.json({
                sucesso: true,
                mensagem:
                    "Enviamos links para o e-mail ATUAL e NOVO. Confirme em ambos!",
            });
        } catch (erro) {
            res.status(500).json({
                mensagem:
                    "Erro interno ao tentar enviar e-mails de confirmação.",
            });
        }
    },
);

app.get("/admin/api/confirmar-email/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const [usuarios] = await db.query(
            "SELECT id, novo_email_temp, expiracao_token, token_email_antigo, token_email_novo FROM Usuarios WHERE token_email_antigo = ? OR token_email_novo = ?",
            [token, token],
        );

        if (usuarios.length === 0)
            return res.redirect(
                `/status.html?tipo=erro&msg=Link inválido ou já utilizado.`,
            );
        let user = usuarios[0];
        if (Date.now() > user.expiracao_token)
            return res.redirect(`/status.html?tipo=erro&msg=O link expirou.`);

        if (user.token_email_antigo === token)
            (await db.execute(
                `UPDATE Usuarios SET token_email_antigo = 'OK' WHERE id = ?`,
                [user.id],
            ),
                (user.token_email_antigo = "OK"));
        else if (user.token_email_novo === token)
            (await db.execute(
                `UPDATE Usuarios SET token_email_novo = 'OK' WHERE id = ?`,
                [user.id],
            ),
                (user.token_email_novo = "OK"));

        if (
            user.token_email_antigo === "OK" &&
            user.token_email_novo === "OK"
        ) {
            await db.execute(
                `UPDATE Usuarios SET email = ?, token_email_antigo = NULL, token_email_novo = NULL, novo_email_temp = NULL, expiracao_token = NULL WHERE id = ?`,
                [user.novo_email_temp, user.id],
            );
            return res.redirect(
                `/status.html?tipo=sucesso&msg=A troca de e-mail foi concluída com sucesso!`,
            );
        } else {
            return res.redirect(
                `/status.html?tipo=aviso&msg=E-mail confirmado. Agora confirme no outro endereço de e-mail para finalizar.`,
            );
        }
    } catch (erro) {
        return res.redirect(
            `/status.html?tipo=erro&msg=Erro interno ao processar confirmação.`,
        );
    }
});

app.post(
    "/admin/api/solicitar-alteracao-senha",
    verificarLogin,
    async (req, res) => {
        try {
            const { senhaAtual, novaSenha } = req.body;
            const [usuarios] = await db.query(
                "SELECT senha_hash, email FROM Usuarios WHERE id = ?",
                [req.session.usuario.id],
            );

            if (!(await bcrypt.compare(senhaAtual, usuarios[0].senha_hash)))
                return res
                    .status(401)
                    .json({ mensagem: "A senha atual está incorreta." });

            const token = crypto.randomBytes(20).toString("hex");
            await db.execute(
                `UPDATE Usuarios SET token_senha = ?, nova_senha_temp = ?, expiracao_token = ? WHERE id = ?`,
                [
                    token,
                    await bcrypt.hash(novaSenha, 10),
                    Date.now() + 3600000,
                    req.session.usuario.id,
                ],
            );

            const linkConfirmacao = `http://localhost:3000/admin/api/confirmar-senha/${token}`;
            await transporter.sendMail({
                from: `<${process.env.EMAIL_USER}>`,
                to: usuarios[0].email,
                subject: "Confirmação - Troca de Senha",
                html: `<p>Para confirmar a nova senha, clique: <a href="${linkConfirmacao}">${linkConfirmacao}</a></p>`,
            });
            res.json({
                sucesso: true,
                mensagem: "E-mail de confirmação enviado.",
            });
        } catch (erro) {
            res.status(500).json({
                mensagem: "Erro ao processar a troca de senha.",
            });
        }
    },
);

app.get("/admin/api/confirmar-senha/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const [usuarios] = await db.query(
            "SELECT id, nova_senha_temp, expiracao_token FROM Usuarios WHERE token_senha = ?",
            [token],
        );

        if (usuarios.length === 0)
            return res.redirect(
                `/status.html?tipo=erro&msg=Link inválido ou já utilizado.`,
            );
        if (Date.now() > usuarios[0].expiracao_token)
            return res.redirect(
                `/status.html?tipo=erro&msg=O tempo para troca esgotou.`,
            );

        await db.execute(
            `UPDATE Usuarios SET senha_hash = ?, token_senha = NULL, nova_senha_temp = NULL, expiracao_token = NULL WHERE id = ?`,
            [usuarios[0].nova_senha_temp, usuarios[0].id],
        );
        return res.redirect(
            `/status.html?tipo=sucesso&msg=Senha alterada com sucesso! Você já pode utilizá-la.`,
        );
    } catch (erro) {
        return res.redirect(
            `/status.html?tipo=erro&msg=Erro ao confirmar senha.`,
        );
    }
});

// ==========================================
// ROTAS DE AUDITORIA
// ==========================================
app.get("/admin/auditoria", verificarLogin, (req, res) => {
    if (req.session.usuario.nivel === "vendedor") return res.redirect("/admin");
    res.sendFile(path.join(__dirname, "admin/auditoria.html"));
});

app.get("/admin/api/auditoria", verificarLogin, async (req, res) => {
    try {
        if (req.session.usuario.nivel === "vendedor")
            return res.status(403).json({ erro: "Acesso negado à auditoria." });
        const [logs] = await db.query(
            "SELECT * FROM Auditoria ORDER BY data_hora DESC LIMIT 200",
        );
        res.json(logs);
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao carregar os logs do sistema." });
    }
});

// ==========================================
// ROTAS DE GESTÃO DE CARROS
// ==========================================

// ==========================================
// ADICIONAR CARRO
// ==========================================
app.post(
    "/admin/adicionar-carro",
    verificarLogin,
    upload.array("fotos", 5),
    async (req, res) => {
        try {
            let {
                marca_id,
                modelo,
                ano,
                preco,
                fipe,
                quilometragem,
                km, // Caso o frontend envie como 'km'
                cambio,
                combustivel,
                combustivel_nome, // Que nós arrumamos no frontend
                leilao,
                postar_redes // Capturamos o checkbox das redes sociais
            } = req.body;

            // Pega o combustível correto
            if (!combustivel) combustivel = combustivel_nome || "Flex";

            const opcionais = req.body.opcionais;

            let leilaoValor = 0;
            if (leilao === "on" || leilao === "Sim" || leilao === "1" || leilao === 1 || leilao === true) {
                leilaoValor = 1;
            }

            let temOpcionais = 0;
            if (opcionais && (Array.isArray(opcionais) ? opcionais.length > 0 : true)) {
                temOpcionais = 1;
            }

            const [result] = await db.execute(
                `INSERT INTO Carros 
                (marca_id, modelo, ano, preco, fipe, quilometragem, cambio, combustivel, status, leilao, Opcionais)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Disponível', ?, ?)`,
                [marca_id, modelo, ano, preco, fipe || null, quilometragem || km, cambio, combustivel, leilaoValor, temOpcionais],
            );

            const carroId = result.insertId;

            if (opcionais) {
                const lista = Array.isArray(opcionais) ? opcionais : [opcionais];
                for (const opcionalId of lista) {
                    await db.execute(
                        `INSERT INTO CarroOpcionais (carro_id, opcional_id) VALUES (?, ?)`,
                        [carroId, opcionalId],
                    );
                }
            }

            // Variável para guardar o caminho da foto para o webhook do Make
            let imagemCapaParaMake = null;

            if (req.files && req.files.length > 0) {
                let subPasta = path.basename(req.pastaUploadAtual);
                for (let i = 0; i < req.files.length; i++) {
                    const foto = req.files[i];
                    const caminhoFoto = `/img/carros/${subPasta}/${foto.filename}`;

                    await db.execute(
                        "INSERT INTO FotosCarro (carro_id, caminho) VALUES (?, ?)",
                        [carroId, caminhoFoto],
                    );

                    if (i === 0) {
                        // Salva o caminho para o banco de dados
                        await db.execute(
                            "UPDATE Carros SET imagem_principal = ? WHERE id = ?",
                            [caminhoFoto, carroId],
                        );
                        // Guarda o caminho para enviar pro Make depois
                        imagemCapaParaMake = caminhoFoto; 
                    }
                }
            }

            await registrarAuditoria(
                req.session.usuario.id,
                req.session.usuario.nome,
                "CRIOU",
                "Carros",
                carroId,
                { modelo: modelo, preco: preco },
            );

            // ==========================================
            // AUTOMAÇÃO: ENVIAR PARA O MAKE.COM
            // ==========================================
            const vaiPostarNasRedes = postar_redes === 'on' || postar_redes === 'true' || postar_redes === '1';

            if (vaiPostarNasRedes) {
                // Busca o nome da marca direto do banco para ficar seguro
                let nomeDaMarca = "Marca";
                const [marcaDb] = await db.execute("SELECT nome FROM Marcas WHERE id = ?", [marca_id]);
                if (marcaDb.length > 0) {
                    nomeDaMarca = marcaDb[0].nome;
                }

                // ==========================================
                // 🚀 AQUI ESTAVA O PROBLEMA! AGORA VAI TUDO:
                // ==========================================
                const dadosDoCarro = {
                    marca: nomeDaMarca,
                    modelo: modelo || "Não informado",
                    preco: preco || "0,00",
                    ano: ano || "Não informado",
                    quilometragem: quilometragem || km || "0",
                    cambio: cambio || "Não informado",
                    combustivel: combustivel || "Não informado",
                    leilao: leilaoValor === 1 ? true : false
                };

                // Executa em background
                postarViaMake(dadosDoCarro, imagemCapaParaMake);
            }

            res.json({ mensagem: "Carro adicionado com sucesso!" });
        } catch (erro) {
            console.error("ERRO AO SALVAR:", erro);
            res.status(500).json({ erro: "Erro ao salvar carro" });
        }
    },
);

// ==========================================
// ROTA: Editar veiculo (Com gerenciamento inteligente de pastas)
// ==========================================
app.put("/admin/carros/:id", upload.array("fotos", 5), async (req, res) => {
    const id = req.params.id;
    
    const { 
        marca_id, modelo, ano, preco, quilometragem, fipe, 
        cambio, combustivel, leilao, destaque 
    } = req.body;

    try {
        // Busca o carro atual para saber o modelo e os preços antes da edição
        const [carroAtual] = await db.query("SELECT modelo, preco, preco_antigo, imagem_principal FROM Carros WHERE id = ?", [id]);
        if (carroAtual.length === 0) {
            return res.status(404).json({ mensagem: "Carro não encontrado." });
        }

        // --- LÓGICA DE GERENCIAMENTO DE PASTAS ---
        // Função para formatar o nome da pasta (Ex: "1-honda-civic")
        const formatarNomePasta = (carroId, nomeModelo) => {
            const limpo = nomeModelo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
            return `${carroId}-${limpo}`;
        };

        const modeloAntigo = carroAtual[0].modelo;
        const pastaAntigaNome = formatarNomePasta(id, modeloAntigo);
        const pastaNovaNome = formatarNomePasta(id, modelo);

        const diretorioBase = path.join(__dirname, "public", "uploads", "carros"); // Sugiro agrupar tudo dentro de /uploads/carros/
        const pastaAntigaPath = path.join(diretorioBase, pastaAntigaNome);
        const pastaNovaPath = path.join(diretorioBase, pastaNovaNome);

        // Se a pasta principal /uploads/carros não existir, ela é criada
        if (!fs.existsSync(diretorioBase)) fs.mkdirSync(diretorioBase, { recursive: true });

        // Se o nome do modelo mudou, renomeia a pasta e atualiza o banco de dados
        if (modeloAntigo !== modelo && fs.existsSync(pastaAntigaPath)) {
            fs.renameSync(pastaAntigaPath, pastaNovaPath);
            
            // Atualiza os caminhos das fotos antigas no Banco de Dados
            const caminhoAntigoDB = `/uploads/carros/${pastaAntigaNome}/`;
            const caminhoNovoDB = `/uploads/carros/${pastaNovaNome}/`;
            
            await db.query(`UPDATE FotosCarro SET caminho = REPLACE(caminho, ?, ?) WHERE carro_id = ?`, [caminhoAntigoDB, caminhoNovoDB, id]);
            await db.query(`UPDATE Carros SET imagem_principal = REPLACE(imagem_principal, ?, ?) WHERE id = ?`, [caminhoAntigoDB, caminhoNovoDB, id]);
        } else if (!fs.existsSync(pastaNovaPath)) {
            // Se o modelo é o mesmo, mas a pasta não existe ainda, cria.
            fs.mkdirSync(pastaNovaPath, { recursive: true });
        }
        // -----------------------------------------

        // Lógica do preço antigo
        let precoAntigoParaSalvar = carroAtual[0].preco_antigo;
        const precoNovo = Number(preco);
        const precoNoBanco = Number(carroAtual[0].preco);

        if (precoNovo < precoNoBanco) {
            precoAntigoParaSalvar = precoNoBanco;
        } else if (precoNovo > precoNoBanco) {
            precoAntigoParaSalvar = null;
        }

        // Tratar Checkboxes e Opcionais
        const vLeilao = (leilao === "Sim" || leilao === "1" || leilao === 1) ? 1 : 0;
        const vDestaque = (destaque === "1" || destaque === 1 || destaque === "true") ? 1 : 0;
        let opcionaisArray = req.body.opcionais ? (Array.isArray(req.body.opcionais) ? req.body.opcionais : [req.body.opcionais]) : [];
        const temOpcionais = opcionaisArray.length > 0 ? 1 : 0;

        // Atualizar Carro no Banco
        const sqlUpdate = `
            UPDATE Carros 
            SET marca_id = ?, modelo = ?, ano = ?, preco = ?, preco_antigo = ?, fipe = ?, quilometragem = ?, 
                cambio = ?, Combustivel = ?, leilao = ?, Opcionais = ?, destaque = ?
            WHERE id = ?
        `;
        const valoresUpdate = [marca_id, modelo, ano, preco, precoAntigoParaSalvar, fipe, quilometragem, cambio, combustivel, vLeilao, temOpcionais, vDestaque, id];
        await db.query(sqlUpdate, valoresUpdate);

        // Atualizar Opcionais
        await db.query("DELETE FROM CarroOpcionais WHERE carro_id = ?", [id]);
        if (temOpcionais === 1) {
            for (let opcId of opcionaisArray) {
                await db.query("INSERT INTO CarroOpcionais (carro_id, opcional_id) VALUES (?, ?)", [id, opcId]);
            }
        }

        // --- LÓGICA DE SALVAR FOTOS NOVAS NA PASTA CERTA ---
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                // Caminho atual onde o multer jogou a foto (a pasta numerada aleatória)
                const caminhoTemporario = file.path; 
                const nomeArquivo = file.filename;
                
                // Caminho final para onde ela deve ir (a pasta específica do carro)
                const destinoFinal = path.join(pastaNovaPath, nomeArquivo);

                // Move a foto do caminho temporário para o destino final
                fs.renameSync(caminhoTemporario, destinoFinal);

                // Tenta apagar a pasta numerada que o multer criou (se ela ficar vazia)
                const pastaMulter = path.dirname(caminhoTemporario);
                if (pastaMulter !== diretorioBase) {
                    try { fs.rmdirSync(pastaMulter); } catch(e) { /* Ignora se houver outros arquivos nela */ }
                }

                // Salva no banco de dados
                const caminhoFotoDB = `/uploads/carros/${pastaNovaNome}/${nomeArquivo}`;
                await db.query("INSERT INTO FotosCarro (carro_id, caminho) VALUES (?, ?)", [id, caminhoFotoDB]);
                
                // Se o carro não tinha foto principal, define agora
                const [carroVerificarCapa] = await db.query("SELECT imagem_principal FROM Carros WHERE id = ?", [id]);
                if (!carroVerificarCapa[0].imagem_principal) {
                    await db.query("UPDATE Carros SET imagem_principal = ? WHERE id = ?", [caminhoFotoDB, id]);
                }
            }
        }

        // Salvar Auditoria
        if (req.session && req.session.usuario) {
            await db.query(
                "INSERT INTO Auditoria (usuario_id, nome_usuario, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?, ?)",
                [req.session.usuario.id, req.session.usuario.nome, 'EDITAR', 'Carro', id, JSON.stringify({ modelo })]
            );
        }

        res.json({ mensagem: "Veículo atualizado com sucesso!" });

    } catch (erro) {
        console.error("Erro ao atualizar veículo:", erro);
        res.status(500).json({ mensagem: "Erro ao atualizar veículo no servidor." });
    }
});

//Rota venda do carro
app.put("/admin/carros/:id/vender", verificarLogin, async (req, res) => {
    const id = req.params.id;
    const { observacao } = req.body;

    try {
        await db.query(
            `UPDATE Carros 
             SET status = 'Vendido', vendido_em = NOW(), observacao_venda = ? 
             WHERE id = ?`,
            [observacao || null, id],
        );

        await registrarAuditoria(
            req.session.usuario.id,
            req.session.usuario.nome,
            "VENDEU",
            "Carros",
            id,
            { observacao: observacao },
        );

        res.json({ mensagem: "Veículo marcado como vendido." });
    } catch (erro) {
        console.error("Erro ao vender veículo:", erro);
        res.status(500).json({
            mensagem: "Erro ao processar a venda no servidor.",
        });
    }
});

//rota para desfazer a venda do carro, voltando para disponível
app.put(
    "/admin/carros/:id/disponibilizar",
    verificarLogin,
    async (req, res) => {
        const id = req.params.id;

        try {
            await db.query(
                `UPDATE Carros 
             SET status = 'Disponível', vendido_em = NULL, observacao_venda = NULL 
             WHERE id = ?`,
                [id],
            );

            await registrarAuditoria(
                req.session.usuario.id,
                req.session.usuario.nome,
                "DESFEZ VENDA",
                "Carros",
                id,
                {},
            );

            res.json({ mensagem: "Veículo está disponível novamente." });
        } catch (erro) {
            console.error("Erro ao desfazer venda:", erro);
            res.status(500).json({
                mensagem: "Erro ao desfazer a venda no servidor.",
            });
        }
    },
);

// EXCLUIR FOTO INDIVIDUAL DO CARRO
app.delete(
    "/admin/api/carros/fotos/:fotoId",
    verificarLogin,
    async (req, res) => {
        const fotoId = req.params.fotoId;

        try {
            // 1. Busca os dados da foto no banco para saber o caminho e de qual carro ela é
            const [fotos] = await db.query(
                "SELECT carro_id, caminho FROM FotosCarro WHERE id = ?",
                [fotoId],
            );

            if (fotos.length === 0) {
                return res
                    .status(404)
                    .json({ erro: "Foto não encontrada no banco de dados." });
            }

            const foto = fotos[0];
            const idCarro = foto.carro_id;

            // 2. Apaga o arquivo físico da pasta
            const caminhoFisico = path.join(
                __dirname,
                "public",
                foto.caminho.replace(/^[/\\]/, ""),
            );
            if (fs.existsSync(caminhoFisico)) {
                fs.unlinkSync(caminhoFisico);
            }

            // 3. Deleta o registro da foto na tabela
            await db.execute("DELETE FROM FotosCarro WHERE id = ?", [fotoId]);

            // 4. PRECAUÇÃO: Se a foto apagada era a "Capa" do carro, escolhemos outra para ser a capa
            const [carro] = await db.query(
                "SELECT imagem_principal FROM Carros WHERE id = ?",
                [idCarro],
            );

            if (carro[0].imagem_principal === foto.caminho) {
                // Pega a próxima foto disponível na galeria
                const [outrasFotos] = await db.query(
                    "SELECT caminho FROM FotosCarro WHERE carro_id = ? LIMIT 1",
                    [idCarro],
                );

                // Se tiver outra foto, define ela como capa. Se não, deixa NULL.
                const novaCapa =
                    outrasFotos.length > 0 ? outrasFotos[0].caminho : null;
                await db.execute(
                    "UPDATE Carros SET imagem_principal = ? WHERE id = ?",
                    [novaCapa, idCarro],
                );
            }

            res.json({ mensagem: "Foto removida com sucesso!" });
        } catch (erro) {
            console.error("Erro ao deletar foto individual:", erro);
            res.status(500).json({ erro: "Erro interno ao deletar a foto." });
        }
    },
);

// ROTA PARA BUSCAR AS FOTOS DE UM CARRO ESPECÍFICO (Para carregar na tela de edição)
app.get("/admin/api/carros/:id/fotos", verificarLogin, async (req, res) => {
    try {
        const idCarro = req.params.id;

        // Busca na tabela FotosCarro todas as fotos ligadas a esse carro
        const [fotos] = await db.query(
            "SELECT id, caminho FROM FotosCarro WHERE carro_id = ?",
            [idCarro],
        );

        res.json(fotos);
    } catch (erro) {
        console.error("Erro ao buscar fotos do carro:", erro);
        res.status(500).json({ erro: "Erro ao carregar as fotos." });
    }
});

// DELETAR CARRO
app.delete("/admin/carros/:id", verificarLogin, async (req, res) => {
    try {
        const idCarro = req.params.id;
        const [carroInfo] = await db.query(
            "SELECT modelo FROM Carros WHERE id = ?",
            [idCarro],
        );

        // APENAS MUDA O STATUS PARA DELETADO.
        // NÃO apaga as fotos do HD nem do banco de dados ainda, para permitir restauração!
        await db.query(
            "UPDATE Carros SET status = 'deletado', deletado_em = NOW() WHERE id = ?",
            [idCarro],
        );

        await registrarAuditoria(
            req.session.usuario.id,
            req.session.usuario.nome,
            "DELETOU",
            "Carros",
            idCarro,
            { modelo: carroInfo[0].modelo, acao: "Moveu para a Lixeira" },
        );

        res.json({ sucesso: true, mensagem: "Carro movido para a lixeira!" });
    } catch (erro) {
        console.error("Erro ao mover carro para a lixeira:", erro);
        res.status(500).json({ erro: "Erro ao enviar para a lixeira." });
    }
});

// ==========================================
// ROTAS DE GESTÃO DE FOTOS DOS CARROS
// ==========================================

// EXCLUIR UMA FOTO ESPECÍFICA
app.delete("/admin/carros/fotos/:idFoto", verificarLogin, async (req, res) => {
    try {
        const idFoto = req.params.idFoto;
        const [foto] = await db.query(
            "SELECT caminho FROM FotosCarro WHERE id = ?",
            [idFoto],
        );

        if (foto.length > 0) {
            let caminhoLimpo = foto[0].caminho
                .replace(/^[\/\\]/, "")
                .replace(/^public[\/\\]?/, "");
            const caminhoCompleto = path.join(
                __dirname,
                "public",
                caminhoLimpo,
            );

            if (fs.existsSync(caminhoCompleto)) {
                fs.unlinkSync(caminhoCompleto); // Exclui a foto

                // DELETA A PASTA SE ELA FICAR VAZIA
                const pasta = path.dirname(caminhoCompleto);
                try {
                    if (
                        fs.existsSync(pasta) &&
                        fs.readdirSync(pasta).length === 0
                    ) {
                        fs.rmdirSync(pasta);
                    }
                } catch (e) {
                    console.error("Erro ao deletar pasta vazia de foto:", e);
                }
            }
        }

        await db.execute("DELETE FROM FotosCarro WHERE id = ?", [idFoto]);
        res.json({
            sucesso: true,
            mensagem: "Foto e pasta (se vazia) removidas!",
        });
    } catch (erro) {
        console.error("Erro ao deletar foto individual:", erro);
        res.status(500).json({ erro: "Erro ao deletar foto." });
    }
});

// DEFINIR FOTO COMO CAPA (IMAGEM PRINCIPAL)
app.put(
    "/admin/carros/:idCarro/capa/:idFoto",
    verificarLogin,
    async (req, res) => {
        try {
            const { idCarro, idFoto } = req.params;
            const [foto] = await db.query(
                "SELECT caminho FROM FotosCarro WHERE id = ?",
                [idFoto],
            );

            if (foto.length === 0)
                return res.status(404).json({ erro: "Foto não encontrada." });

            const novoCaminhoPrincipal = foto[0].caminho;
            await db.execute(
                "UPDATE Carros SET imagem_principal = ? WHERE id = ?",
                [novoCaminhoPrincipal, idCarro],
            );

            res.json({ sucesso: true, mensagem: "Capa atualizada!" });
        } catch (erro) {
            res.status(500).json({ erro: "Erro ao definir capa." });
        }
    },
);

// ==========================================
// ROTA PARA CRIAR VENDEDOR
// ==========================================
app.post(
    "/admin/vendedores",
    verificarLogin,
    upload.single("foto"),
    async (req, res) => {
        try {
            console.log("1. Iniciando cadastro do vendedor...");
            let { nome, email, telefone } = req.body;
            nome = padronizarTexto(nome);

            let caminhoFoto = null;
            if (req.file) {
                let subPasta = path.basename(req.pastaUploadAtual);
                caminhoFoto = `/img/vendedores/${subPasta}/${req.file.filename}`;
            }

            const [resultado] = await db.execute(
                "INSERT INTO Vendedores (nome, email, telefone, foto, status) VALUES (?, ?, ?, ?, 'ativo')",
                [nome, email, telefone, caminhoFoto],
            );

            const idNovoVendedor = resultado.insertId;
            console.log("2. Vendedor salvo no banco com ID:", idNovoVendedor);

            console.log("3. Tentando registrar na auditoria...");
            await registrarAuditoria(
                req.session.usuario.id,
                req.session.usuario.nome,
                "CRIOU",
                "Vendedores",
                idNovoVendedor,
                { nome: nome, telefone: telefone },
            );
            console.log("4. Auditoria registrada com sucesso!");

            res.json({
                sucesso: true,
                mensagem: "Vendedor cadastrado com sucesso!",
            });
        } catch (erro) {
            console.error("!!! ERRO CRÍTICO AO CRIAR VENDEDOR:", erro);
            res.status(500).json({ erro: "Erro ao cadastrar vendedor." });
        }
    },
);

// EDITAR VENDEDOR
app.put(
    "/admin/vendedores/:id",
    verificarLogin,
    upload.single("foto"),
    async (req, res) => {
        const { id } = req.params;
        let { nome, email, telefone } = req.body;
        nome = padronizarTexto(nome);

        try {
            // Se o usuário selecionou uma imagem nova
            if (req.file) {
                // Pega a sub-pasta gerada pelo Upload Inteligente
                let subPasta = path.basename(req.pastaUploadAtual);
                const fotoPath = `/img/vendedores/${subPasta}/${req.file.filename}`;

                // --- NOVIDADE: APAGAR A FOTO ANTIGA E A PASTA DO HD ---
                const [vendedorAntigo] = await db.query(
                    "SELECT foto FROM Vendedores WHERE id = ?",
                    [id],
                );

                if (vendedorAntigo.length > 0 && vendedorAntigo[0].foto) {
                    let caminhoLimpo = vendedorAntigo[0].foto
                        .replace(/^[\/\\]/, "")
                        .replace(/^public[\/\\]?/, "");
                    const caminhoFisicoAntigo = path.join(
                        __dirname,
                        "public",
                        caminhoLimpo,
                    );

                    if (fs.existsSync(caminhoFisicoAntigo)) {
                        const pastaVelha = path.dirname(caminhoFisicoAntigo); // Pega a pasta antes de apagar a foto

                        fs.unlinkSync(caminhoFisicoAntigo); // 1. Apaga a foto velha!

                        // 2. Tenta apagar a pasta velha se ela tiver ficado vazia
                        try {
                            if (fs.readdirSync(pastaVelha).length === 0) {
                                fs.rmdirSync(pastaVelha);
                            }
                        } catch (e) {
                            /* ignora se a pasta não estiver vazia ou der erro */
                        }
                    }
                }
                // --------------------------------------------

                // Atualiza no banco com a foto nova
                await db.execute(
                    "UPDATE Vendedores SET nome = ?, email = ?, telefone = ?, foto = ? WHERE id = ?",
                    [nome, email, telefone, fotoPath, id],
                );
            } else {
                // Atualiza apenas os textos, mantendo a foto antiga
                await db.execute(
                    "UPDATE Vendedores SET nome = ?, email = ?, telefone = ? WHERE id = ?",
                    [nome, email, telefone, id],
                );
            }

            // Auditoria que você fez (muito bem implementada!)
            await registrarAuditoria(
                req.session.usuario.id,
                req.session.usuario.nome,
                "ATUALIZOU",
                "Vendedores",
                id,
                { novo_nome: nome, novo_telefone: telefone },
            );

            res.json({
                sucesso: true,
                mensagem: "Vendedor atualizado com sucesso!",
            });
        } catch (erro) {
            console.error("Erro interno ao atualizar vendedor:", erro);
            res.status(500).json({
                erro: "Erro ao atualizar vendedor: " + erro.message,
            });
        }
    },
);

// API para alimentar a tabela do painel administrativo com os veículos
app.get("/admin/api/carros", verificarLogin, async (req, res) => {
    try {
        const [configDias] = await db.query(
            "SELECT valor FROM Configuracoes WHERE chave = 'dias_exibicao_vendidos'",
        );
        const diasExibicao =
            configDias.length > 0 ? parseInt(configDias[0].valor) : 30;

        const [carros] = await db.query(
            `
            SELECT Carros.*, Marcas.nome AS marca 
            FROM Carros 
            JOIN Marcas ON Carros.marca_id = Marcas.id 
            WHERE Carros.status = 'Disponível' 
            OR (Carros.status = 'Vendido' AND Carros.vendido_em >= NOW() - INTERVAL ? DAY)
            ORDER BY Carros.criado_em DESC
        `,
            [diasExibicao],
        );

        res.json(carros);
    } catch (erro) {
        console.error("Erro ao buscar carros para o admin:", erro);
        res.status(500).json({
            erro: "Erro ao buscar os veículos do sistema.",
        });
    }
});

// ==========================================
// MOVER VENDEDOR PARA A LIXEIRA (Soft Delete)
// ==========================================
app.delete("/admin/vendedores/:id", verificarLogin, async (req, res) => {
    try {
        const idVendedor = req.params.id;

        // Pega o nome antes de deletar para salvar na auditoria
        const [vendInfo] = await db.query(
            "SELECT nome FROM Vendedores WHERE id = ?",
            [idVendedor],
        );

        // Apenas muda o status para "deletado", NÃO apaga a foto do HD!
        await db.query(
            "UPDATE Vendedores SET status = 'deletado', deletado_em = NOW() WHERE id = ?",
            [idVendedor],
        );

        // Auditoria mantida
        if (vendInfo.length > 0) {
            await registrarAuditoria(
                req.session.usuario.id,
                req.session.usuario.nome,
                "DELETOU",
                "Vendedores",
                idVendedor,
                { nome: vendInfo[0].nome },
            );
        }

        res.json({
            sucesso: true,
            mensagem: "Vendedor movido para a lixeira!",
        });
    } catch (erro) {
        console.error("Erro ao deletar vendedor:", erro);
        res.status(500).json({ erro: "Erro ao deletar vendedor." });
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

        // Pega quantos dias mostrar do banco de dados
        const [configDias] = await db.query(
            "SELECT valor FROM Configuracoes WHERE chave = 'dias_exibicao_vendidos'",
        );
        const diasExibicao =
            configDias.length > 0 ? parseInt(configDias[0].valor) : 30;

        // Recebendo os filtros da URL
        const { nome, marca, anoMin, anoMax, precoMin, precoMax } = req.query;

        // 1. Montando a regra base (Status Disponível ou Vendido recentemente)
        let condicoes = `(Carros.status = 'Disponível' OR (Carros.status = 'Vendido' AND Carros.vendido_em >= NOW() - INTERVAL ? DAY))`;

        // 2. Arrays para armazenar os valores de forma segura (evita SQL Injection)
        let paramsConsulta = [diasExibicao];

        // 3. Adicionando os filtros dinamicamente se existirem
        if (nome) {
            condicoes += ` AND Carros.modelo LIKE ?`;
            paramsConsulta.push(`%${nome}%`);
        }
        // Usamos LOWER para garantir que "fiat" encontre "Fiat", "FIAT", etc.
        if (marca) {
            condicoes += ` AND LOWER(Marcas.nome) = LOWER(?)`;
            paramsConsulta.push(marca);
        }
        if (anoMin) {
            condicoes += ` AND Carros.ano >= ?`;
            paramsConsulta.push(anoMin);
        }
        if (anoMax) {
            condicoes += ` AND Carros.ano <= ?`;
            paramsConsulta.push(anoMax);
        }
        if (precoMin) {
            condicoes += ` AND Carros.preco >= ?`;
            paramsConsulta.push(precoMin);
        }
        if (precoMax) {
            condicoes += ` AND Carros.preco <= ?`;
            paramsConsulta.push(precoMax);
        }

        // 4. Query para contar o total de páginas (precisa do JOIN agora por causa da marca)
        const sqlTotal = `
            SELECT COUNT(*) AS total 
            FROM Carros 
            LEFT JOIN Marcas ON Carros.marca_id = Marcas.id
            WHERE ${condicoes}
        `;
        const [totalResult] = await db.query(sqlTotal, paramsConsulta);
        const totalPaginas = Math.ceil(totalResult[0].total / limite);

        // 5. Query principal buscando os carros
        const sqlCarros = `
            SELECT Carros.*, Marcas.nome AS marca, 
            COALESCE(Carros.imagem_principal, (SELECT caminho FROM FotosCarro WHERE carro_id = Carros.id LIMIT 1)) AS imagem_principal, 
            IF(EXISTS(SELECT 1 FROM CarroOpcionais WHERE carro_id = Carros.id), 1, 0) AS tem_opcionais 
            FROM Carros 
            LEFT JOIN Marcas ON Carros.marca_id = Marcas.id 
            WHERE ${condicoes}
            ORDER BY criado_em DESC 
            LIMIT ? OFFSET ?
        `;

        // Crio um novo array de parâmetros para adicionar o limite e offset no final
        const paramsCarros = [...paramsConsulta, limite, offset];
        const [carros] = await db.query(sqlCarros, paramsCarros);

        res.json({ carros, totalPaginas });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao carregar carros filtrados" });
    }
});

app.get("/carros/destaques", async (req, res) => {
    try {
        const [carros] = await db.query(`
            SELECT Carros.*, Marcas.nome AS marca,
            COALESCE(Carros.imagem_principal, (SELECT caminho FROM FotosCarro WHERE carro_id = Carros.id LIMIT 1)) AS imagem_principal,
            IF(EXISTS(SELECT 1 FROM CarroOpcionais WHERE carro_id = Carros.id), 1, 0) AS tem_opcionais
            FROM Carros 
            JOIN Marcas ON Carros.marca_id = Marcas.id
            WHERE Carros.status = 'Disponível' 
               OR (Carros.status = 'Vendido' AND Carros.vendido_em >= NOW() - INTERVAL 30 DAY)
            ORDER BY destaque DESC, criado_em DESC 
            LIMIT 6
        `);
        res.json(carros);
    } catch (erro) {
        console.error("Erro ao buscar destaques:", erro);
        res.status(500).json({ erro: "Erro ao buscar destaques" });
    }
});

app.get("/carros/:id/opcionais", async (req, res) => {
    try {
        const [opcionais] = await db.query(
            "SELECT opcional_id FROM CarroOpcionais WHERE carro_id = ?",
            [req.params.id],
        );
        res.json(opcionais);
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao buscar opcionais marcados." });
    }
});

app.get("/carros/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const [carros] = await db.query(
            `
            SELECT Carros.*, Marcas.nome AS marca,
            COALESCE(Carros.imagem_principal, (SELECT caminho FROM FotosCarro WHERE carro_id = Carros.id LIMIT 1)) AS imagem_principal
            FROM Carros JOIN Marcas ON Carros.marca_id = Marcas.id WHERE Carros.id = ?
        `,
            [id],
        );

        if (carros.length === 0)
            return res.status(404).json({ erro: "Carro não encontrado" });

        const carro = carros[0];

        // AGORA BUSCA O ID DA FOTO TAMBÉM (E ordena para a capa ficar por primeiro visualmente se quiser)
        const [fotos] = await db.query(
            `SELECT id, caminho FROM FotosCarro WHERE carro_id = ? ORDER BY id ASC`,
            [id],
        );
        carro.fotos = fotos;

        const [opcionais] = await db.query(
            `
            SELECT Opcionais.nome FROM CarroOpcionais
            JOIN Opcionais ON CarroOpcionais.opcional_id = Opcionais.id WHERE CarroOpcionais.carro_id = ?
        `,
            [id],
        );
        carro.opcionais = opcionais;

        res.json(carro);
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao carregar detalhes do carro" });
    }
});

app.get("/carros/:id/relacionados", async (req, res) => {
    try {
        const id = req.params.id;
        const [carroAtual] = await db.query(
            `SELECT * FROM Carros WHERE id = ?`,
            [id],
        );
        const [todosCarros] = await db.query(
            `
            SELECT Carros.*, Marcas.nome AS marca,
            COALESCE(Carros.imagem_principal, (SELECT caminho FROM FotosCarro WHERE carro_id = Carros.id LIMIT 1)) AS imagem_principal
            FROM Carros JOIN Marcas ON Carros.marca_id = Marcas.id WHERE Carros.id != ?
        `,
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
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao buscar relacionados" });
    }
});

app.get("/vendedores", async (req, res) => {
    try {
        // 1. Pegamos os dados que o JavaScript enviou pela URL
        const { nome, email, telefone } = req.query;

        // 2. Criamos a base da consulta SQL
        // Mantemos o filtro de status para não mostrar vendedores deletados/inativos
        let sql = "SELECT id, nome, telefone, email, foto FROM Vendedores WHERE status = 'ativo'";
        let paramsConsulta = [];

        // 3. Adicionamos os filtros APENAS se eles foram preenchidos no frontend
        if (nome) {
            sql += " AND nome LIKE ?";
            paramsConsulta.push(`%${nome}%`); // O % permite achar "João" digitando apenas "Jo"
        }

        if (email) {
            sql += " AND email LIKE ?";
            paramsConsulta.push(`%${email}%`);
        }

        if (telefone) {
            sql += " AND telefone LIKE ?";
            paramsConsulta.push(`%${telefone}%`);
        }

        // 4. Executamos a query final com os parâmetros
        const [vendedores] = await db.query(sql, paramsConsulta);
        
        // 5. Enviamos o resultado de volta para o frontend
        res.json(vendedores);

    } catch (erro) {
        console.error("Erro na busca de vendedores:", erro);
        res.status(500).json({ erro: "Erro ao carregar vendedores" });
    }
});app.get("/vendedores", async (req, res) => {
    try {
        // 1. Pegamos os dados que o JavaScript enviou pela URL
        const { nome, email, telefone } = req.query;

        // 2. Criamos a base da consulta SQL
        // Mantemos o filtro de status para não mostrar vendedores deletados/inativos
        let sql = "SELECT id, nome, telefone, email, foto FROM Vendedores WHERE status = 'ativo'";
        let paramsConsulta = [];

        // 3. Adicionamos os filtros APENAS se eles foram preenchidos no frontend
        if (nome) {
            sql += " AND nome LIKE ?";
            paramsConsulta.push(`%${nome}%`); // O % permite achar "João" digitando apenas "Jo"
        }

        if (email) {
            sql += " AND email LIKE ?";
            paramsConsulta.push(`%${email}%`);
        }

        if (telefone) {
            sql += " AND telefone LIKE ?";
            paramsConsulta.push(`%${telefone}%`);
        }

        // 4. Executamos a query final com os parâmetros
        const [vendedores] = await db.query(sql, paramsConsulta);
        
        // 5. Enviamos o resultado de volta para o frontend
        res.json(vendedores);

    } catch (erro) {
        console.error("Erro na busca de vendedores:", erro);
        res.status(500).json({ erro: "Erro ao carregar vendedores" });
    }
});
app.get("/marcas", async (req, res) => {
    try {
        const [marcas] = await db.query("SELECT * FROM Marcas");
        res.json(marcas);
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao carregar marcas" });
    }
});

app.get("/opcionais", async (req, res) => {
    try {
        const [opcionais] = await db.query("SELECT * FROM Opcionais");
        res.json(opcionais);
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao carregar opcionais" });
    }
});

// ==========================================
// ROTAS DA LIXEIRA (Apenas Admin/Gerente)
// ==========================================

// 1. Buscar todos os itens na lixeira
app.get("/admin/api/lixeira", verificarLogin, async (req, res) => {
    // Trava de segurança: Vendedor não entra
    if (req.session.usuario.nivel === "vendedor") {
        return res.status(403).json({ erro: "Acesso negado." });
    }

    try {
        // Busca os três tipos de dados e padroniza os nomes das colunas
        const [carros] = await db.query(
            "SELECT id, modelo AS nome, 'carro' AS tipo, deletado_em FROM Carros WHERE status = 'deletado'",
        );
        const [vendedores] = await db.query(
            "SELECT id, nome, 'vendedor' AS tipo, deletado_em FROM Vendedores WHERE status = 'deletado'",
        );
        const [usuarios] = await db.query(
            "SELECT id, nome, 'usuario' AS tipo, deletado_em FROM Usuarios WHERE status = 'deletado'",
        );

        // Junta tudo num único array e ordena pela data (mais recentes primeiro)
        const lixeira = [...carros, ...vendedores, ...usuarios].sort(
            (a, b) => new Date(b.deletado_em) - new Date(a.deletado_em),
        );
        res.json(lixeira);
    } catch (erro) {
        console.error("Erro ao carregar lixeira:", erro);
        res.status(500).json({ erro: "Erro ao carregar a lixeira." });
    }
});

// 2. Restaurar um item
app.put(
    "/admin/api/lixeira/restaurar/:tipo/:id",
    verificarLogin,
    async (req, res) => {
        if (req.session.usuario.nivel === "vendedor")
            return res.status(403).json({ erro: "Acesso negado." });

        const { tipo, id } = req.params;
        let tabela = "";

        if (tipo === "carro") tabela = "Carros";
        else if (tipo === "vendedor") tabela = "Vendedores";
        else if (tipo === "usuario") tabela = "Usuarios";
        else return res.status(400).json({ erro: "Tipo inválido." });

        try {
            await db.query(
                `UPDATE ${tabela} SET status = 'ativo', deletado_em = NULL WHERE id = ?`,
                [id],
            );
            res.json({
                sucesso: true,
                mensagem: "Item restaurado com sucesso!",
            });
        } catch (erro) {
            res.status(500).json({ erro: "Erro ao restaurar item." });
        }
    },
);

// 3. Excluir Definitivamente (Hard Delete Manual)
app.delete(
    "/admin/api/lixeira/excluir/:tipo/:id",
    verificarLogin,
    async (req, res) => {
        // 1. Proteção de Nível de Acesso
        if (req.session.usuario.nivel === "vendedor") {
            return res.status(403).json({ erro: "Acesso negado." });
        }

        const { tipo, id } = req.params;

        try {
            if (tipo === "carro") {
                // --- LÓGICA PARA CARROS ---
                const [fotos] = await db.query(
                    "SELECT caminho FROM FotosCarro WHERE carro_id = ?",
                    [id],
                );
                const pastasParaLimpar = new Set();

                for (const foto of fotos) {
                    let caminhoCorrigido = foto.caminho.replace(/^[\/\\]/, "");
                    if (caminhoCorrigido.startsWith("public")) {
                        caminhoCorrigido = caminhoCorrigido
                            .replace("public", "")
                            .replace(/^[\/\\]/, "");
                    }

                    const caminhoFisico = path.join(
                        __dirname,
                        "public",
                        caminhoCorrigido,
                    );

                    if (fs.existsSync(caminhoFisico)) {
                        fs.unlinkSync(caminhoFisico); // Apaga a foto
                        pastasParaLimpar.add(path.dirname(caminhoFisico)); // Guarda a pasta (ex: Marca_Modelo_ID)
                    }
                }

                // Remove as pastas dos carros se ficaram vazias
                for (const pasta of pastasParaLimpar) {
                    try {
                        if (
                            fs.existsSync(pasta) &&
                            fs.readdirSync(pasta).length === 0
                        ) {
                            fs.rmdirSync(pasta);
                        }
                    } catch (e) {
                        /* ignorar erro se pasta não estiver vazia */
                    }
                }

                // Apagar do Banco de Dados (Ordem inversa das chaves estrangeiras)
                await db.execute("DELETE FROM FotosCarro WHERE carro_id = ?", [
                    id,
                ]);
                try {
                    await db.execute(
                        "DELETE FROM CarroOpcionais WHERE carro_id = ?",
                        [id],
                    );
                } catch (e) {}
                await db.execute("DELETE FROM Carros WHERE id = ?", [id]);
            } else if (tipo === "vendedor" || tipo === "usuario") {
                // --- LÓGICA PARA VENDEDORES E UTILIZADORES ---
                const tabela = tipo === "vendedor" ? "Vendedores" : "Usuarios";

                const [info] = await db.query(
                    `SELECT foto FROM ${tabela} WHERE id = ?`,
                    [id],
                );

                if (info.length > 0 && info[0].foto) {
                    let caminhoCorrigido = info[0].foto.replace(/^[\/\\]/, "");
                    if (caminhoCorrigido.startsWith("public")) {
                        caminhoCorrigido = caminhoCorrigido
                            .replace("public", "")
                            .replace(/^[\/\\]/, "");
                    }

                    const caminhoFisico = path.join(
                        __dirname,
                        "public",
                        caminhoCorrigido,
                    );

                    if (fs.existsSync(caminhoFisico)) {
                        const pastaPai = path.dirname(caminhoFisico);
                        fs.unlinkSync(caminhoFisico);

                        // Se a foto estava numa pasta própria (estilo storageInteligente), apaga a pasta se estiver vazia
                        try {
                            if (fs.readdirSync(pastaPai).length === 0) {
                                fs.rmdirSync(pastaPai);
                            }
                        } catch (e) {}
                    }
                }

                await db.execute(`DELETE FROM ${tabela} WHERE id = ?`, [id]);
            } else {
                return res.status(400).json({ erro: "Tipo de item inválido." });
            }

            res.json({
                sucesso: true,
                mensagem: "Item e ficheiros eliminados permanentemente!",
            });
        } catch (erro) {
            console.error("Erro ao excluir permanentemente:", erro);
            res.status(500).json({ erro: "Erro ao excluir item do sistema." });
        }
    },
);

// ==========================================
// ROTINA DE LIMPEZA AUTOMÁTICA (LIXEIRA E ARQUIVO)
// ==========================================
async function executarRotinaDeLimpeza() {
    try {
        const [config] = await db.query(
            "SELECT valor FROM Configuracoes WHERE chave = 'dias_limpeza_lixeira'",
        );
        const diasParaDeletar = parseInt(config[0]?.valor) || 30;

        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - diasParaDeletar);

        // 1. LIMPAR LIXEIRA: CARROS
        const [carrosDeletados] = await db.query(
            "SELECT id FROM Carros WHERE status = 'deletado' AND deletado_em < ?",
            [dataLimite],
        );
        for (const carro of carrosDeletados) {
            const [fotos] = await db.query(
                "SELECT caminho FROM FotosCarro WHERE carro_id = ?",
                [carro.id],
            );
            const pastasParaLimpar = new Set();

            for (const foto of fotos) {
                let caminho = foto.caminho
                    .replace(/^[\/\\]/, "")
                    .replace(/^public[\/\\]?/, "");
                const caminhoFisico = path.join(__dirname, "public", caminho);
                if (fs.existsSync(caminhoFisico)) {
                    fs.unlinkSync(caminhoFisico);
                    pastasParaLimpar.add(path.dirname(caminhoFisico));
                }
            }
            for (const pasta of pastasParaLimpar) {
                try {
                    if (
                        fs.existsSync(pasta) &&
                        fs.readdirSync(pasta).length === 0
                    )
                        fs.rmdirSync(pasta);
                } catch (e) {}
            }
            await db.query("DELETE FROM FotosCarro WHERE carro_id = ?", [
                carro.id,
            ]);
            await db.query("DELETE FROM CarroOpcionais WHERE carro_id = ?", [
                carro.id,
            ]);
            await db.query("DELETE FROM Carros WHERE id = ?", [carro.id]);
        }

        // 2. LIMPAR LIXEIRA: VENDEDORES E USUÁRIOS
        const tabelasUser = ["Vendedores", "Usuarios"];
        for (const tabela of tabelasUser) {
            const [itens] = await db.query(
                `SELECT id, foto FROM ${tabela} WHERE status = 'deletado' AND deletado_em < ?`,
                [dataLimite],
            );
            for (const item of itens) {
                if (item.foto) {
                    let caminho = item.foto
                        .replace(/^[\/\\]/, "")
                        .replace(/^public[\/\\]?/, "");
                    const caminhoFisico = path.join(
                        __dirname,
                        "public",
                        caminho,
                    );
                    if (fs.existsSync(caminhoFisico))
                        fs.unlinkSync(caminhoFisico);
                }
                await db.query(`DELETE FROM ${tabela} WHERE id = ?`, [item.id]);
            }
        }

        // 3. LIMPAR ARQUIVADOS (VENDIDOS > 90 DIAS) - Apaga só as fotos!
        const diasVendidos = 90;
        const dataLimiteVendidos = new Date();
        dataLimiteVendidos.setDate(dataLimiteVendidos.getDate() - diasVendidos);

        const [carrosVendidos] = await db.query(
            "SELECT id FROM Carros WHERE status = 'vendido' AND vendido_em < ?",
            [dataLimiteVendidos],
        );

        for (const carro of carrosVendidos) {
            const [fotos] = await db.query(
                "SELECT id, caminho FROM FotosCarro WHERE carro_id = ?",
                [carro.id],
            );
            const pastasParaLimpar = new Set();

            for (const foto of fotos) {
                let caminho = foto.caminho
                    .replace(/^[\/\\]/, "")
                    .replace(/^public[\/\\]?/, "");
                const caminhoFisico = path.join(__dirname, "public", caminho);
                if (fs.existsSync(caminhoFisico)) {
                    fs.unlinkSync(caminhoFisico);
                    pastasParaLimpar.add(path.dirname(caminhoFisico));
                }
                // Apaga os registos destas fotos do banco, mas O CARRO CONTINUA!
                await db.query("DELETE FROM FotosCarro WHERE id = ?", [
                    foto.id,
                ]);
            }

            for (const pasta of pastasParaLimpar) {
                try {
                    if (
                        fs.existsSync(pasta) &&
                        fs.readdirSync(pasta).length === 0
                    )
                        fs.rmdirSync(pasta);
                } catch (e) {}
            }

            if (fotos.length > 0) {
                console.log(
                    `[SISTEMA] Fotos do carro vendido ID ${carro.id} deletadas para liberar espaço.`,
                );
            }
        }
    } catch (erro) {
        console.error("[ERRO] Falha na rotina automática:", erro);
    }
}

// O robô vai rodar sozinho a cada 24 horas!
setInterval(executarRotinaDeLimpeza, 24 * 60 * 60 * 1000);

    // ==========================================
    // ROTAS PARA GERENCIAR MARCAS E OPCIONAIS (COM AUDITORIA)
    // ==========================================

    // --- ADICIONAR MARCA ---
    app.post("/admin/api/marcas", verificarLogin, async (req, res) => {
        let { nome } = req.body;
        if (!nome || !nome.trim()) return res.status(400).json({ mensagem: "O nome da marca é obrigatório." });

        nome = padronizarTexto(nome.trim());

        try {
            const [existente] = await db.query("SELECT id FROM Marcas WHERE LOWER(nome) = LOWER(?)", [nome]);
            if (existente.length > 0) return res.status(400).json({ mensagem: "Esta marca já está cadastrada.", id: existente[0].id });

            const [resultado] = await db.query("INSERT INTO Marcas (nome) VALUES (?)", [nome]);
            
            await db.query(
                "INSERT INTO Auditoria (usuario_id, nome_usuario, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?, ?)", 
                [req.session.usuario.id, req.session.usuario.nome, 'INSERIR', 'Marca', resultado.insertId, JSON.stringify({ nome: nome })]
            );

            res.status(201).json({ mensagem: "Marca adicionada com sucesso!", id: resultado.insertId, nome: nome });
        } catch (erro) {
            console.error(erro);
            res.status(500).json({ mensagem: "Erro ao adicionar a marca." });
        }
    });

    // --- EDITAR MARCA ---
    app.put("/admin/api/marcas/:id", verificarLogin, async (req, res) => {
        const id = parseInt(req.params.id);
        let { nome } = req.body;
        if (!nome || !nome.trim()) return res.status(400).json({ mensagem: "O nome não pode ser vazio." });
        if (id <= 35) return res.status(403).json({ mensagem: "As marcas de fábrica são protegidas e não podem ser editadas." });
        
        nome = padronizarTexto(nome.trim());

        try {
            const [existente] = await db.query("SELECT id FROM Marcas WHERE LOWER(nome) = LOWER(?) AND id != ?", [nome, id]);
            if (existente.length > 0) return res.status(400).json({ mensagem: "Já existe outra marca com este nome." });

            await db.query("UPDATE Marcas SET nome = ? WHERE id = ?", [nome, id]);
            
            await db.query("INSERT INTO Auditoria (usuario_id, nome_usuario, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?, ?)", 
                [req.session.usuario.id, req.session.usuario.nome, 'EDITAR', 'Marca', id, JSON.stringify({ novo_nome: nome })]);

            res.json({ mensagem: "Marca atualizada com sucesso!" });
        } catch (erro) {
            res.status(500).json({ mensagem: "Erro ao atualizar a marca." });
        }
    });

    // --- DELETAR MARCA ---
    app.delete("/admin/api/marcas/:id", verificarLogin, async (req, res) => {
        const id = parseInt(req.params.id);
        
        // Proteção das marcas nativas
        if (id <= 35) return res.status(403).json({ mensagem: "As marcas de fábrica não podem ser excluídas." });

        try {
            const [marca] = await db.query("SELECT nome FROM Marcas WHERE id = ?", [id]);
            if (marca.length === 0) return res.status(404).json({ mensagem: "Marca não encontrada." });

            // Proteção contra quebra de banco de dados
            const [uso] = await db.query("SELECT id FROM Carros WHERE marca_id = ?", [id]);
            if (uso.length > 0) return res.status(400).json({ mensagem: "Não é possível excluir. Existem veículos cadastrados com esta marca." });

            await db.query("DELETE FROM Marcas WHERE id = ?", [id]);
            
            await db.query(
                "INSERT INTO Auditoria (usuario_id, nome_usuario, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?, ?)", 
                [req.session.usuario.id, req.session.usuario.nome, 'EXCLUIR', 'Marca', id, JSON.stringify({ nome: marca[0].nome })]
            );

            res.json({ mensagem: "Marca excluída com sucesso!" });
        } catch (erro) {
            console.error(erro);
            res.status(500).json({ mensagem: "Erro ao excluir a marca." });
        }
    });

    // --- ADICIONAR OPCIONAL ---
    app.post("/admin/api/opcionais", verificarLogin, async (req, res) => {
        let { nome } = req.body;
        if (!nome || !nome.trim()) return res.status(400).json({ mensagem: "O nome é obrigatório." });

        nome = padronizarTexto(nome.trim());

        try {
            const [existente] = await db.query("SELECT id FROM Opcionais WHERE LOWER(nome) = LOWER(?)", [nome]);
            if (existente.length > 0) return res.status(400).json({ mensagem: "Este opcional já existe.", id: existente[0].id });

            const [resultado] = await db.query("INSERT INTO Opcionais (nome) VALUES (?)", [nome]);
            
            await db.query(
                "INSERT INTO Auditoria (usuario_id, nome_usuario, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?, ?)", 
                [req.session.usuario.id, req.session.usuario.nome, 'INSERIR', 'Opcional', resultado.insertId, JSON.stringify({ nome: nome })]
            );

            res.status(201).json({ mensagem: "Opcional adicionado com sucesso!", id: resultado.insertId, nome: nome });
        } catch (erro) {
            res.status(500).json({ mensagem: "Erro ao adicionar opcional." });
        }
    });

    // --- EDITAR OPCIONAL ---
    app.put("/admin/api/opcionais/:id", verificarLogin, async (req, res) => {
        const id = parseInt(req.params.id);
        let { nome } = req.body;
        if (!nome || !nome.trim()) return res.status(400).json({ mensagem: "O nome não pode ser vazio." });
        if (id <= 39) return res.status(403).json({ mensagem: "Os opcionais de fábrica são protegidos e não podem ser editados." });
        nome = padronizarTexto(nome.trim());

        try {
            const [existente] = await db.query("SELECT id FROM Opcionais WHERE LOWER(nome) = LOWER(?) AND id != ?", [nome, id]);
            if (existente.length > 0) return res.status(400).json({ mensagem: "Já existe outro opcional com este nome." });

            await db.query("UPDATE Opcionais SET nome = ? WHERE id = ?", [nome, id]);
            
            await db.query("INSERT INTO Auditoria (usuario_id, nome_usuario, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?, ?)", 
                [req.session.usuario.id, req.session.usuario.nome, 'EDITAR', 'Opcional', id, JSON.stringify({ novo_nome: nome })]);

            res.json({ mensagem: "Opcional atualizado com sucesso!" });
        } catch (erro) {
            res.status(500).json({ mensagem: "Erro ao atualizar opcional." });
        }
    });

    // --- DELETAR OPCIONAL ---
    app.delete("/admin/api/opcionais/:id", verificarLogin, async (req, res) => {
        const id = parseInt(req.params.id);
        
        // Proteção dos opcionais nativos
        if (id <= 39) return res.status(403).json({ mensagem: "Os opcionais de fábrica não podem ser excluídos." });

        try {
            const [opcional] = await db.query("SELECT nome FROM Opcionais WHERE id = ?", [id]);
            if (opcional.length === 0) return res.status(404).json({ mensagem: "Opcional não encontrado." });

            await db.query("DELETE FROM Opcionais WHERE id = ?", [id]);
            
            await db.query(
                "INSERT INTO Auditoria (usuario_id, nome_usuario, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?, ?)", 
                [req.session.usuario.id, req.session.usuario.nome, 'EXCLUIR', 'Opcional', id, JSON.stringify({ nome: opcional[0].nome })]
            );

            res.json({ mensagem: "Opcional excluído com sucesso!" });
        } catch (erro) {
            res.status(500).json({ mensagem: "Erro ao excluir opcional." });
        }
    });

    // ROTA PARA CAPTURAR 404 
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'erro.html'));
});

// TRATAMENTO DE ERROS GERAIS DO SERVIDOR (500)
app.use((err, req, res, next) => {
    // Mostra o erro no terminal (ex: "Apenas imagens são permitidas")
    console.error("❌ [ERRO NO SERVIDOR]:", err.message);
    
    // Se a requisição veio do seu JavaScript (fetch), devolvemos um JSON!
    // Assim, o seu SweetAlert2 vai conseguir mostrar o alerta na tela, em vez de quebrar a página
    if (req.xhr || req.headers.accept.includes('application/json') || req.originalUrl.includes('/admin/')) {
        return res.status(500).json({ mensagem: err.message || "Ocorreu um erro interno nos nossos motores." });
    }
    
    // Se for uma navegação normal do usuário, redireciona usando CAMINHO RELATIVO (isso resolve o erro de SSL)
    res.redirect('/erro.html?tipo=500');
});

// INICIAR SERVIDOR
app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});
