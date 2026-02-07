# Adım 1: Teknik İndikatörler (Akıl Hocası Talimatı)

Bu, **sıradaki tek adım**. Bilgisayarın güçlü değil; sadece **ücretsiz** ve **hafif** kaynak kullanıyoruz (Python + pandas, TA-Lib yok).

---

## Ne yapıldı (kod tarafı)

- **Yeni servis:** `backend/app/services/indicators/`
  - `calculator.py`: RSI(14), MACD(12,26,9), SMA(20), EMA(20) — sadece pandas/numpy.
- **Yeni API:** `GET /api/v1/markets/indicators?exchange=binance&symbol=BTC/USDT&timeframe=1h&limit=100`
  - Döner: `candles` (OHLCV) + `indicators` (rsi, macd, macd_signal, macd_histogram, sma, ema).

Ek kütüphane yok; mevcut `pandas`/`numpy` yeterli.

---

## Senin yapacakların (CodeSpaces’te)

1. **Kodu çek**
   - Repo güncel değilse: CodeSpaces terminalde  
     `cd /workspaces/zenithai && git pull`

2. **Backend’i yeniden başlat**
   - Çalışan container’lar varsa:  
     `docker compose down`  
     `docker compose up -d --build`
   - Sadece backend’i yeniden başlatmak istersen:  
     `docker compose up -d --build backend`

3. **Endpoint’i test et**
   - Tarayıcıda veya Postman’de:
   - CodeSpaces’te port 8000’i “Public” yap (PORTS sekmesi).
   - URL (kendi port host’unu yaz):  
     `https://xxx-8000.app.github.dev/api/v1/markets/indicators?exchange=binance&symbol=BTC/USDT&timeframe=1h&limit=50`
   - Beklenen: JSON içinde `candles` ve `indicators` (rsi, macd, sma, ema listeleri).

4. **İndikatörleri uygulama içinde nerede görürsün?**
   - **Piyasalar** → bir sembole tıkla (örn. BTC/USDT) → grafiğin hemen **altında**, MA(7)/MA(20) satırının yanında **İndikatörler:** RSI, MACD, SMA(20), EMA(20) son değerleri yazar.
   - Ham veri için tarayıcıda: `https://8000-.../api/v1/markets/indicators?exchange=binance&symbol=BTC/USDT&timeframe=1h&limit=50`

5. **Sonucu yaz**
   - “Çalıştı” veya “Şu hata var: …” diye yaz. Bir sonraki adımı ona göre söyleyeceğim.

---

## Neden bu adım?

- Strateji ve backtest için **temel**: RSI/MACD/MA olmadan sinyal ve pattern zor.
- **Hafif**: Ekstra API yok, TA-Lib yok; zayıf PC’de de rahat çalışır.
- **Ücretsiz**: Veri yine ccxt (Binance) ücretsiz; ek maliyet yok.

Unutma: Sıradaki adım = CodeSpaces’te pull → build → bu URL’i aç → çalışıyor mu yaz.
