CREATE DATABASE IF NOT EXISTS revendedora;
USE revendedora;

CREATE TABLE Carros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    ano INT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    fipe DECIMAL(10,2),
    quilometragem INT NOT NULL,
    cambio ENUM('Manual', 'Automático') NOT NULL,
    leilao BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('Disponível', 'Vendido') DEFAULT 'Disponível'
);

CREATE TABLE Opcionais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL

);

CREATE TABLE Carro_Opcional (
    carro_id INT,
    opcional_id INT,
    PRIMARY KEY (carro_id, opcional_id),
    FOREIGN KEY (carro_id) REFERENCES Carros(id),
    FOREIGN KEY (opcional_id) REFERENCES Opcionais(id)
);

ALTER TABLE Carros ADD COLUMN imagem VARCHAR(255);
ALTER TABLE Carros ADD COLUMN imagem_principal VARCHAR(255);

CREATE TABLE FotosCarro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    carro_id INT,
    caminho VARCHAR(255),
    FOREIGN KEY (carro_id) REFERENCES Carros(id)
);

INSERT INTO FotosCarro (carro_id, caminho)
VALUES
(1, 'img/carros/Corolla/corolla1.jpg'),
(1, 'img/carros/Corolla/corolla2.jpg'),
(1, 'img/carros/Corolla/corolla3.jpg');

ALTER TABLE Carros ADD COLUMN Combustivel ENUM('Gasolina', 'Etanol', 'Flex', 'Diesel', 'Híbrido') NOT NULL;

UPDATE Carros SET Combustivel = 'Flex' WHERE id = 1;
UPDATE Carros SET fipe = 106000.00 WHERE id = 1;
select * from Carros;

ALTER TABLE Carros ADD COLUMN Opcionais BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE Carros SET Opcionais = TRUE WHERE id = 1;

INSERT INTO FotosCarro (carro_id, caminho)
VALUES
(2, 'img/carros/Chevrolet-Vectra/Vectra.png');

DELETE FROM FotosCarro
WHERE carro_id = 3;

DELETE FROM Carros
WHERE id = 3;

ALTER TABLE Carros
ADD destaque BOOLEAN DEFAULT FALSE;

ALTER TABLE Carros
ADD criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE CarroOpcionais (
    carro_id INT,
    opcional_id INT,

    PRIMARY KEY (carro_id, opcional_id),

    FOREIGN KEY (carro_id) REFERENCES Carros(id),
    FOREIGN KEY (opcional_id) REFERENCES Opcionais(id)
);

INSERT INTO Opcionais (nome) VALUES
('Ar condicionado'),
('Direção hidráulica'),
('Vidro elétrico'),
('Trava elétrica'),
('Airbag'),
('Freio ABS'),
('Central multimídia'),
('Sensor de ré'),
('Câmera de ré'),
('Controle de estabilidade'),
('Bancos de couro'),
('Rodas de liga leve');

CREATE TABLE Marcas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO Marcas (nome) VALUES
('Toyota'),
('Honda'),
('Chevrolet'),
('Ford'),
('Volkswagen'),
('Hyundai'),
('Fiat'),
('Jeep'),
('Nissan'),
('Renault');

ALTER TABLE Carros
ADD marca_id INT,
ADD FOREIGN KEY (marca_id) REFERENCES Marcas(id);

UPDATE Carros SET marca_id = 3 WHERE id = 2;
UPDATE Carros SET marca_id = 7 WHERE id = 4;
