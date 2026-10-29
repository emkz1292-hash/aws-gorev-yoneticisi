const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/gorevler', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM gorevler ORDER BY olusturulma_tarihi DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/gorevler', async (req, res) => {
    try {
        const { baslik } = req.body;
        const [result] = await db.query('INSERT INTO gorevler (baslik) VALUES (?)', [baslik]);
        res.json({ id: result.insertId, baslik, tamamlandi: 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/gorevler/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM gorevler WHERE id = ?', [id]);
        res.json({ message: "Görev silindi" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});