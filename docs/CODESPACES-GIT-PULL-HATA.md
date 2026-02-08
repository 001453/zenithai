# CodeSpaces: "Your local changes would be overwritten" / "untracked files would be overwritten"

Pull yaparken bu hata çıkarsa, **uzaktaki (GitHub) sürümü** almak için:

```bash
cd /workspaces/zenithai

# 1) markets.py yerel değişikliğini at (uzaktaki versiyon gelecek)
git checkout -- backend/app/api/v1/markets.py

# 2) Uzaktaki patterns dosyaları geleceği için yerel untracked kopyaları kaldır
rm -f backend/app/services/patterns/__init__.py backend/app/services/patterns/candle_detector.py

# 3) Pull
git pull
```

Ardından build:

```bash
docker compose down
docker compose build --no-cache backend
docker compose build --no-cache frontend
docker compose up -d
```

---

**Alternatif (yerel değişiklikleri saklamak istersen):**  
`git stash -u` → `git pull` → `git stash drop` (uzaktakini kullanacaksan drop).
