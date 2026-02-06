# Zenithai – GitHub Codespaces ile Çalıştırma

Adım adım rehber.

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

### 3.4 Docker Compose ile başlat
```bash
docker compose up --build
```

İlk build 2–5 dakika sürebilir.

---

## 4. Uygulamaya erişim

Build bitince:

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
| Docker hatası | Terminal'de `docker --version` çalışıyorsa Docker yüklü demektir |
| .env yok | `cp .env.example .env` çalıştır, ardından düzenle |
| Build uzun sürüyor | İlk build normalde 3–5 dakika sürebilir |

---

## Codespace kapatma

- Sol alttan **Codespaces** → **Stop Current Codespace**
- Tekrar açtığında: repoya git → **Code** → **Codespaces** → mevcut codespace’i aç
- Sonra tekrar: `docker compose up --build`
