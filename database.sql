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