# Piyasalar: Binance Benzeri Tasarım ve Açık Kaynak Planı

Bu dokümanda mevcut yapı, hedef (Binance tarzı ekran), açık kaynak bileşenler, bağlantı şeması ve adım adım uygulama planı özetleniyor.

---

## 1. Mevcut Durum (Şema)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js 14, React, Tailwind)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  /markets (Piyasalar)          /markets/[symbol] (Sembol sayfası)             │
│  ├─ Borsa seçici (Binance/Forex)  ├─ Başlık + fiyat + %24s                   │
│  ├─ Sembol listesi (grid, 50)     ├─ Hızlı emir: miktar + Al/Sat (paper)      │
│  └─ Link → /markets/BTC-USDT     └─ Chart (lightweight-charts, mum)           │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                    │
         │ REST: /api/v1/markets/symbols       │ REST: ohlcv, ticker
         │                                      │ WS: /ws/ticker, /ws/ohlcv
         ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI)                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  GET /markets/symbols   GET /markets/ohlcv   GET /markets/ticker              │
│  WS  /ws/ticker         WS  /ws/ohlcv                                         │
│  → market_data service (ccxt Binance / Twelve Data)                           │
│  → ticker: last, bid, ask, volume, change_24h                                 │
│  → order book YOK (sadece ticker’da bid/ask tek fiyat)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Eksikler (referans ekrana göre):**
- Order book (alış/satış derinliği) yok
- Grafikte hacim (volume) ve MA gibi indikatörler yok
- Piyasalar listesinde arama, quote filtre (USDT/TRY), 24s değişim, favori yok
- Son işlemler (market trades) yok
- Limit emir formu (fiyat + miktar + toplam) yok; sadece hızlı Al/Sat var

---

## 2. Hedef Görünüm (Binance Referansı)

| Bölüm | Açıklama | Açık kaynak / teknik |
|-------|----------|----------------------|
| **Sol: Order book** | Bid/ask fiyat, miktar, toplam; derinlik çubuğu | Backend: order book API + React order book component |
| **Orta: Grafik** | Mum + hacim + MA/indikatör; zaman dilimi | lightweight-charts (mevcut) + volume + indicator örnekleri |
| **Orta alt: Emir paneli** | Limit/Market, fiyat/miktar/toplam, Al/Sat | Mevcut paper order API; UI form genişletmesi |
| **Sağ: Piyasa listesi** | Sembol, son fiyat, %24s; arama, USDT/TRY filtresi | Frontend state + mevcut symbols API |
| **Sağ: Son işlemler** | Fiyat, miktar, saat | Backend: trades endpoint (ccxt fetch_trades) |

---

## 3. Açık Kaynak Kaynakları ve Bağlantılar

| Kaynak | Amaç | Lisans | Bağlantı / not |
|--------|------|--------|----------------|
| **TradingView Lightweight Charts** | Mum, hacim, indikatör | Apache-2.0 | https://github.com/tradingview/lightweight-charts — zaten kullanılıyor |
| **Lightweight Charts – Volume** | Fiyat + hacim aynı grafikte | Resmi doküman | https://tradingview.github.io/lightweight-charts/tutorials/how_to/price-and-volume |
| **Lightweight Charts – Indicators** | MA vb. | Resmi örnek | https://tradingview.github.io/lightweight-charts/tutorials/analysis-indicators — SMA örnek kodu projeye kopyalanabilir |
| **react-order-book (lab49)** | Order book grid + stil | MIT | https://github.com/lab49/react-order-book — alış/satış kolonları, özelleştirilebilir |
| **CCXT** | Borsa verisi (order book, trades) | MIT | Zaten kullanılıyor; `fetch_order_book`, `fetch_trades` eklenebilir |

**Veri akışı (hedef):**
- Order book: Backend `GET /markets/orderbook?exchange=binance&symbol=BTC/USDT` → frontend order book component.
- Son işlemler: Backend `GET /markets/trades?exchange=...&symbol=...&limit=50` → frontend “Son işlemler” tablosu.
- Grafik: Mevcut OHLCV + WebSocket; Chart bileşenine volume serisi + MA (SMA) eklenir.

---

## 4. Bağlantı / Veri Akış Şeması (Hedef)

```
                    Tarayıcı
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    ▼                   ▼                   ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Order Book  │   │   Grafik    │   │ Piyasa listesi│
│ (bid/ask)   │   │ Mum+Hacim+MA│   │ Arama, USDT  │
└──────┬──────┘   └──────┬──────┘   └──────┬───────┘
       │                 │                 │
       │ GET /orderbook  │ GET+WS ohlcv    │ GET /symbols
       │ (yeni)          │ + ticker        │ (mevcut)
       ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────┐
│              Backend API (FastAPI)                     │
│  /markets/symbols  /markets/ohlcv  /markets/ticker   │
│  /markets/orderbook (yeni)  /markets/trades (yeni)   │
│  /ws/ticker  /ws/ohlcv  (ops: /ws/orderbook)         │
└──────────────────────────┬───────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────┐
│  market_data service (ccxt / Twelve Data)             │
│  get_symbols  get_ohlcv  get_ticker                   │
│  get_order_book (yeni)  get_trades (yeni)            │
└──────────────────────────────────────────────────────┘
```

---

## 5. Ayarlar ve Konfigürasyon

- **Borsa:** `exchange=binance` (veya twelvedata) — mevcut; UI’da dropdown kalabilir.
- **Sembol formatı:** Backend ccxt ile `BTC/USDT`; URL’de `encodeURIComponent` kullanımı mevcut, aynen devam.
- **Grafik:** Zaman dilimi (1m, 5m, 15m, 1h, 4h, 1d) — backend `timeframe` parametresi destekleniyor; frontend’e timeframe seçici eklenir.
- **Order book derinliği:** Örn. 20 seviye; backend `limit=20` ile ccxt `fetch_order_book(symbol, limit)`.
- **Tema:** Koyu tema (zinc-950, zinc-800) mevcut; order book ve tablolarda aynı palet kullanılır.

---

## 6. Uygulama Adımları (Öncelik Sırasıyla)

### Aşama 1 – Grafik iyileştirme (hacim + MA)
- `frontend/src/components/Chart.tsx`: lightweight-charts ile hacim histogramı ekle (price-and-volume dokümanı).
- İsteğe bağlı: SMA(7), SMA(25) için lightweight-charts indicator örneğini projeye al.
- `markets/[symbol]/page.tsx`: timeframe seçici (1h, 4h, 1d) ekle; API’ye `timeframe` parametresini geçir.

### Aşama 2 – Order book
- Backend: `market_data` servisine `get_order_book(exchange, symbol, limit=20)` ekle (ccxt `fetch_order_book`).
- Backend: `GET /api/v1/markets/orderbook?exchange=...&symbol=...&limit=20` endpoint’i ekle.
- Frontend: react-order-book (veya basit bir tablo) ile sol panele order book koy; veriyi `/markets/orderbook` ile doldur. İsteğe bağlı: WebSocket ile periyodik güncelleme.

### Aşama 3 – Piyasalar listesi (arama + filtre)
- Piyasalar sayfasında arama kutusu (sembol adına göre filtre).
- Quote filtre: USDT, TRY, BNB vb. — `symbols` listesini frontend’de `.filter(s => s.endsWith('/USDT'))` benzeri ile filtrele; gerekirse backend’e `quote=USDT` parametresi eklenebilir.
- Her sembol için 24s değişim göstermek: Sembol listesi uzunsa önce 50–100 sembol için ticker çekip (batch veya tek tek) listeyi zenginleştir; veya backend’e “ticker list” endpoint’i eklenebilir.

### Aşama 4 – Son işlemler (market trades)
- Backend: `get_trades(exchange, symbol, limit=50)` (ccxt `fetch_trades`); `GET /api/v1/markets/trades` ekle.
- Sembol sayfasında “Son işlemler” tablosu (fiyat, miktar, saat); isteğe bağlı WebSocket ile canlı güncelleme.

### Aşama 5 – Emir paneli (limit / market)
- Mevcut “hızlı emir” (Al/Sat + miktar) kalır; yanına Limit/Market seçici ekle.
- Limit: fiyat + miktar (veya toplam) alanları; gönderim `POST /api/v1/orders/paper` ile (mevcut API’ye `price` zaten gidiyor).
- UI: Binance’e benzer tek satır form (Fiyat, Miktar, Toplam, Al/Sat butonları).

---

## 7. Özet Tablo

| Bileşen | Mevcut | Hedef | Açık kaynak / not |
|---------|--------|--------|--------------------|
| Sembol listesi | Grid, 50 sembol | Arama, quote filtre, 24s% | Mevcut API; frontend filtre |
| Grafik | Mum | Mum + hacim + MA | lightweight-charts (volume + indicators) |
| Order book | Yok | Bid/ask derinlik | ccxt + react-order-book veya basit tablo |
| Son işlemler | Yok | Tablo | ccxt fetch_trades + endpoint |
| Emir | Hızlı Al/Sat | Limit + Market form | Mevcut paper API genişletmesi |

Bu plan, referans ekrandaki “bağlantılar, şema, görünüm, ayarlar”ı tek dokümanda toplar. İlk uygulama için Aşama 1 (grafik) veya Aşama 2 (order book) ile başlamak mantıklıdır.
