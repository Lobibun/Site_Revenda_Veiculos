# 🚗 Sistema de Gestão para Revenda de Veículos

![Status do Projeto](https://img.shields.io/badge/Status-Concluído-success)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js)
![MySQL](https://img.shields.io/badge/MySQL-Banco_de_Dados-4479A1?logo=mysql)
![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript)

Um sistema completo (Full-Stack) desenvolvido para automatizar e gerenciar as operações de uma revenda de veículos. O projeto conta com uma vitrine pública interativa para os clientes e um poderoso painel administrativo (CMS) protegido, incluindo auditoria, automação de redes sociais e recuperação de credenciais via e-mail.

---

## 🎯 Visão Geral

Este projeto foi construído para resolver o problema de gestão de estoque e marketing de revendedoras de carros. Ele não apenas exibe os veículos para o público final, mas permite aos administradores controlar o estoque, equipe de vendas e realizar postagens automáticas em redes sociais através de Webhooks.

### 🖼️ Screenshots (Demonstração)
> 
> *[Imagem da Tela Inicial do Cliente]*
> <img width="1365" height="628" alt="image" src="https://github.com/user-attachments/assets/6937f30d-326e-4690-8b9d-e4412bed7eca" />
><img width="1341" height="623" alt="image" src="https://github.com/user-attachments/assets/23ac53d5-f1b4-452c-989f-4027b31a4db2" />


> *[Imagem do Painel Administrativo]*
> <img width="1346" height="631" alt="image" src="https://github.com/user-attachments/assets/6bdb3d84-f8f9-4c41-9177-0d242190b778" />
><img width="1350" height="633" alt="image" src="https://github.com/user-attachments/assets/5c16225e-0f76-4768-bd30-ccccc2bda78b" />

> 
> *[Imagem da Tela de Adicionar Carros]*
><img width="1342" height="625" alt="Captura de tela 2026-04-22 165829" src="https://github.com/user-attachments/assets/9a5ff50b-ab47-4a5d-89d5-33ae34b9ca70" />
><img width="1345" height="613" alt="image" src="https://github.com/user-attachments/assets/12bee3d7-a4fc-4062-99f0-70accd4ac8c5" />


> *[Imagem da Tela de Detalhes dos Carros]*
> <img width="1345" height="630" alt="image" src="https://github.com/user-attachments/assets/0b03f38d-1c98-456f-81a9-61ea9bd30f6a" />
><img width="1344" height="630" alt="image" src="https://github.com/user-attachments/assets/47cd64b4-8c13-4ccd-9029-e0a2d4ee0599" />


---

## ✨ Funcionalidades Principais

### 👤 Área do Cliente (Frontend Público)
- **Vitrine Dinâmica:** Listagem de veículos com filtros (marca, preço, ano) e selos automáticos (ex: "Abaixo da FIPE", "Leilão").
- **Detalhes do Veículo:** Página dedicada com galeria de fotos em Lightbox (Zoom), especificações, opcionais e veículos relacionados.
- **Card de Vendedores:** Listagem da equipe de vendas com botão direto para o WhatsApp (mensagem pré-configurada).
- **Formulário de Contato:** Envio de mensagens de clientes direto pelo site.
- **Web Components:** Componentização nativa (`header` e `footer` inteligentes que se adaptam se o usuário estiver logado).

### ⚙️ Área Administrativa (Backoffice)
- **Autenticação Segura:** Login protegido por sessão (`express-session`), proteção contra força bruta e criptografia de senhas.
- **Recuperação de Senha:** Fluxo completo de "Esqueci minha senha" com geração de Token e envio de link temporário via e-mail.
- **Gestão de Veículos (CRUD):** Adicionar, editar e remover carros com upload múltiplo de imagens (`multer`).
- **Gestão de Vendedores e Usuários:** Controle total sobre quem tem acesso ao sistema.
- **Lixeira (Soft Delete):** Sistema de exclusão segura, permitindo restaurar veículos ou excluí-los permanentemente.
- **Auditoria Interna:** Registro de log detalhado mostrando qual usuário realizou qual ação no sistema (Criação, Edição, Exclusão).
- **Integração Webhook (Make.com):** Envio automático dos dados e foto do veículo recém-cadastrado para postagem automática no Instagram/Facebook.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5 & CSS3** (Design Responsivo e Customizado)
- **JavaScript (Vanilla/ES6+)** (Manipulação de DOM, Web Components e Fetch API)
- **SweetAlert2** (Pop-ups e alertas amigáveis)
- **FontAwesome** (Ícones vetoriais)

### Backend
- **Node.js & Express** (Servidor HTTP e rotas)
- **MySQL (mysql2/promise)** (Banco de Dados Relacional e Queries assíncronas)
- **Express-Session** (Gerenciamento de sessões de usuário)
- **BcryptJS** (Hashing de senhas para segurança)
- **Multer & FS** (Upload e gerenciamento de arquivos de imagem no servidor)
- **Nodemailer** (Disparo de e-mails via SMTP)
- **Axios** (Requisições HTTP para integrações externas)

### Segurança & Performance
- **Helmet.js** (Proteção de cabeçalhos HTTP e Content Security Policy - CSP)
- **Express-Rate-Limit** (Proteção contra ataques DDoS e Brute Force no Login/Recuperação de senha)

---

## 🚀 Como executar o projeto localmente

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) instalado.
- Servidor [MySQL](https://www.mysql.com/) rodando localmente (ex: XAMPP, WAMP ou Docker).

### 2. Clonando o repositório
git clone [https://github.com/Lobibun/Site_Revenda_Veiculos.git](https://github.com/Lobibun/Site_Revenda_Veiculos.git)
cd Site_Revenda_Veiculos

3. Instalando as dependências
Bash
npm install

4. Configurando as Variáveis de Ambiente (.env)
Crie um arquivo .env na raiz do projeto contendo as seguintes configurações:
# Configurações do Servidor
PORT=3000

# Configurações do Banco de Dados MySQL
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=nome_do_banco

# Configuração de Sessão
SESSION_SECRET=uma_chave_secreta_muito_forte_aqui

# Configuração de E-mail (Nodemailer)
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_app_do_gmail

5. Configurando o Banco de Dados
Certifique-se de criar o banco de dados e as tabelas correspondentes (Carros, Usuarios, Vendedores, Opcionais, Auditoria, etc.) no seu SGBD MySQL antes de rodar a aplicação.

6. Iniciando o Servidor
   node server.js

   👨‍💻 Desenvolvedor
[Alan Farias Lopes / Lobibun]

💼 LinkedIn: www.linkedin.com/in/alan-farias-lopes-982976289

🐙 GitHub: @Lobibun

✉️ E-mail: alanfl885@gmail.com
