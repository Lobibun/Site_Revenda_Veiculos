const express = require('express');
const mysql = require('mysql2');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// conexão com MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'senhaaqui', 
    database: 'revendedora'
});

db.connect(err => {
    if (err) {
        console.error('Erro ao conectar no banco:', err);
    } else {
        console.log('Conectado ao MySQL');
    }
});

app.get('/carros', (req, res) => {
    db.query('SELECT * FROM Carros', (err, result) => {
        if (err) {
            res.status(500).json(err);
            return;
        }
        res.json(result);
    });
});