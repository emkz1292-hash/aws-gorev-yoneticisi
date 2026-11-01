import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Chart from 'react-apexcharts';

const baslangicKriptolari = [
  { sembol: 'BTC', ad: 'Bitcoin', renk: 'bg-gradient-to-tr from-orange-500 to-yellow-400', hacim: '42.5B' },
  { sembol: 'ETH', ad: 'Ethereum', renk: 'bg-gradient-to-tr from-blue-600 to-cyan-400', hacim: '18.2B' },
  { sembol: 'SOL', ad: 'Solana', renk: 'bg-gradient-to-tr from-purple-500 to-emerald-400', hacim: '5.1B' },
  { sembol: 'AVAX', ad: 'Avalanche', renk: 'bg-gradient-to-tr from-red-500 to-rose-400', hacim: '1.2B' },
  { sembol: 'XRP', ad: 'Ripple', renk: 'bg-gradient-to-tr from-gray-600 to-gray-400', hacim: '2.8B' },
];

function App() {
  const [sistemeGirdiMi, setSistemeGirdiMi] = useState(false);
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [loginIsim, setLoginIsim] = useState('');
  const [loginSifre, setLoginSifre] = useState('');
  const [beniHatirla, setBeniHatirla] = useState(false);
  
  const [kurtarmaAdimi, setKurtarmaAdimi] = useState(0); 
  const [kurtarmaInput, setKurtarmaInput] = useState('');
  const [kurtarmaKod, setKurtarmaKod] = useState('');
  const [yeniSifre1, setYeniSifre1] = useState('');
  const [yeniSifre2, setYeniSifre2] = useState('');

  const [bakiye, setBakiye] = useState(0);
  const [varliklar, setVarliklar] = useState([]);
  const [gecmisIslemler, setGecmisIslemler] = useState([]);
  const [islemMiktari, setIslemMiktari] = useState('');
  const [aktifSekme, setAktifSekme] = useState('genel');
  const [bildirim, setBildirim] = useState(null);
  
  const [piyasalar, setPiyasalar] = useState(baslangicKriptolari.map(c => ({...c, fiyat: 0, degisim: '0.00%', trend: 'up'})));
  const [aktifKripto, setAktifKripto] = useState('BTC');
  const [mumVerisi, setMumVerisi] = useState([]);
  const [emirDefteri, setEmirDefteri] = useState({ alis: [], satis: [] });
  
  const [terminalKomutu, setTerminalKomutu] = useState('');
  const [aiAnalizi, setAiAnalizi] = useState({ tavsiye: 'ANALİZ EDİLİYOR...', oran: 0, detay: 'Piyasa verileri toplanıyor...' });
  
  const wsRef = useRef(null);
  const aktifKriptoRef = useRef(aktifKripto);
  const [isimInput, setIsimInput] = useState('');

  useEffect(() => {
    const kayitliKullanici = localStorage.getItem('nexus_user');
    if (kayitliKullanici) {
      setKullaniciAdi(kayitliKullanici);
      setSistemeGirdiMi(true);
    }
  }, []);

  useEffect(() => { aktifKriptoRef.current = aktifKripto; }, [aktifKripto]);

  const bildirimGoster = (mesaj, tip = 'basari') => {
    setBildirim({ mesaj, tip });
    setTimeout(() => setBildirim(null), 3500);
  };

  const veritabaniniGetir = async () => {
    try {
      const resCuzdan = await axios.get('/api/cuzdan');
      setBakiye(resCuzdan.data.usdt_bakiye);
      const resVarlik = await axios.get('/api/varliklar');
      setVarliklar(resVarlik.data);
      const resGecmis = await axios.get('/api/gecmis');
      setGecmisIslemler(resGecmis.data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (!sistemeGirdiMi) return;
    veritabaniniGetir();

    if(wsRef.current) wsRef.current.close();
    
    const streams = baslangicKriptolari.map(c => `${c.sembol.toLowerCase()}usdt@ticker`).join('/');
    wsRef.current = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPiyasalar(prev => prev.map(coin => {
        if (data.s === `${coin.sembol}USDT`) {
          const yeniFiyat = parseFloat(data.c);
          return { ...coin, eskiFiyat: coin.fiyat, fiyat: yeniFiyat, degisim: parseFloat(data.P).toFixed(2) + '%', trend: yeniFiyat >= coin.fiyat ? 'up' : 'down' };
        }
        return coin;
      }));
      
      if(data.s === `${aktifKriptoRef.current}USDT`) {
        const base = parseFloat(data.c);
        const spread = base * 0.0002;
        const satislar = Array.from({length: 6}, (_, i) => ({ fiyat: base + (i+1)*spread, miktar: (Math.random()*3+0.1).toFixed(3) })).reverse();
        const alislar = Array.from({length: 6}, (_, i) => ({ fiyat: base - (i+1)*spread, miktar: (Math.random()*3+0.1).toFixed(3) }));
        setEmirDefteri({ satis: satislar, alis: alislar });
      }
    };

    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [sistemeGirdiMi]);

  useEffect(() => {
    if (!sistemeGirdiMi) return;
    setMumVerisi([]); 
    axios.get(`https://api.binance.com/api/v3/klines?symbol=${aktifKripto}USDT&interval=1h&limit=24`).then(res => {
      const klineData = res.data.map(d => ({ x: new Date(d[0]), y: [parseFloat(d[1]), parseFloat(d[2]), parseFloat(d[3]), parseFloat(d[4])] }));
      setMumVerisi([{ data: klineData }]);
    });

    const aktifVeri = piyasalar.find(p => p.sembol === aktifKripto);
    if(aktifVeri) {
      const guc = Math.random() * 100;
      if (aktifVeri.trend === 'up') {
        setAiAnalizi({ tavsiye: 'GÜÇLÜ AL', oran: (guc > 50 ? guc : guc + 50).toFixed(1), detay: 'MACD kesişimi pozitif, RSI yükseliş trendinde. Kurumsal balina girişleri tespit edildi.' });
      } else {
        setAiAnalizi({ tavsiye: 'RİSKLİ / SAT', oran: (guc > 50 ? guc : guc + 50).toFixed(1), detay: 'Bollinger bantları daralıyor, hacim yetersiz. Açığa satış (Short) baskısı artıyor.' });
      }
    }
  }, [aktifKripto, sistemeGirdiMi]);

  const portfoyAnalizi = varliklar.map(v => {
    const anlikFiyat = piyasalar.find(p => p.sembol === v.coin)?.fiyat || 0;
    const guncelDeger = parseFloat(v.toplam_miktar) * anlikFiyat;
    const coinIslemleri = gecmisIslemler.filter(i => i.coin === v.coin && i.islem_tipi === 'al');
    const toplamMaliyet = coinIslemleri.reduce((acc, islem) => acc + (parseFloat(islem.miktar) * parseFloat(islem.fiyat)), 0);
    const toplamAlinanAdet = coinIslemleri.reduce((acc, islem) => acc + parseFloat(islem.miktar), 0);
    const ortalamaMaliyet = toplamAlinanAdet > 0 ? toplamMaliyet / toplamAlinanAdet : 0;
    const pnl = guncelDeger - (parseFloat(v.toplam_miktar) * ortalamaMaliyet);
    const pnlYuzde = ortalamaMaliyet > 0 ? (pnl / (parseFloat(v.toplam_miktar) * ortalamaMaliyet)) * 100 : 0;
    return { ...v, anlikFiyat, guncelDeger, ortalamaMaliyet, pnl, pnlYuzde };
  });

  const toplamKriptoDegeri = portfoyAnalizi.reduce((acc, val) => acc + val.guncelDeger, 0);
  const netDeger = parseFloat(bakiye) + toplamKriptoDegeri;
  const toplamPnl = portfoyAnalizi.reduce((acc, val) => acc + val.pnl, 0);

  const mumGrafikAyarlari = {
    chart: { type: 'candlestick', background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
    theme: { mode: 'dark' },
    plotOptions: { candlestick: { colors: { upward: '#10b981', downward: '#f43f5e' }, wick: { useFillColor: true } } },
    xaxis: { type: 'datetime', labels: { style: { colors: '#9ca3af' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (val) => "$" + val.toLocaleString(), style: { colors: '#9ca3af', fontWeight: 'bold' } }, tooltip: { enabled: true } },
    grid: { borderColor: '#1f2937', strokeDashArray: 3, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } }
  };

  const islemYap = async (coin, islem_tipi, miktar, ozelFiyat = null) => {
    const anlikFiyat = ozelFiyat || piyasalar.find(p => p.sembol === coin)?.fiyat;
    if(!anlikFiyat) return;
    try {
      await axios.post('/api/islem', { coin, islem_tipi, miktar, fiyat: anlikFiyat });
      bildirimGoster(`Emir Onaylandı: ${miktar} ${coin} ${islem_tipi === 'al' ? 'Alındı' : 'Satıldı'} @ $${anlikFiyat.toLocaleString()}`, 'basari');
      veritabaniniGetir();
    } catch (error) { bildirimGoster(error.response?.data?.hata || 'Likidite Hatası!', 'hata'); }
  };

  const komutCalistir = (e) => {
    e.preventDefault();
    const komut = terminalKomutu.trim().toLowerCase().split(' ');
    if(komut.length === 3 && (komut[0] === '/al' || komut[0] === '/sat')) {
      const islem = komut[0].substring(1); 
      const coin = komut[1].toUpperCase();
      const miktar = parseFloat(komut[2]);
      
      const mevcutKripto = piyasalar.find(p => p.sembol === coin);
      if(!mevcutKripto) { bildirimGoster(`HATA: ${coin} tahtada bulunamadı!`, 'hata'); } 
      else if(isNaN(miktar) || miktar <= 0) { bildirimGoster('HATA: Geçersiz miktar!', 'hata'); }
      else { islemYap(coin, islem, miktar, mevcutKripto.fiyat); }
    } else {
      bildirimGoster('Geçersiz Komut! Format: /al BTC 0.5', 'hata');
    }
    setTerminalKomutu('');
  };

  const paraYatirCek = async (tip) => {
  if (!islemMiktari || Number(islemMiktari) <= 0) return;
  try {
    // DÜZELTİLDİ: IP adresi silindi, doğrudan /api/para-islem kullanılıyor
    await axios.post('/api/para-islem', { islem_tipi: tip, miktar: Number(islemMiktari) });
    setIslemMiktari('');
    bildirimGoster(`Fon Transferi: ${tip === 'yatir' ? '+' : '-'}$${islemMiktari}`, 'basari');
    veritabaniniGetir();
  } catch (error) { 
    // Hata durumunda gerçeği yansıtması için mesaj güncellendi
    bildirimGoster(error.response?.data?.hata || 'Sistem/Ağ Hatası!', 'hata'); 
  }
};
  const girisYap = (e) => {
    e.preventDefault();
    if(loginIsim.trim() !== '' && loginSifre.trim() !== '') {
      setKullaniciAdi(loginIsim);
      setSistemeGirdiMi(true);
      if(beniHatirla) localStorage.setItem('nexus_user', loginIsim);
    }
  };

  const cikisYap = () => {
    localStorage.removeItem('nexus_user'); 
    setSistemeGirdiMi(false);
    setKullaniciAdi('');
    setLoginSifre('');
  };

  const sifreKurtarmaIleri = (e) => {
    e.preventDefault();
    if(kurtarmaAdimi === 1) {
      if(!kurtarmaInput) return;
      setKurtarmaAdimi(2);
      bildirimGoster('+90 554 *** ** 71 numaralı cihazınıza doğrulama kodu iletildi.', 'basari');
    } else if(kurtarmaAdimi === 2) {
      if(!kurtarmaKod) return;
      setKurtarmaAdimi(3);
    } else if(kurtarmaAdimi === 3) {
      if(yeniSifre1 !== yeniSifre2) { bildirimGoster('Şifreler eşleşmiyor!', 'hata'); return; }
      setKurtarmaAdimi(0);
      setKurtarmaInput(''); setKurtarmaKod(''); setYeniSifre1(''); setYeniSifre2('');
      bildirimGoster('Şifreniz başarıyla güncellendi.', 'basari');
    }
  };

  const isimGuncelle = (e) => {
    e.preventDefault();
    if(isimInput.trim() !== '') {
      setKullaniciAdi(isimInput);
      if(localStorage.getItem('nexus_user')) localStorage.setItem('nexus_user', isimInput);
      setIsimInput('');
      bildirimGoster('Sistem Kimliği güncellendi!', 'basari');
    }
  };

  const aktifCoinVerisi = piyasalar.find(p => p.sembol === aktifKripto) || piyasalar[0];

  const crtGlow = `
    .scanlines {
      background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
      background-size: 100% 4px;
      pointer-events: none;
      position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 50; opacity: 0.3;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(20, 184, 166, 0.2);
      border-radius: 2px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(20, 184, 166, 0.4);
    }
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    body {
      overflow: hidden; 
    }
  `;

  if (!sistemeGirdiMi) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[#02050a] font-sans p-4 relative overflow-hidden">
        <style>{crtGlow}</style>
        <div className="scanlines"></div>
        <div className="absolute w-[1000px] h-[1000px] bg-emerald-600/5 rounded-full blur-[200px] animate-pulse" style={{ animationDuration: '5s' }}></div>
        <div className="absolute w-[800px] h-[800px] bg-cyan-600/5 rounded-full blur-[150px] animate-pulse right-0 bottom-0" style={{ animationDuration: '7s' }}></div>
        
        {bildirim && (
          <div className="fixed top-8 right-8 z-50">
            <div className={`px-6 py-4 rounded-xl border backdrop-blur-2xl shadow-2xl flex items-center space-x-3 ${bildirim.tip === 'basari' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100' : 'bg-rose-950/90 border-rose-500/30 text-rose-100'}`}>
              <span className="text-xl">{bildirim.tip === 'basari' ? '✓' : '⚠'}</span>
              <p className="font-bold tracking-wide text-sm">{bildirim.mesaj}</p>
            </div>
          </div>
        )}

        <div className="bg-gray-950/90 backdrop-blur-3xl p-8 md:p-10 rounded-2xl border border-gray-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-sm z-10 relative">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 tracking-tighter mb-2 drop-shadow-lg">NEXUS<span className="text-white">.AI</span></h1>
            <h2 className="text-[10px] font-bold text-gray-500 tracking-[0.4em] uppercase">{kurtarmaAdimi > 0 ? 'Güvenlik İhlal Protokolü' : 'Quant Ticaret Ağı'}</h2>
          </div>
          
          {kurtarmaAdimi === 0 ? (
            <form onSubmit={girisYap} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Kullanıcı Adı / Ağ Kimliği</label>
                <input type="text" required value={loginIsim} onChange={e => setLoginIsim(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-bold text-sm placeholder-gray-700 shadow-inner" placeholder="Kullanıcı Adınızı Giriniz" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Şifreli Erişim Anahtarı</label>
                <input type="password" required value={loginSifre} onChange={e => setLoginSifre(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-bold text-sm placeholder-gray-700 shadow-inner" placeholder="Şifrenizi Giriniz" />
              </div>
              <div className="flex justify-between items-center px-1 py-1">
                <label onClick={() => setBeniHatirla(!beniHatirla)} className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${beniHatirla ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-800 border-gray-700 group-hover:border-cyan-500'}`}>
                    {beniHatirla && <span className="text-gray-950 text-[10px] font-black">✓</span>}
                  </div>
                  <span className="group-hover:text-white transition-colors font-bold tracking-wide">Beni Hatırla</span>
                </label>
                <button type="button" onClick={() => setKurtarmaAdimi(1)} className="text-[10px] text-cyan-500 hover:text-cyan-300 transition-colors font-bold uppercase tracking-widest">Şifremi Kurtar</button>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] text-sm tracking-widest mt-2 uppercase">Oturum Aç</button>
            </form>
          ) : (
            <form onSubmit={sifreKurtarmaIleri} className="space-y-4">
              {kurtarmaAdimi === 1 && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Kullanıcı Adınız</label>
                  <input type="text" required value={kurtarmaInput} onChange={e => setKurtarmaInput(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 font-bold text-sm placeholder-gray-700" placeholder="Kullanıcı Adınızı Giriniz" />
                </div>
              )}
              {kurtarmaAdimi === 2 && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Telefona Gelen SMS Kodu (2FA)</label>
                  <input type="text" required value={kurtarmaKod} onChange={e => setKurtarmaKod(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-cyan-400 focus:outline-none focus:border-cyan-500/50 font-mono tracking-[1em] text-center text-lg font-black placeholder-gray-800" maxLength="6" placeholder="------" />
                </div>
              )}
              {kurtarmaAdimi === 3 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Yeni Güvenlik Şifresi</label>
                    <input type="password" required value={yeniSifre1} onChange={e => setYeniSifre1(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 font-bold text-sm placeholder-gray-700" placeholder="Yeni Şifrenizi Giriniz" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Şifreyi Doğrula</label>
                    <input type="password" required value={yeniSifre2} onChange={e => setYeniSifre2(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 font-bold text-sm placeholder-gray-700" placeholder="Yeni Şifrenizi Tekrar Giriniz" />
                  </div>
                </div>
              )}
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => {setKurtarmaAdimi(0); setKurtarmaInput('');}} className="w-1/3 bg-gray-800 hover:bg-gray-700 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all border border-gray-700">İptal</button>
                <button type="submit" className="w-2/3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all shadow-md">Devam Et</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // MOBİLDE KUSURSUZ GÖRÜNÜM İÇİN YENİDEN TASARLANMIŞ YAPI
  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[#02050a] text-gray-200 font-sans relative selection:bg-cyan-500/30">
      <style>{crtGlow}</style>
      <div className="scanlines hidden md:block"></div>

      {bildirim && (
        <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50 animate-bounce">
          <div className={`relative px-4 py-3 md:px-6 md:py-4 rounded-xl border backdrop-blur-2xl shadow-lg flex items-center space-x-3 overflow-hidden ${bildirim.tip === 'basari' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100' : 'bg-rose-950/90 border-rose-500/30 text-rose-100'}`}>
            <span className="text-lg md:text-xl drop-shadow-md">{bildirim.tip === 'basari' ? '✓' : '⚠'}</span>
            <p className="font-bold tracking-wide text-xs md:text-sm">{bildirim.mesaj}</p>
          </div>
        </div>
      )}

      {/* MOBİL VE MASAÜSTÜ İÇİN DİNAMİK SOL/ÜST MENÜ */}
      <aside className="w-full md:w-[260px] md:h-screen bg-gray-950/90 backdrop-blur-3xl border-b md:border-b-0 md:border-r border-gray-800/80 flex flex-col z-30 shrink-0 md:shadow-[10px_0_30px_rgba(0,0,0,0.5)] relative">
        
        {/* Logo Alanı */}
        <div className="p-4 md:p-6 pb-2 md:pb-4 shrink-0 flex justify-between items-center md:block border-b border-gray-800/50 md:border-none">
          <div>
            <div className="text-2xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tighter drop-shadow-md">NEXUS<span className="text-white">.AI</span></div>
            <div className="hidden md:flex mt-2 items-center space-x-2 bg-gray-900/80 px-2.5 py-1 rounded-md border border-gray-800 w-fit">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] font-black text-emerald-400 tracking-widest uppercase">Node: Active</span>
            </div>
          </div>
          {/* Mobilde Profil İkonu / Çıkış */}
          <div className="flex md:hidden items-center space-x-3">
             <div className="w-8 h-8 bg-gradient-to-br from-cyan-600 to-blue-800 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-inner border border-cyan-500/30">{kullaniciAdi.charAt(0).toUpperCase()}</div>
             <button onClick={cikisYap} className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20" title="Çıkış Yap">⎋</button>
          </div>
        </div>
        
        {/* Navigasyon - Mobilde Yatay, Masaüstünde Dikey */}
        <nav className="flex flex-row md:flex-col flex-1 px-2 md:px-4 py-3 md:py-6 space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-y-auto hide-scrollbar shrink-0 md:shrink border-b border-gray-800/50 md:border-none">
          <p className="text-[9px] font-black text-gray-600 tracking-[0.3em] uppercase mb-2 ml-2 hidden md:block">Görünüm</p>
          <button onClick={() => setAktifSekme('genel')} className={`px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl font-bold transition-all whitespace-nowrap text-left flex items-center space-x-2 md:space-x-3 group ${aktifSekme === 'genel' ? 'bg-gray-800/90 text-white border border-gray-700/80 shadow-md' : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'}`}>
             <span className="text-sm md:text-lg group-hover:scale-110 transition-transform">🖥️</span> <span className="tracking-wide text-xs md:text-sm">Terminal Özeti</span>
          </button>
          <button onClick={() => setAktifSekme('piyasalar')} className={`px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl font-bold transition-all whitespace-nowrap text-left flex items-center space-x-2 md:space-x-3 group ${aktifSekme === 'piyasalar' ? 'bg-gray-800/90 text-white border border-gray-700/80 shadow-md' : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'}`}>
             <span className="text-sm md:text-lg group-hover:scale-110 transition-transform">🌐</span> <span className="tracking-wide text-xs md:text-sm">Global Piyasalar</span>
          </button>
          
          <p className="text-[9px] font-black text-gray-600 tracking-[0.3em] uppercase mt-6 mb-2 ml-2 hidden md:block">Finansal İşlemler</p>
          <button onClick={() => setAktifSekme('cuzdan')} className={`px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl font-bold transition-all whitespace-nowrap text-left flex items-center space-x-2 md:space-x-3 group ${aktifSekme === 'cuzdan' ? 'bg-gray-800/90 text-white border border-gray-700/80 shadow-md' : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'}`}>
             <span className="text-sm md:text-lg group-hover:scale-110 transition-transform">🏦</span> <span className="tracking-wide text-xs md:text-sm">Kasa ve Likidite</span>
          </button>
          <button onClick={() => setAktifSekme('gecmis')} className={`px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl font-bold transition-all whitespace-nowrap text-left flex items-center space-x-2 md:space-x-3 group ${aktifSekme === 'gecmis' ? 'bg-gray-800/90 text-white border border-gray-700/80 shadow-md' : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'}`}>
             <span className="text-sm md:text-lg group-hover:scale-110 transition-transform">📜</span> <span className="tracking-wide text-xs md:text-sm">Ledger Kayıtları</span>
          </button>
          
          <p className="text-[9px] font-black text-gray-600 tracking-[0.3em] uppercase mt-6 mb-2 ml-2 hidden md:block">Sistem</p>
          <button onClick={() => setAktifSekme('ayarlar')} className={`px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl font-bold transition-all whitespace-nowrap text-left flex items-center space-x-2 md:space-x-3 group ${aktifSekme === 'ayarlar' ? 'bg-gray-800/90 text-white border border-gray-700/80 shadow-md' : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'}`}>
             <span className="text-sm md:text-lg group-hover:scale-110 transition-transform">🛡️</span> <span className="tracking-wide text-xs md:text-sm">Güvenlik & Ayarlar</span>
          </button>
        </nav>

        {/* Masaüstü Profil Alanı (Mobilde Gizli) */}
        <div className="hidden md:flex p-4 border-t border-gray-800/80 shrink-0">
          <div className="flex w-full items-center justify-between bg-gray-900/80 p-3 rounded-xl border border-gray-800">
            <div className="flex items-center space-x-3 overflow-hidden">
               <div className="w-8 h-8 bg-gradient-to-br from-cyan-600 to-blue-800 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-inner border border-cyan-500/30">{kullaniciAdi.charAt(0).toUpperCase()}</div>
               <div className="overflow-hidden">
                 <p className="text-xs font-bold text-white tracking-wide truncate">{kullaniciAdi}</p>
                 <p className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase mt-0.5">Root Admin</p>
               </div>
            </div>
            <button onClick={cikisYap} className="p-1.5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded-lg transition-colors bg-gray-950 border border-gray-800 hover:border-rose-500/50" title="Ağdan Çık">⎋</button>
          </div>
        </div>
      </aside>

      {/* Ana İçerik Alanı */}
      <main className="flex-1 flex flex-col z-10 relative overflow-hidden bg-[#02050a] min-w-0">
        
        {/* Üst Başlık */}
        <header className="flex justify-between items-center p-4 md:px-8 md:py-6 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl shrink-0 w-full">
          <h1 className="text-lg md:text-2xl font-black text-white tracking-tight uppercase drop-shadow-md truncate">
            {aktifSekme === 'genel' ? 'Terminal Özeti' : 
             aktifSekme === 'piyasalar' ? 'Global Kripto Endeksleri' : 
             aktifSekme === 'cuzdan' ? 'Kasa ve Likidite Yönetimi' : 
             aktifSekme === 'gecmis' ? 'Şifrelenmiş Ledger Dökümü' : 'Sistem Yapılandırması'}
          </h1>
          <div className="hidden md:flex space-x-3 shrink-0">
             <div className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg flex flex-col items-end shadow-inner">
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mb-0.5">Ağ Zamanı (UTC+3)</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{new Date().toLocaleTimeString('tr-TR')}</span>
             </div>
          </div>
        </header>

        {/* KAYDIRILABİLİR İÇERİK */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar p-3 md:p-8 z-20">
          <div className="flex flex-col gap-4 md:gap-6 w-full max-w-[1600px] mx-auto pb-8">
          
          {aktifSekme === 'genel' && (
            <>
              {/* Üst İstatistikler */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div className="bg-gray-950/80 p-5 md:p-6 rounded-2xl border border-gray-800/80 backdrop-blur-xl flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-[30px]"></div>
                  <h3 className="text-gray-500 text-[10px] font-black tracking-[0.1em] uppercase mb-1 relative z-10">Brüt Rezerv Büyüklüğü</h3>
                  <p className="text-2xl lg:text-4xl font-mono font-black text-white tracking-tighter drop-shadow-md relative z-10 truncate">${netDeger.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  <div className="mt-4 flex justify-between items-end border-t border-gray-800/80 pt-3 relative z-10">
                     <div className="overflow-hidden">
                       <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Nakit (USDT)</p>
                       <p className="font-mono text-xs lg:text-sm font-bold text-cyan-400 mt-0.5 truncate">${Number(bakiye).toLocaleString('en-US', {minimumFractionDigits: 0})}</p>
                     </div>
                     <div className="text-right overflow-hidden ml-2">
                       <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Varlık (Kripto)</p>
                       <p className="font-mono text-xs lg:text-sm font-bold text-purple-400 mt-0.5 truncate">${toplamKriptoDegeri.toLocaleString('en-US', {minimumFractionDigits: 0})}</p>
                     </div>
                  </div>
                </div>

                <div className="bg-gray-950/80 p-5 md:p-6 rounded-2xl border border-gray-800/80 backdrop-blur-xl flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <h3 className="text-gray-500 text-[10px] font-black tracking-[0.1em] uppercase mb-1">Açık PnL (Kâr/Zarar)</h3>
                  <p className={`text-2xl lg:text-4xl font-mono font-black tracking-tight drop-shadow-md truncate ${toplamPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {toplamPnl >= 0 ? '+' : '-'}${Math.abs(toplamPnl).toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </p>
                  <div className="mt-4 border-t border-gray-800/80 pt-3 relative z-10">
                    <div className="flex justify-between items-center mb-1.5">
                       <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Portföy Kârlılığı (ROE)</p>
                       <p className={`text-[10px] font-black ${toplamPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{((toplamPnl / (netDeger||1))*100).toFixed(2)}%</p>
                    </div>
                    <div className="w-full bg-gray-900 rounded-full h-1.5 border border-gray-800">
                      <div className={`h-full rounded-full ${toplamPnl >= 0 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} style={{width: `${Math.min(Math.abs(toplamPnl) / (netDeger || 1) * 100, 100)}%`}}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 p-5 md:p-6 rounded-2xl border border-emerald-500/30 backdrop-blur-xl flex flex-col justify-between shadow-[0_0_20px_rgba(16,185,129,0.1)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-emerald-500/5 to-transparent z-0"></div>
                  <div className="flex items-center space-x-2 mb-1 relative z-10">
                     <span className="text-xl animate-pulse">🧠</span>
                     <h3 className="text-emerald-400 text-[10px] font-black tracking-[0.2em] uppercase truncate">NEXUS AI Analizi</h3>
                  </div>
                  <div className="relative z-10">
                    <p className={`text-xl lg:text-3xl font-black tracking-tighter truncate ${aiAnalizi.tavsiye.includes('AL') ? 'text-emerald-400' : 'text-rose-400'}`}>{aiAnalizi.tavsiye}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 mb-2 truncate">Güven Oranı: %{aiAnalizi.oran}</p>
                  </div>
                  <div className="mt-1 border-t border-emerald-500/20 pt-2 relative z-10 bg-gray-950/50 p-2.5 rounded-lg">
                    <p className="text-[10px] text-gray-300 font-medium leading-relaxed truncate whitespace-normal break-words line-clamp-2">[{aktifKripto}] {aiAnalizi.detay}</p>
                  </div>
                </div>
              </div>

              {/* DİNAMİK GRAFİK VE EMİR DEFTERİ */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 w-full">
                <div className="xl:col-span-3 bg-gray-950/80 backdrop-blur-2xl rounded-2xl border border-gray-800/80 p-4 shadow-lg flex flex-col min-w-0">
                  <div className="flex justify-between items-center mb-4 px-3 bg-gray-900/50 py-3 rounded-xl border border-gray-800 flex-wrap gap-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${aktifCoinVerisi.renk} rounded-lg flex items-center justify-center border border-white/20 shadow-md shrink-0`}><span className="text-white font-black text-xs">{aktifCoinVerisi.sembol}</span></div>
                      <div className="overflow-hidden">
                        <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center space-x-2 flex-wrap"><span>{aktifKripto}/USDT</span> <span className="text-[8px] md:text-[9px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded-md uppercase tracking-widest mt-0.5 sm:mt-0">Vadeli İşlem</span></h2>
                        <p className={`font-mono font-black text-sm md:text-base mt-0.5 truncate ${aktifCoinVerisi.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>${aktifCoinVerisi.fiyat.toLocaleString()} <span className="text-[9px] md:text-[10px] ml-1 bg-gray-950 px-1.5 py-0.5 rounded">{aktifCoinVerisi.degisim}</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 w-full bg-gray-900/20 rounded-xl border border-gray-800/50 p-1 min-h-[250px] lg:min-h-[300px]">
                    {mumVerisi.length > 0 ? (
                      <Chart options={mumGrafikAyarlari} series={mumVerisi} type="candlestick" height="100%" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>
                    )}
                  </div>
                </div>

                <div className="xl:col-span-1 bg-gray-950/80 backdrop-blur-2xl rounded-2xl border border-gray-800/80 p-4 shadow-lg flex flex-col min-w-0">
                  <div className="flex justify-between items-center mb-3 px-1">
                    <h2 className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase truncate">Derinlik (Orderbook)</h2>
                    <span className="text-[9px] text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 font-bold font-mono">0.01</span>
                  </div>
                  <div className="flex text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 px-1 border-b border-gray-800 pb-1.5"><span className="flex-1 truncate">Fiyat (USDT)</span><span className="text-right truncate">Miktar ({aktifKripto})</span></div>
                  <div className="flex-1 flex flex-col font-mono text-xs overflow-hidden">
                    <div className="flex-1 flex flex-col justify-end space-y-[1px] mb-1 overflow-hidden">
                      {emirDefteri.satis.map((emir, i) => (
                        <div key={`s-${i}`} onClick={() => islemYap(aktifKripto, 'al', 1, emir.fiyat)} className="flex justify-between px-2 py-0.5 hover:bg-gray-800/80 relative group cursor-pointer rounded">
                          <div className="absolute right-0 top-0 bottom-0 bg-rose-500/15 z-0 transition-all group-hover:bg-rose-500/30" style={{width: `${Math.random()*70 + 30}%`}}></div>
                          <span className="text-rose-400 z-10 font-bold truncate">{emir.fiyat.toFixed(2)}</span><span className="text-gray-300 z-10 truncate">{emir.miktar}</span>
                        </div>
                      ))}
                    </div>
                    <div className="py-2 border-y border-gray-700 my-1.5 flex items-center justify-between px-2 bg-gray-800/50 rounded shadow-inner">
                       <span className={`text-sm md:text-base font-black tracking-widest truncate ${aktifCoinVerisi.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>${aktifCoinVerisi.fiyat.toFixed(2)}</span>
                       <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Kıyas</span>
                    </div>
                    <div className="flex-1 flex flex-col space-y-[1px] mt-1 overflow-hidden">
                      {emirDefteri.alis.map((emir, i) => (
                        <div key={`a-${i}`} onClick={() => islemYap(aktifKripto, 'sat', 1, emir.fiyat)} className="flex justify-between px-2 py-0.5 hover:bg-gray-800/80 relative group cursor-pointer rounded">
                          <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 z-0 transition-all group-hover:bg-emerald-500/30" style={{width: `${Math.random()*70 + 30}%`}}></div>
                          <span className="text-emerald-400 z-10 font-bold truncate">{emir.fiyat.toFixed(2)}</span><span className="text-gray-300 z-10 truncate">{emir.miktar}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* QUANT TERMINAL (CLI) */}
              <div className="bg-gray-950/90 border border-cyan-500/30 p-3 rounded-xl flex items-center space-x-2 md:space-x-3 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden shrink-0 w-full mt-2">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500"></div>
                <span className="text-cyan-500 font-black text-sm md:text-lg pl-2">{'>'}</span>
                <form onSubmit={komutCalistir} className="flex-1 flex w-full">
                  <input type="text" value={terminalKomutu} onChange={e => setTerminalKomutu(e.target.value)} placeholder="/al BTC 0.5 (Hızlı Komut)" className="w-full bg-transparent text-cyan-100 font-mono text-xs md:text-sm focus:outline-none placeholder-cyan-800/50 tracking-wide font-bold min-w-0" />
                  <button type="submit" className="hidden">Gönder</button>
                </form>
                <div className="text-[8px] md:text-[9px] text-cyan-600 font-black tracking-widest uppercase border border-cyan-800/50 px-2 py-1 rounded bg-cyan-950/50 shrink-0 hidden sm:block">Terminal Ready</div>
              </div>
            </>
          )}

          {aktifSekme === 'piyasalar' && (
            <div className="bg-gray-950/80 backdrop-blur-2xl rounded-2xl border border-gray-800/80 shadow-xl overflow-hidden flex flex-col w-full min-w-0">
              <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/50 shrink-0 flex-wrap gap-2">
                <h2 className="text-sm md:text-lg font-black text-white tracking-tight">Makro Piyasa Endeksleri <span className="text-[10px] md:text-xs font-bold text-gray-500 ml-1 md:ml-2 block sm:inline">(Tıklayıp Detaylara Git)</span></h2>
                <div className="flex items-center space-x-1.5 md:space-x-2 text-[9px] md:text-[10px] text-emerald-500 font-mono font-bold bg-emerald-500/10 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-emerald-500/20"><span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-ping"></span><span>WSS Sync Active</span></div>
              </div>
              <div className="overflow-x-auto w-full custom-scrollbar">
                <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-900/80 text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">
                      <th className="px-4 md:px-6 py-3 md:py-4">Parite / Varlık</th>
                      <th className="px-4 md:px-6 py-3 md:py-4">Son İşlem Fiyatı</th>
                      <th className="px-4 md:px-6 py-3 md:py-4">24s Değişim</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 hidden md:table-cell">24s Hacim</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-right">Aksiyonlar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {piyasalar.map((coin, index) => (
                      <tr key={index} onClick={() => { setAktifKripto(coin.sembol); setAktifSekme('genel'); }} className="hover:bg-gray-800/80 transition-colors group cursor-pointer">
                        <td className="px-4 md:px-6 py-4 md:py-5 flex items-center space-x-3 md:space-x-4">
                          <div className={`w-8 h-8 md:w-10 md:h-10 ${coin.renk} rounded-lg flex items-center justify-center font-black text-[10px] md:text-xs text-white shadow-inner shrink-0`}>{coin.sembol}</div>
                          <div>
                            <p className="font-bold text-white text-sm md:text-base tracking-wide group-hover:text-cyan-400 transition-colors">{coin.sembol}/USDT</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">{coin.ad}</p>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5">
                          <span className={`font-mono font-black text-lg md:text-xl transition-colors duration-300 ${coin.fiyat > coin.eskiFiyat ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : coin.fiyat < coin.eskiFiyat ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'text-gray-200'}`}>
                            ${coin.fiyat > 0 ? coin.fiyat.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4}) : '---'}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5">
                          <span className={`inline-block px-2 py-1 md:px-2.5 md:py-1 rounded-md text-[10px] md:text-xs font-bold tracking-widest border ${coin.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                            {coin.trend === 'up' ? '▲' : '▼'} {coin.degisim}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 hidden md:table-cell font-mono text-gray-400 font-bold text-sm md:text-base">${coin.hacim}</td>
                        <td className="px-4 md:px-6 py-4 md:py-5 text-right space-x-2">
                          <button onClick={(e) => { e.stopPropagation(); islemYap(coin.sembol, 'al', 1, coin.fiyat); }} className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-gray-950 border border-emerald-500/40 px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]">AL</button>
                          <button onClick={(e) => { e.stopPropagation(); islemYap(coin.sembol, 'sat', 1, coin.fiyat); }} className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/40 px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(244,63,94,0.5)]">SAT</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {aktifSekme === 'cuzdan' && (
            <div className="space-y-6 flex flex-col w-full min-w-0">
              <div className="bg-gray-950/80 backdrop-blur-3xl p-5 md:p-8 rounded-2xl md:rounded-3xl border border-gray-800/80 shadow-xl relative overflow-hidden flex flex-col xl:flex-row justify-between items-center gap-4 md:gap-6 shrink-0 w-full">
                <div className="absolute -left-10 top-0 w-48 h-48 md:w-64 md:h-64 bg-cyan-600/10 rounded-full blur-[60px] md:blur-[80px]"></div>
                <div className="z-10 text-center xl:text-left">
                  <p className="text-gray-500 text-[10px] md:text-xs font-black tracking-[0.2em] uppercase mb-1 md:mb-2">Ana Kasa Likiditesi (USDT)</p>
                  <p className="text-cyan-400 font-mono font-black text-3xl md:text-5xl lg:text-6xl tracking-tighter drop-shadow-md truncate">${Number(bakiye).toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto z-10">
                  <div className="relative w-full sm:w-48 md:w-56">
                    <span className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-gray-500 font-mono font-black text-sm md:text-lg">$</span>
                    <input type="number" value={islemMiktari} onChange={(e) => setIslemMiktari(e.target.value)} placeholder="0.00" className="w-full bg-gray-900 border border-gray-700 rounded-xl md:rounded-2xl pl-8 md:pl-10 pr-4 md:pr-6 py-3 md:py-4 text-white font-mono font-bold focus:outline-none focus:border-cyan-500/50 text-sm md:text-lg shadow-inner placeholder-gray-700" />
                  </div>
                  <button onClick={() => paraYatirCek('yatir')} className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black transition-all shadow-[0_0_15px_rgba(8,145,178,0.4)] hover:shadow-[0_0_25px_rgba(8,145,178,0.6)] text-xs md:text-sm uppercase tracking-widest shrink-0">Fon Ekle</button>
                  <button onClick={() => paraYatirCek('cek')} className="bg-transparent border-2 border-gray-700 hover:border-gray-500 hover:bg-gray-800 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black transition-all text-xs md:text-sm uppercase tracking-widest shrink-0">Tahsil Et</button>
                </div>
              </div>

              <div className="bg-gray-950/80 backdrop-blur-3xl rounded-2xl md:rounded-3xl border border-gray-800/80 overflow-hidden shadow-xl flex-1 flex flex-col w-full min-w-0">
                <div className="px-6 md:px-8 py-4 md:py-6 border-b border-gray-800/50 bg-gray-900/50 shrink-0">
                  <h2 className="text-lg md:text-xl font-black text-white tracking-tight">Portföy Kârlılık ve Varlık Analizi (ROE / PnL)</h2>
                </div>
                <div className="overflow-x-auto w-full custom-scrollbar">
                  <table className="w-full text-left whitespace-nowrap min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-900/80 text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">
                        <th className="px-6 md:px-8 py-4 md:py-5">Varlık Sembolü</th>
                        <th className="px-6 md:px-8 py-4 md:py-5">Net Pozisyon (Adet)</th>
                        <th className="px-6 md:px-8 py-4 md:py-5">Ortalama Maliyet</th>
                        <th className="px-6 md:px-8 py-4 md:py-5">Cari (Anlık) Değer</th>
                        <th className="px-6 md:px-8 py-4 md:py-5 text-right">Aksiyon & PnL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {portfoyAnalizi.length > 0 ? portfoyAnalizi.map((v, idx) => (
                        <tr key={idx} onClick={() => { setAktifKripto(v.coin); setAktifSekme('genel'); }} className="hover:bg-gray-800/80 transition-colors cursor-pointer group">
                          <td className="px-6 md:px-8 py-4 md:py-5 font-black text-base md:text-lg text-white tracking-widest flex items-center space-x-3">
                             <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center border border-gray-700 text-xs font-bold group-hover:border-cyan-500 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.3)] transition-all shrink-0">{v.coin}</div>
                             <span className="group-hover:text-cyan-400 transition-colors">{v.coin}</span>
                          </td>
                          <td className="px-6 md:px-8 py-4 md:py-5 font-mono font-black text-sm md:text-base text-gray-300">{Number(v.toplam_miktar).toLocaleString('en-US')}</td>
                          <td className="px-6 md:px-8 py-4 md:py-5 font-mono text-gray-400 font-bold text-xs md:text-sm">${v.ortalamaMaliyet.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          <td className="px-6 md:px-8 py-4 md:py-5 font-mono font-black text-white text-base md:text-lg drop-shadow-md">${v.guncelDeger.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          <td className="px-6 md:px-8 py-4 md:py-5 text-right flex justify-end items-center space-x-4">
                            <div className="flex flex-col items-end">
                              <span className={`font-mono font-black text-base md:text-lg drop-shadow-md ${v.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {v.pnl >= 0 ? '+' : '-'}${Math.abs(v.pnl).toLocaleString('en-US', {minimumFractionDigits: 2})}
                              </span>
                              <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-md mt-1 border tracking-widest ${v.pnlYuzde >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                                ROE {v.pnlYuzde > 0 ? '+' : ''}{v.pnlYuzde.toFixed(2)}%
                              </span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); islemYap(v.coin, 'sat', v.toplam_miktar, v.anlikFiyat); }} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.4)] hidden lg:group-hover:block border border-rose-500 ml-4 shrink-0">HEPSİNİ SAT</button>
                          </td>
                        </tr>
                      )) : <tr><td colSpan="5" className="text-center py-16 text-gray-600 font-black uppercase tracking-[0.3em] text-xs">Aktif Pozisyon Bulunmuyor</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {aktifSekme === 'gecmis' && (
            <div className="bg-gray-950/80 backdrop-blur-3xl rounded-2xl md:rounded-3xl border border-gray-800/80 overflow-hidden shadow-xl flex-1 flex flex-col w-full min-w-0">
              <div className="px-6 md:px-8 py-4 md:py-5 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/50 shrink-0 flex-wrap gap-2 md:gap-3">
                 <h2 className="text-lg md:text-xl font-black text-white tracking-tight">Blockchain Ledger Dökümü</h2>
                 <button onClick={veritabaniniGetir} className="text-[9px] md:text-[10px] text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-gray-900 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg transition-all font-black uppercase tracking-widest shadow-[0_0_8px_rgba(6,182,212,0.2)]">Ağı Senkronize Et</button>
              </div>
              <div className="overflow-x-auto w-full custom-scrollbar">
                <table className="w-full text-left whitespace-nowrap min-w-[650px]">
                  <thead>
                    <tr className="bg-gray-900/80 text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">
                      <th className="px-6 md:px-8 py-4 md:py-5">Zaman Damgası (UTC+3)</th>
                      <th className="px-6 md:px-8 py-4 md:py-5">İşlem Tipi</th>
                      <th className="px-6 md:px-8 py-4 md:py-5">Parite</th>
                      <th className="px-6 md:px-8 py-4 md:py-5">İşlem Hacmi (Adet)</th>
                      <th className="px-6 md:px-8 py-4 md:py-5">Gerçekleşme Fiyatı</th>
                      <th className="px-6 md:px-8 py-4 md:py-5 text-right">Brüt Tutar (USDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {gecmisIslemler.length > 0 ? gecmisIslemler.map((islem, idx) => (
                      <tr key={idx} className="hover:bg-gray-900/60 transition-colors">
                        <td className="px-6 md:px-8 py-4 md:py-5 text-xs font-mono font-bold text-gray-400">{new Date(islem.tarih).toLocaleString('tr-TR')}</td>
                        <td className="px-6 md:px-8 py-4 md:py-5 font-black">
                          <span className={`inline-block px-2.5 md:px-3 py-1 rounded-lg text-[9px] uppercase tracking-[0.2em] border ${islem.islem_tipi === 'al' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                            {islem.islem_tipi === 'al' ? 'Piyasa Alış' : 'Piyasa Satış'}
                          </span>
                        </td>
                        <td className="px-6 md:px-8 py-4 md:py-5 font-black text-white text-sm md:text-base tracking-wide">{islem.coin}/USDT</td>
                        <td className="px-6 md:px-8 py-4 md:py-5 font-mono font-bold text-gray-300 text-xs md:text-sm">{Number(islem.miktar).toFixed(4)}</td>
                        <td className="px-6 md:px-8 py-4 md:py-5 font-mono font-bold text-gray-400 text-xs md:text-sm">${Number(islem.fiyat).toLocaleString('en-US')}</td>
                        <td className="px-6 md:px-8 py-4 md:py-5 text-right font-mono font-black text-white text-sm md:text-base drop-shadow-md">${(islem.miktar * islem.fiyat).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      </tr>
                    )) : <tr><td colSpan="6" className="text-center py-16 text-gray-600 font-black uppercase text-xs tracking-[0.3em]">Kayıtlı İşlem Bulunamadı</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {aktifSekme === 'ayarlar' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0 w-full min-w-0">
              <div className="bg-gray-950/80 backdrop-blur-3xl p-6 md:p-8 rounded-2xl md:rounded-3xl border border-gray-800/80 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-600/10 rounded-full blur-[60px]"></div>
                <h2 className="text-lg md:text-xl font-black mb-4 md:mb-6 text-white tracking-tight relative z-10">Profil Yönetimi</h2>
                <form onSubmit={isimGuncelle} className="space-y-4 md:space-y-5 relative z-10">
                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2">Sistem Görünen Adı</label>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <input type="text" value={isimInput} onChange={(e) => setIsimInput(e.target.value)} placeholder="Yeni kimliğinizi belirleyin..." className="w-full bg-gray-900 border border-gray-700/80 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-3.5 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder-gray-700 font-bold" />
                      <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 md:py-0 rounded-xl md:rounded-2xl font-black transition-all text-[10px] uppercase tracking-widest shadow-md shrink-0">Değiştir</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2">Bağlı Hesap Türü</label>
                    <input type="text" value="Kurumsal Root Yönetici" disabled className="w-full bg-gray-900/50 border border-gray-800 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-3.5 text-gray-500 font-bold text-xs cursor-not-allowed" />
                  </div>
                </form>
              </div>

              <div className="bg-gray-950/80 backdrop-blur-3xl p-6 md:p-8 rounded-2xl md:rounded-3xl border border-gray-800/80 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-rose-600/10 rounded-full blur-[60px]"></div>
                <h2 className="text-lg md:text-xl font-black mb-4 md:mb-6 text-white tracking-tight relative z-10">Güvenlik ve İzinler</h2>
                <div className="space-y-4 md:space-y-5 relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-900/80 p-4 rounded-xl md:rounded-2xl border border-gray-800 shadow-inner gap-3">
                    <div>
                      <p className="text-sm font-black text-white">İki Faktörlü Doğrulama (2FA)</p>
                      <p className="text-[10px] text-gray-500 font-bold mt-0.5">Google Authenticator entegrasyonu</p>
                    </div>
                    <button onClick={() => bildirimGoster('2FA Kurulumu için cihazınıza kod gönderildi.', 'basari')} className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all w-full sm:w-auto shrink-0">Kur</button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-900/80 p-4 rounded-xl md:rounded-2xl border border-gray-800 shadow-inner gap-3">
                    <div>
                      <p className="text-sm font-black text-white">Tüm Oturumları Sonlandır</p>
                      <p className="text-[10px] text-gray-500 font-bold mt-0.5">Diğer ağlardaki bağlantıları kes</p>
                    </div>
                    <button onClick={() => { bildirimGoster('Diğer cihazlardaki ağ bağlantıları kesildi.', 'basari'); cikisYap(); }} className="bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all w-full sm:w-auto shrink-0">Kes</button>
                  </div>
                </div>
              </div>
             </div>
          )}
          
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
