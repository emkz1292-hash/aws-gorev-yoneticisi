const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// BAĞLANTI HAVUZU (Kopmaları engelleyen yapı)
const db = mysql.createPool({
    host: 'localhost',
    user: 'nexus',
    password: 'Nexus12345',
    database: 'nexustrade',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Cüzdan Bakiyesi Çekme
app.get('/api/cuzdan', (req, res) => {
    db.query('SELECT usdt_bakiye FROM cuzdan LIMIT 1', (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.json({ usdt_bakiye: 0 });
        res.json(results[0]);
    });
});

// Varlıkları Çekme
app.get('/api/varliklar', (req, res) => {
    db.query('SELECT coin, toplam_miktar FROM varliklar WHERE toplam_miktar > 0', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Geçmiş İşlemleri Çekme
app.get('/api/gecmis', (req, res) => {
    db.query('SELECT coin, islem_tipi, miktar, fiyat, tarih FROM gecmis ORDER BY tarih DESC LIMIT 50', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Kripto Alım Satım İşlemleri
app.post('/api/islem', (req, res) => {
    const { coin, islem_tipi, miktar, fiyat } = req.body;
    const islemMiktari = parseFloat(miktar);
    const islemFiyati = parseFloat(fiyat);
    const toplamTutar = islemMiktari * islemFiyati;

    if (islem_tipi === 'al') {
        db.query('SELECT usdt_bakiye FROM cuzdan LIMIT 1', (err, results) => {
            if (err) return res.status(500).json(err);
            const bakiye = results.length > 0 ? parseFloat(results[0].usdt_bakiye) : 0;
            
            if (bakiye < toplamTutar) return res.status(400).json({ hata: 'Yetersiz USDT bakiyesi!' });
            
            db.query('UPDATE cuzdan SET usdt_bakiye = usdt_bakiye - ?', [toplamTutar], (err) => {
                if (err) return res.status(500).json(err);
                db.query('INSERT INTO varliklar (coin, toplam_miktar) VALUES (?, ?) ON DUPLICATE KEY UPDATE toplam_miktar = toplam_miktar + ?', 
                [coin, islemMiktari, islemMiktari], (err) => {
                    if (err) return res.status(500).json(err);
                    db.query('INSERT INTO gecmis (coin, islem_tipi, miktar, fiyat) VALUES (?, ?, ?, ?)', 
                    [coin, 'al', islemMiktari, islemFiyati], (err) => {
                        if (err) return res.status(500).json(err);
                        res.json({ mesaj: 'Alış işlemi başarılı' });
                    });
                });
            });
        });
    } else if (islem_tipi === 'sat') {
        db.query('SELECT toplam_miktar FROM varliklar WHERE coin = ?', [coin], (err, results) => {
            if (err) return res.status(500).json(err);
            if (results.length === 0 || parseFloat(results[0].toplam_miktar) < islemMiktari) {
                return res.status(400).json({ hata: 'Yetersiz coin bakiyesi!' });
            }
            db.query('UPDATE cuzdan SET usdt_bakiye = usdt_bakiye + ?', [toplamTutar], (err) => {
                if (err) return res.status(500).json(err);
                db.query('UPDATE varliklar SET toplam_miktar = toplam_miktar - ? WHERE coin = ?', [islemMiktari, coin], (err) => {
                    if (err) return res.status(500).json(err);
                    db.query('DELETE FROM varliklar WHERE toplam_miktar <= 0', (err) => {
                        if (err) return res.status(500).json(err);
                        db.query('INSERT INTO gecmis (coin, islem_tipi, miktar, fiyat) VALUES (?, ?, ?, ?)', 
                        [coin, 'sat', islemMiktari, islemFiyati], (err) => {
                            if (err) return res.status(500).json(err);
                            res.json({ mesaj: 'Satış işlemi başarılı' });
                        });
                    });
                });
            });
        });
    }
});

// Para Yatırma ve Çekme
app.post('/api/para-islem', (req, res) => {
    const { islem_tipi, miktar } = req.body;
    const islemMiktari = parseFloat(miktar);

    db.query('SELECT usdt_bakiye FROM cuzdan LIMIT 1', (err, results) => {
        if (err) return res.status(500).json({hata: "Veritabanı okuma hatası"});
        
        const bakiye = results.length > 0 ? parseFloat(results[0].usdt_bakiye) : 0;
        
        if (islem_tipi === 'cek' && bakiye < islemMiktari) {
            return res.status(400).json({ hata: 'Yetersiz likidite!' });
        }
        
        const bakiyeDegisimi = islem_tipi === 'yatir' ? islemMiktari : -islemMiktari;
        
        if (results.length === 0) {
            db.query('INSERT INTO cuzdan (usdt_bakiye) VALUES (?)', [bakiyeDegisimi], (err2) => {
                if (err2) return res.status(500).json({hata: "Bakiye oluşturma hatası"});
                res.json({ mesaj: 'İşlem başarılı.' });
            });
        } else {
            db.query('UPDATE cuzdan SET usdt_bakiye = usdt_bakiye + ?', [bakiyeDegisimi], (err2) => {
                if (err2) return res.status(500).json({hata: "Bakiye güncelleme hatası"});
                res.json({ mesaj: 'İşlem başarılı.' });
            });
        }
    });
});

app.listen(5000, () => {
    console.log('Pro API 5000 portunda aktif.');
});
