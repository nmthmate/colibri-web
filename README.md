# Colibri Italdiszkont

## 🍷 Weboldal leírása

Teljes funkcionalitású e-commerce weboldal a **Colibri Italdiszkont** számára, amely Dunavarsányban működik. Az oldal dinamikus termékkatalógust, szűrési lehetőségeket, akciók szakaszát és integrált Google Maps helymegjelölést tartalmaz.

## 🎯 Fő Funkciók

- ✅ **18+ Age Gate** – Alkoholtartalom miatti jogi védelem
- 🛍️ **Dinamikus Termékkatalógus** – Termékek betöltése JSON-ból
- 🔍 **Keresés & Szűrés** – Kategória, ár és DRS szűrés
- 🎉 **Akciók Szekció** – Kiemelt akciók megjelenítése
- 📍 **Google Maps Integráció** – Üzlet helye a térképen
- 📱 **Teljes Responsivitás** – Mobile-first dizájn
- 🖼️ **Hero Slider** – Kiemelt képek rotálása

## 💻 Technológiák

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Data**: JSON (kinalat.json, dinamikus termékkatalógus)
- **Maps**: Google Maps API
- **Verziókezelés**: Git

## 📁 Projekt Szerkezete

```
├── index.html              # Főoldal
├── adatkezeles.html        # GDPR adatkezelési oldal
├── impresszum.html         # Impresszum / Jogi információk
├── styles.css              # Globális stílus
├── script.js               # Fő JavaScript logika
├── kinalat.json            # Termékkatalógus adat
├── admin/
│   ├── .htaccess           # Apache beállítások
│   └── frissites.html      # Admin panel (termékkészlet frissítés)
├── termekek/               # Termékkép könyvtár
├── images/                 # Logo és egyéb média
└── map.png                 # Helymegjelölés statikus kép
```

## 🚀 Telepítés

1. **Klónozás**

   ```bash
   git clone https://github.com/nmthmate/colibri-web.git
   cd colibri-web
   ```

2. **Webszerver futtatása** (dev)

   ```bash
   # Python 3
   python -m http.server 8000

   # Python 2
   python -m SimpleHTTPServer 8000
   ```

3. **Böngészőben**
   ```
   http://localhost:8000
   ```

## 📋 Funkciók Részletei

### Age Gate

- Jogi kötelezettség az alkoholtartalmú termékek miatt
- Felhasználó megerősítésre vagy elutasításra van szüksége
- LocalStorage alapú session nyilvántartás

### Termékkatalógus

- Dinamikus termékbetöltés a `kinalat.json`-ből
- Kategóriák szerinti szűrés
- Árszűrés (0-999 Ft, 1000-2999 Ft, stb.)
- DRS (visszaváltható) termékek szűrése
- Keresés név és kategória alapján
- Lazy loading "További termékek" gombbal

### Akciók

- Kiemelt, akciós termékek rövid szakasza
- Szín-kódolt badge-ek (sárga, zöld, mentol)
- Vizuálisan megkülönböztetett design

### Admin Panel

- Apache .htaccess védelemmel
- Termékkészlet frissítési lehetőség
- Akciók kezelése

## 🎨 Design

- **Szín séma**: Zöld (#68ba27) + narancs (#ef7d46) + krém háttér
- **Tipográfia**: Trebuchet MS, Segoe UI
- **Layout**: CSS Grid, Flexbox
- **Responsivitás**: Mobile, tablet, desktop

## 📊 Nyitvatartás

- **Hétfő-Szombat**: 7:00-19:00
- **Vasárnap**: 8:00-15:00

## 📞 Elérhetőség

- **Telefon**: +36 (30) 873 6729
- **Email**: colibridiszkont@hotmail.com
- **Cím**: Széchenyi utca 1., Dunavarsány, 2336
- **Szolgáltatás**: MOHU automata pont

## 📄 Licensz

MIT License

## 👤 Fejlesztő

**Németh Máté** - Junior Frontend Developer

- 🐙 GitHub: [@nmthmate](https://github.com/nmthmate)
- 💼 LinkedIn: [Németh Máté](https://www.linkedin.com/in/n%C3%A9meth-m%C3%A1t%C3%A9-328356397)

---

**Megjegyzés**: Ez a projekt jelenleg még nem lett publikálva. A termékkatalógus és az admin panel fejlesztés alatt van.
