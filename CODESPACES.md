# Zenithai – GitHub Codespaces ile Çalıştırma

Adım adım rehber.

---

## Build almak ve linkler 404 veriyorsa

**Önce (yerelde – Cursor/Bilgisayar):** Değişiklikleri GitHub’a gönder:
```bash
git add .
git commit -m "Indicators: RSI, MACD, SMA, EMA + fallback"
git push
```

**CodeSpaces terminalde (sırayla):**

```bash
cd /workspaces/zenithai
git pull
docker compose down
docker compose build --no-cache frontend
docker compose build --no-cache backend
docker compose up -d
docker compose exec backend alembic upgrade head
```
(`--no-cache` = cache kullanma, indikatörlü yeni kodu kesin al.)

Build bittikten sonra:

1. Alt tarafta **PORTS** sekmesini aç.
2. **3000** ve **8000** satırlarında görünen **adresi** kopyala (örn. `https://xxx-3000...github.dev`). Bazen `3000-humble-funicular-...` değil, farklı bir isim çıkar — **o an gördüğün URL doğru olandır.**
3. Port 3000 ve 8000’e **sağ tık → Port Visibility → Public** yap.
4. **Frontend:** PORTS’taki 3000 satırındaki linke tıkla (veya globe ikonu).
5. **Backend / API:** PORTS’taki 8000 satırındaki linke tıkla, sonuna `/docs` ekle (Swagger). İndikatörler: aynı 8000 linkinin sonuna `/api/v1/markets/indicators?exchange=binance&symbol=BTC/USDT&timeframe=1h&limit=50` ekle.

**404 alıyorsan:** Tarayıcıda kullandığın adres, PORTS sekmesinde 3000/8000 için yazan adresle **birebir aynı** olmalı. Farklı bir sekmede veya farklı cihazda açıyorsan, yine PORTS’ta görünen linki kullan.

---

## Bu CodeSpace’in adresleri (örnek)

CodeSpace host örneği: **humble-funicular-5xr4x65xxv63v99.github.dev**

| Ne | Örnek URL (PORTS’ta gördüğünü kullan) |
|----|--------------------------------------|
| Frontend | `https://...-3000....github.dev/` |
| Backend Swagger | `https://...-8000....github.dev/docs` |
| İndikatörler API | `https://...-8000....github.dev/api/v1/markets/indicators?exchange=binance&symbol=BTC/USDT&timeframe=1h&limit=50` |

---

## 1. Projeyi GitHub'a yükle

### 1.1 Git (yüklü değilse)
- Git indir: https://git-scm.com/download/win
- Kurulumu tamamla

### 1.2 GitHub hesabı
- Yoksa: https://github.com/signup
- Giriş yap

### 1.3 Repo oluştur
1. https://github.com/new adresine git
2. **Repository name:** `zenithai`
3. Public seç, README ekleme (proje zaten var)
4. **Create repository**

### 1.4 Projeyi push et

PowerShell'de (proje klasöründe):

```powershell
cd C:\Users\nihat\zenithai

# Git yoksa başlat
git init

# Tüm dosyaları ekle (.env zaten .gitignore'da)
git add .
git commit -m "Initial Zenithai project"

# GitHub repo URL'ini kendi kullanıcı adınla değiştir
git remote add origin https://github.com/KULLANICI_ADIN/zenithai.git
git branch -M main
git push -u origin main
```

`KULLANICI_ADIN` yerine kendi GitHub kullanıcı adını yaz.

---

## 2. Codespace oluştur

1. GitHub'da `zenithai` reposunu aç
2. Yeşil **Code** butonuna tıkla
3. **Codespaces** sekmesini seç
4. **Create codespace on main** tıkla

Codespace açılması 1–2 dakika sürebilir.

---

## 3. Codespace içinde uygulamayı çalıştır

### 3.1 Terminal aç
- Menü: **Terminal → New Terminal** veya `` Ctrl+` ``

### 3.2 .env dosyasını oluştur
```bash
cp .env.example .env
```

### 3.3 API anahtarını ekle
```bash
# Nano editör ile aç
nano .env
```
`.env` içinde şu satırı bul, yorum işaretini kaldır ve **kendi Twelve Data API anahtarınızı** yazın (https://twelvedata.com üzerinden ücretsiz alabilirsiniz):
```
TWELVE_DATA_API_KEY=buraya-kendi-anahtarinizi-yazin
```
Kaydet: `Ctrl+O`, Enter, çık: `Ctrl+X`

### 3.4 Proje köküne geç
```bash
cd /workspaces/zenithai
```
(Repo adı farklıysa: `cd ~ && ls` ile klasör adına bak, sonra `cd /workspaces/BURAYA_REPO_ADI`)

### 3.5 Docker Compose ile başlat
```bash
docker compose up -d --build
```

İlk build 2–5 dakika sürebilir.

### 3.6 İlk seferde: veritabanı migration
```bash
docker compose exec backend alembic upgrade head
```

Servisleri kontrol: `docker compose ps` — db, backend, frontend “Up” olmalı.

---

## 4. Uygulamaya erişim

Build ve migration bitince:

1. Alt kısımdaki **PORTS** sekmesine bak
2. Port 3000 (Frontend) ve 8000 (Backend) listelenecek
3. **Port 3000** satırındaki 🌐 (globe) ikonuna tıkla
4. Tarayıcıda Zenithai açılacak

Alternatif:
- Port 3000 satırına sağ tık → **Open in Browser**

---

## 5. Test

1. **Kayıt** ile hesap oluştur
2. **Giriş** yap
3. **Piyasalar** → Forex/Altın seç → sembol listesini kontrol et
4. **Emirler** → Manuel emir gönder → pozisyon açılmasını kontrol et

---

## Sorun giderme

| Sorun | Çözüm |
|-------|-------|
| Port görünmüyor | PORTS panelinde "Forward a Port" ile 3000 ve 8000 ekle |
| Kayıt/Giriş: Bağlantı hatası | Tarayıcıda `xxx-8000.app.github.dev/docs` açılıyor mu kontrol et. Port 8000 **Public** yapın (PORTS'ta sağ tık). Sayfayı sert yenileyin (Ctrl+Shift+R). Hata mesajında yazan API URL'sini kontrol edin. |
| Docker hatası | Terminal'de `docker --version` çalışıyorsa Docker yüklü demektir |
| .env yok | `cp .env.example .env` çalıştır, ardından düzenle |
| Build uzun sürüyor | İlk build normalde 3–5 dakika sürebilir |

---

## Codespace kapatma

- Sol alttan **Codespaces** → **Stop Current Codespace**
- Tekrar açtığında: repoya git → **Code** → **Codespaces** → mevcut codespace’i aç
- Sonra tekrar: `cd /workspaces/zenithai && docker compose up -d --build`
