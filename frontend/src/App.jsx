import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [gorevler, setGorevler] = useState([])
  const [yeniGorev, setYeniGorev] = useState('')

  // Sayfa açıldığında Node.js üzerinden MySQL'den görevleri çek
  useEffect(() => {
    gorevleriGetir()
  }, [])

  const gorevleriGetir = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/gorevler')
      setGorevler(response.data)
    } catch (error) {
      console.error("Görevler çekilirken hata:", error)
    }
  }

  const gorevEkle = async (e) => {
    e.preventDefault() // Sayfanın yenilenmesini engeller
    if (!yeniGorev) return

    try {
      await axios.post('http://localhost:5000/api/gorevler', { baslik: yeniGorev })
      setYeniGorev('') // Kutuyu temizle
      gorevleriGetir() // Listeyi güncelle
    } catch (error) {
      console.error("Görev eklenirken hata:", error)
    }
  }

  const gorevSil = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/gorevler/${id}`)
      gorevleriGetir() // Listeyi güncelle
    } catch (error) {
      console.error("Görev silinirken hata:", error)
    }
  }

  return (
    <div className="uygulama">
      <h1>AWS Projesi - Görev Yöneticisi</h1>
      
      <form onSubmit={gorevEkle} className="form-alani">
        <input 
          type="text" 
          value={yeniGorev}
          onChange={(e) => setYeniGorev(e.target.value)}
          placeholder="Yeni görev ekle..." 
        />
        <button type="submit">Ekle</button>
      </form>

      <ul className="gorev-listesi">
        {gorevler.map((gorev) => (
          <li key={gorev.id}>
            <span>{gorev.baslik}</span>
            <button onClick={() => gorevSil(gorev.id)} className="sil-butonu">Sil</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App