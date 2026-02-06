# Zenithai

Kripto, forex, altın ve BIST için canlı grafik, otomatik işlem (botlar) ve makine öğrenmesi destekli analiz platformu. Modüler ve birbirine gevşek bağlı mimari.

## Mimari (özet)

- **Frontend**: Next.js 14 (App Router), React, Lightweight Charts, Tailwind
- **Backend**: FastAPI, modüler API (health, auth, markets, strategies, orders, backtest, ml), servis katmanı (market_data, strategy_engine, execution, backtest, ml)
- **Veritabanı**: PostgreSQL (async SQLAlchemy) – User, Strategy, Order, Position, RiskLimit, BacktestRun, MLModel
- **Çalıştırma**: Docker Compose (frontend, backend, db)

## Hızlı başlangıç (Docker)

```bash
cd zenithai
cp .env.example .env
# .env içinde SECRET_KEY vb. isteğe göre düzenleyin

docker compose up -d
```

- **Panel**: http://localhost:3000  
- **API doküman**: http://localhost:8000/docs  
- **Backend health**: http://localhost:8000/api/v1/health  

Frontend, `/api/backend/*` isteklerini otomatik olarak backend:8000'e yönlendirir.

### GitHub Codespaces

Codespaces’te frontend (port 3000) ve backend (port 8000) ayrı URL’lerde açılır. Tarayıcıda `xxx-3000.app.github.dev` kullanıldığında API istekleri otomatik olarak `xxx-8000.app.github.dev` adresine gider; proxy kullanılmaz. Detaylı adımlar için **CODESPACES.md** dosyasına bakın.

## Geliştirme (yerel)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
# PostgreSQL çalışıyor olmalı (veya sadece Docker ile db: docker compose up -d db)
set DATABASE_URL=postgresql+asyncpg://zenithai:zenithai@localhost:5432/zenithai
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
# Backend localhost:8000'de çalışıyorsa:
set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Tarayıcıda http://localhost:3000 → Piyasalar → bir sembol seçerek canlı grafik (Binance OHLCV) test edebilirsiniz.

### Veritabanı migration (Alembic)

```bash
cd backend
# Sync URL gerekir (psycopg2). .env'de DATABASE_URL=postgresql+asyncpg://... varsa env.py otomatik postgresql:// yapar.
alembic upgrade head
# Yeni model eklediysen: alembic revision --autogenerate -m "açıklama"
```

### WebSocket (canlı veri)

- **Ticker:** `ws://.../api/v1/ws/ticker?symbol=BTC/USDT&exchange=binance&interval_sec=2` — her N saniyede fiyat/hacim.
- **OHLCV (grafik):** `ws://.../api/v1/ws/ohlcv?symbol=BTC/USDT&timeframe=1h&limit=100&interval_sec=30` — mum verisi akışı.

Sembol sayfasında fiyat, WebSocket ile otomatik güncellenir. Bağlantı koparsa 5 saniyede yeniden bağlanır. Giriş yapılmışsa hızlı kağıt emir (Al/Sat) butonları gösterilir.

### Strateji scheduler

Backend açıkken her **60 saniyede** bir aktif stratejiler (`is_active=True`) çalıştırılır:
- **ml_model_id** doluysa: OHLCV’den özellikler üretilir, ML model ile tahmin alınır (1=al, 0=sat), paper emir gönderilir.
- Dolu değilse: MA cross (veya diğer indikatör) sinyali kullanılır.
`mode=paper` ise paper emir açılır (sembol başına 0.001 birim).

## Proje yapısı

```
zenithai/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI uygulaması
│   │   ├── config.py        # Ayarlar (env)
│   │   ├── api/v1/          # health, auth, markets, strategies, orders, backtest, ml, risk, ws
│   │   ├── core/            # database, security, deps (current_user)
│   │   ├── scheduler.py     # periyodik strateji tick → paper emir
│   │   └── services/        # market_data, strategy_engine (+ signals), execution, risk, backtest, ml
│   ├── alembic/             # migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/app/             # Sayfalar: /, /dashboard, /markets, /strategies, /strategies/[id], /emirler, /backtest, /ml, /risk
│   ├── src/components/     # AppHeader, Chart, Providers
│   ├── src/contexts/       # ToastContext (global bildirim)
│   ├── src/hooks/          # useRequireAuth (korumalı sayfalar)
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## API uç noktaları (v1)

**Auth:** Önce `POST /api/v1/auth/register` veya `POST /api/v1/auth/login` ile token alın; strateji, emir, backtest ve ML uç noktaları `Authorization: Bearer <token>` gerektirir. Frontend `fetchAuth` 401 dönerse otomatik çıkış yapar ve `/giris` sayfasına yönlendirir.

| Uç nokta | Açıklama | Auth |
|----------|----------|------|
| `GET /api/v1/health` | Sağlık kontrolü | Hayır |
| `POST /api/v1/auth/register` | Kayıt | Hayır |
| `POST /api/v1/auth/login` | Giriş | Hayır |
| `GET /api/v1/markets/symbols` | Borsa sembolleri | Hayır |
| `GET /api/v1/markets/ohlcv` | Mum verisi | Hayır |
| `GET /api/v1/markets/ticker` | Anlık fiyat | Hayır |
| `GET /api/v1/strategies` | Strateji listesi | Evet |
| `GET /api/v1/strategies/{id}` | Strateji detayı | Evet |
| `POST /api/v1/strategies` | Strateji oluştur | Evet |
| `POST /api/v1/strategies/{id}/start` | Strateji başlat | Evet |
| `POST /api/v1/strategies/{id}/stop` | Strateji durdur | Evet |
| `PATCH /api/v1/strategies/{id}` | Strateji güncelle (ml_model_id bağla) | Evet |
| `DELETE /api/v1/strategies/{id}` | Strateji sil | Evet |
| `POST /api/v1/orders/paper` | Kağıt emir (pozisyon açar/kapatır, realized_pnl) | Evet |
| `GET /api/v1/orders/paper` | Emir listesi (strategy_id, limit, offset; realized_pnl dahil) | Evet |
| `GET /api/v1/orders/positions` | Açık pozisyonlar | Evet |
| `POST /api/v1/backtest/run` | Backtest çalıştır | Evet |
| `GET /api/v1/backtest/runs` | Backtest geçmişi (strategy_id, limit, offset) | Evet |
| `GET /api/v1/ml/models` | ML modelleri listesi | Evet |
| `POST /api/v1/ml/train` | OHLCV ile model eğit (sklearn, joblib) | Evet |
| `POST /api/v1/ml/models` | Model kaydı (manuel) | Evet |
| `POST /api/v1/ml/models/{id}/activate` | Modeli aktif yap | Evet |
| `POST /api/v1/ml/predict` | Sinyal tahmini (özellikler: getiri_1..ma_5_20_oran, hacim_degisim) | Evet |
| `GET /api/v1/risk` | Risk limitlerini listele | Evet |
| `POST /api/v1/risk` | Risk limiti ekle (maks. pozisyon, günlük zarar) | Evet |
| `PATCH /api/v1/risk/{id}` | Risk limiti güncelle | Evet |
| `DELETE /api/v1/risk/{id}` | Risk limiti sil | Evet |
| WebSocket `/api/v1/ws/ticker` | Canlı ticker | Hayır |
| WebSocket `/api/v1/ws/ohlcv` | Canlı OHLCV mum (grafik güncellemesi) | Hayır |

Tüm API hata ve bilgi mesajları Türkçe döner (`mesaj`, `hata`, `durum` vb.).

## Özellikler (özet)

- **Manuel kağıt emir:** Emirler sayfasında sembol, yön, miktar, limit fiyat, borsa, strateji seçerek emir gönderin
- **Hızlı emir:** Piyasa grafik sayfasında (giriş yapılmışsa) miktar + Al/Sat ile anında kağıt emir
- **Pagination:** Emir ve backtest listelerinde "Daha fazla yükle"
- **Toast bildirimi:** Emir başarı/hata mesajları sağ altta otomatik gösterilir
- **WebSocket yeniden bağlanma:** Ticker/OHLCV bağlantısı kopunca 5 sn'de yeniden deneme
- **Strateji parametreleri:** Strateji detayında MA Cross (short/long period), RSI (periyot, oversold, overbought) düzenlenebilir
- **CSV export:** Emirler ve backtest geçmişi CSV olarak indirilebilir

## Sonraki adımlar

- ML: gerçek eğitim pipeline ve artifact yükleme
- BIST/Forex veri sağlayıcı entegrasyonu
- Canlı borsa API (API key ile gerçek işlem)
- Strateji/scheduler’da ML model ile otomatik sinyal (predict + emir)

---

**Zenithai** – Modüler, yönetilebilir altyapı ile ilerleyen adımlar senin onayına göre eklenecek.
