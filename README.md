<p align="center">
  <img src="https://i.postimg.cc/gjQtLyxQ/nekopara.gif" alt="Otakudesu Scraper Banner" width="100%" />
</p>

<h1 align="center">Otakudesu Scraper 🎌</h1>
<p align="center">
  <strong>Unofficial API</strong> untuk <a href="https://otakudesu.blog">otakudesu.blog</a><br>
  Scrape anime terbaru, ongoing, jadwal, genre, detail, episode, batch, dan search.<br>
  Dibangun dengan <code>cloudscraper</code> + <code>cheerio</code>, siap VPS & serverless.
</p>

<p align="center">
  <a href="https://github.com/rynaqrtz/otakudesu-scraper"><img src="https://img.shields.io/github/stars/rynaqrtz/otakudesu-scraper?style=social" alt="Stars"></a>
  <a href="https://github.com/rynaqrtz/otakudesu-scraper"><img src="https://img.shields.io/github/forks/rynaqrtz/otakudesu-scraper?style=social" alt="Forks"></a>
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

---

## 📊 Statistik

| Endpoint | Tipe Data | Jumlah Item (rata-rata) |
|----------|-----------|--------------------------|
| `home` | Anime terbaru | 25 |
| `ongoing` | Anime ongoing | 25 |
| `search` | Hasil pencarian | 2–15 |
| `anime` | Detail + daftar episode | 1 anime, 10–14 episode |
| `episode` | Link download + streaming | 7 resolusi (360p–1080p) |
| `genre` | Daftar genre | 36 genre |
| `batch` | Link download batch | 3 resolusi |
| `jadwal` | Jadwal rilis per hari | 7 hari, total ~100 judul |

> **Total endpoint:** 8
> **By:** [rynaqrtz](https://github.com/rynaqrtz)

---

## ☁️ Deploy ke Vercel

1. **Clone repo ini**
   ```bash
   git clone https://github.com/rynaqrtz/otakudesu-scraper.git
   cd otakudesu-scraper
```

2. Install dependencies
   ```bash
   npm install
   ```
3. Buat file api/otakudesu.js dengan isi di atas.
4. Deploy
   ```bash
   vercel --prod
   ```
5. Gunakan API
   ```
   GET https://your-project.vercel.app/api/otakudesu?type=home
   GET https://your-project.vercel.app/api/otakudesu?type=search&q=re+zero
   GET https://your-project.vercel.app/api/otakudesu?type=anime&id=maid-taberu-dake-sub-indo
   GET https://your-project.vercel.app/api/otakudesu?type=episode&id=mwtd-episode-1-sub-indo
   GET https://your-project.vercel.app/api/otakudesu?type=all
   ```

---

🖥️ Deploy di VPS (Express.js)

```javascript
const express = require('express');
const scraper = require('./scraper');

const app = express();

app.get('/api/otakudesu', async (req, res) => {
  const { type, q, id } = req.query;
  try {
    const result = await scraper(type || 'home', q || id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, creator: 'rynaqrtz' });
  }
});

app.listen(3000, () => console.log('Running on port 3000'));
```

---

📦 Response Format

Setiap response mengikuti format:

```json
{
  "success": true,
  "data": { ... },
  "creator": "rynaqrtz"
}
```

---


<p align="center">Made with ❤️ by <a href="https://github.com/rynaqrtz">rynaqrtz</a></p>
