const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456', // <-- Kendi şifreni buraya yaz (Tırnak işaretlerini silme)
    database: 'aws_proje_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();