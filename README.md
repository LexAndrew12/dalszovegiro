# Hajszalon időpontfoglaló rendszer

Teljes körű, önállóan futtatható webes időpontfoglaló rendszer egyetlen fodrász számára. A felület teljes egészében magyar nyelvű, 15 perces rácshoz igazodó időpontfoglalással, valós idejű frissítésekkel és adminisztrátori vezérlőpulttal.

## Fő funkciók

- **Vendégfelület**: szolgáltatás(ok), hajhossz és hajdússág kiválasztása után csak a megfelelő hosszúságú szabad időpontok (zöld) jelennek meg. A foglaláshoz név és telefonszám kötelező, e-mail megadása esetén automatikus visszaigazolás és emlékeztetők (T-24h és T-1h).
- **Heti naptár**: hétváltással böngészhető hétfőtől péntekig 09:00–16:00-ig. Aznapra nem enged foglalni.
- **Valós idejű frissítés**: a foglalások, módosítások és zárolások azonnal frissülnek WebSocket kapcsolaton keresztül.
- **Foglalás kezelése**: e-mailes linkkel, vagy telefon+időpont páros megadásával módosítható/lemondható az időpont.
- **Admin felület**: bejelentkezés után teljes foglaláslista, utólagos (munkaidőn túli) foglalások rögzítése, sávok zárolása, időtartam-mátrix szerkesztése, statisztikák, Google/iCal export.
- **GDPR megfelelés**: süti/adatvédelmi tájékoztatás és csak a szükséges adatok gyűjtése.

## Technológia

- **Backend**: Node.js + Express + SQLite, TypeScript-ben. Valós idejű kommunikáció Socket.IO-val, e-mail értesítések Nodemailerrel.
- **Frontend**: React + Vite + TypeScript. Reszponzív, világos témájú felhasználói felület.
- **Időzóna**: minden időkezelés az `Europe/Budapest` zónára épül.

## Fejlesztői környezet

1. Telepítsd a függőségeket:

   ```bash
   npm install
   npm run install:all
   ```

   > Ha nincs globális `install:all` script, futtasd külön a `client` és `server` csomagokat: `npm install --prefix server` és `npm install --prefix client`.

2. Indítsd a fejlesztői környezetet (két terminálban):

   ```bash
   npm run dev:server
   npm run dev:client --prefix client
   ```

   Az ügyfélfelület a `http://localhost:5173`, a szerver az `http://localhost:4000` címen érhető el.

3. Éles build készítése:

   ```bash
   npm run build
   npm start
   ```

   A buildelt React alkalmazást az Express szerver szolgálja ki.

## Környezeti változók

Az opcionális e-mail küldéshez és admin inicializációhoz az alábbi változók használhatók:

- `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- `PUBLIC_BASE_URL` – a visszaigazoló linkek alap URL-je
- `JWT_SECRET` – admin tokenekhez

## Adatbázis

A SQLite adatbázis a `server/data/app.db` fájlban jön létre. A futtatáskor automatikusan készül el a szükséges séma és a kezdeti időtartam-mátrix.

## Licenc

MIT
