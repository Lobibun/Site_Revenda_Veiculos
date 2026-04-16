-- ==========================================
-- 1. ESTRUTURA INICIAL
-- ==========================================
CREATE DATABASE IF NOT EXISTS revendedora
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE revendedora;

-- ==========================================
-- 2. TABELAS DE APOIO (CADASTROS BASE)
-- ==========================================

-- Tabela de Marcas (Universal: Carros, Motos e Caminhões)
CREATE TABLE IF NOT EXISTS Marcas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) UNIQUE NOT NULL
);

-- Tabela de Opcionais (Geral)
CREATE TABLE IF NOT EXISTS Opcionais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL
);

-- ==========================================
-- 3. INSERÇÃO DE DADOS (LISTA COMPLETA)
-- ==========================================

-- Marcas (Populares, Premium, Motos e Pesados)
INSERT INTO Marcas (nome) VALUES 
('Toyota'), ('Honda'), ('Chevrolet'), ('Ford'), ('Volkswagen'), ('Fiat'), -- Populares
('Hyundai'), ('Renault'), ('Nissan'), ('Jeep'), ('Peugeot'), ('Citroën'), -- Médios
('BMW'), ('Mercedes-Benz'), ('Audi'), ('Volvo'), ('Land Rover'), ('Porsche'), -- Premium
('Mitsubishi'), ('Suzuki'), ('Subaru'), ('Kia'), ('CAOA Chery'), ('BYD'), ('GWM'), -- Outras/Elétricos
('Yamaha'), ('Kawasaki'), ('Harley-Davidson'), ('Triumph'), ('Ducati'), ('Royal Enfield'), -- Motos
('Scania'), ('Iveco'), ('DAF'), ('MAN'); -- Caminhões

-- Opcionais (Tecnologia, Conforto e Segurança)
INSERT INTO Opcionais (nome) VALUES 
('Ar-condicionado'), ('Ar-condicionado Digital'), ('Direção Hidráulica'), ('Direção Elétrica'),
('Vidros Elétricos'), ('Travas Elétricas'), ('Retrovisores Elétricos'), ('Alarme'),
('Airbag Frontal'), ('Airbag Lateral'), ('Airbags de Cortina'), ('Freio ABS'),
('Controle de Estabilidade (ESP)'), ('Controle de Tração'), ('Assistente de Partida em Rampa'),
('Bancos de Couro'), ('Ajuste Elétrico dos Bancos'), ('Aquecimento de Bancos'),
('Central Multimídia'), ('Conexão Bluetooth'), ('Espelhamento de Celular (Android/Apple)'),
('Computador de Bordo'), ('Piloto Automático'), ('Piloto Automático Adaptativo (ACC)'),
('Câmera de Ré'), ('Sensor de Estacionamento'), ('Sensor de Chuva'), ('Acendimento Automático de Faróis'),
('Faróis de LED'), ('Faróis de Xenon'), ('Teto Solar'), ('Teto Panorâmico'),
('Rodas de Liga Leve'), ('Chave Presencial (Keyless)'), ('Partida no Botão (Start/Stop)'),
('Manual do Proprietário'), ('Chave Reserva'), ('Único Dono'), ('Revisões na Concessionária');

-- ==========================================
-- 4. TABELAS PRINCIPAIS DO SISTEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS Vendedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    foto VARCHAR(255),
    status VARCHAR(20) DEFAULT 'ativo',
    deletado_em DATETIME NULL
);

CREATE TABLE IF NOT EXISTS Usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    senha_hash VARCHAR(255) NOT NULL,
    nivel ENUM('admin', 'vendedor', 'gerente') DEFAULT 'vendedor',
    foto VARCHAR(255),
    reset_token VARCHAR(255),
    reset_expires DATETIME,
    status VARCHAR(20) DEFAULT 'ativo',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletado_em DATETIME NULL
);

CREATE TABLE IF NOT EXISTS Carros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marca_id INT,
    marca VARCHAR(50) NOT NULL, -- Mantido por segurança de redundância
    modelo VARCHAR(50) NOT NULL,
    ano INT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    fipe DECIMAL(10,2),
    quilometragem INT NOT NULL,
    cambio ENUM('Manual', 'Automático') NOT NULL,
    Combustivel ENUM('Gasolina', 'Etanol', 'Flex', 'Diesel', 'Híbrido', 'Elétrico') NOT NULL,
    leilao BOOLEAN NOT NULL DEFAULT FALSE,
    Opcionais BOOLEAN NOT NULL DEFAULT FALSE,
    destaque BOOLEAN DEFAULT FALSE,
    imagem_principal VARCHAR(255),
    status VARCHAR(20) DEFAULT 'Disponível',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    vendido_em DATETIME NULL,
    deletado_em DATETIME NULL,
    FOREIGN KEY (marca_id) REFERENCES Marcas(id)
);

CREATE TABLE IF NOT EXISTS FotosCarro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    carro_id INT,
    caminho VARCHAR(255),
    FOREIGN KEY (carro_id) REFERENCES Carros(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS CarroOpcionais (
    carro_id INT,
    opcional_id INT,
    PRIMARY KEY (carro_id, opcional_id),
    FOREIGN KEY (carro_id) REFERENCES Carros(id) ON DELETE CASCADE,
    FOREIGN KEY (opcional_id) REFERENCES Opcionais(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Configuracoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chave VARCHAR(50) UNIQUE,
    valor VARCHAR(255)
);

CREATE TABLE Auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,             
    nome_usuario VARCHAR(100),  
    acao VARCHAR(20),          
    entidade VARCHAR(50),       
    entidade_id INT,            
    detalhes JSON,            
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    assunto VARCHAR(150),
    mensagem TEXT NOT NULL,
    lida TINYINT(1) DEFAULT 0,
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO Configuracoes (chave, valor) VALUES ('dias_limpeza_lixeira', '30');

ALTER TABLE Carros DROP COLUMN marca;
ALTER TABLE Mensagens ADD COLUMN lida_por VARCHAR(100) DEFAULT NULL;
ALTER TABLE Usuarios ADD COLUMN token_ativacao VARCHAR(255) DEFAULT NULL;