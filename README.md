# 🇨🇭 Swiss Health Insurance Premium API

**Schweizer Krankenkassen-Prämien API für ChatGPT Custom GPT**

Version: 2.2.0  
Status: ✅ Produktionsbereit  
Daten: 1.6 Millionen Prämien-Einträge (2016-2026)

**📚 Alle Dokumentationen:** Siehe [INDEX.md](INDEX.md)

---

## 📊 Überblick

Diese API stellt umfassende historische und aktuelle Krankenkassen-Prämien-Daten für einen ChatGPT Custom GPT bereit.

### Hauptfunktionen

- 🏥 **1,611,386 Prämien-Einträge** von 51 Versicherern
- 📅 **11 Jahre Daten** (2016-2026)
- 📍 **4,226 Postleitzahlen** für präzise Region-Zuordnung
- 📈 **Timeline-Analysen** mit Trend-Prognosen
- 💰 **Alle Franchisen** (0-2500 CHF) und Modelle
- 🔍 **Vergleiche** zwischen Jahren und Versicherern

---

## 🏗️ Architektur

```
Firebase Functions → API Endpoints
         ↓
    Supabase PostgreSQL → Daten
         ↓
    ChatGPT Custom GPT → User Interface
```

### Technologie-Stack

- **Backend:** Firebase Functions (Node.js 20)
- **Datenbank:** Supabase PostgreSQL
- **API:** OpenAPI 3.1 kompatibel
- **Daten-Transformation:** TypeScript Scripts
- **Deployment:** Firebase Hosting + Functions

---

## 📁 Projekt-Struktur

```
swisshealth-api/
├── functions/              # Firebase Functions (API)
│   └── src/
│       ├── index.ts        # Hauptendpoints (quote, regions, meta)
│       ├── historical-endpoints.ts  # Timeline, Inflation, etc.
│       ├── endpoints.ts    # Cheapest, Compare
│       ├── config.ts       # Konfiguration
│       ├── types.ts        # TypeScript Types
│       └── id-mapping.ts   # Versicherer-ID-Mapping
│
├── scripts/                # Daten-Verarbeitung
│   ├── download-bag-data.ts          # BAG 2026 Daten herunterladen
│   ├── download-historical-data.ts   # Historische Daten herunterladen
│   ├── transform-complete.ts         # Transformiert 2016-2025
│   ├── transform-2026.ts             # Transformiert 2026
│   ├── import-complete-all.ts        # Import in Supabase
│   └── create-complete-plz.ts        # PLZ-Datenbank erstellen
│
├── data/                   # Rohdaten (nicht in Git)
│   ├── historical/         # Jahre 2016-2025
│   ├── transformed/        # JSON nach Transformation
│   └── *.xlsx              # BAG Excel-Dateien
│
├── openapi-chatgpt-historical.yaml   # API-Schema für ChatGPT
├── GPT_INSTRUCTIONS_FINAL_COMPACT.md # ChatGPT Anweisungen
├── .env                    # Umgebungsvariablen (nicht in Git!)
└── README.md               # Diese Datei
```

---

## 🚀 Schnellstart

### 1. Installation

```bash
npm install
```

### 2. Umgebungsvariablen

Erstellen Sie `.env` mit:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
API_KEY=Ihr-Geheimer-API-Key
```

### 3. Datenbank-Setup

```bash
# PLZ-Datenbank erstellen
npx tsx scripts/create-complete-plz.ts
```

### 4. Daten importieren

```bash
# 1. BAG-Daten herunterladen
npx tsx scripts/download-historical-data.ts

# 2. Transformieren
npx tsx scripts/transform-complete.ts     # 2016-2025
npx tsx scripts/transform-2026.ts          # 2026

# 3. In Datenbank importieren
npx tsx scripts/import-complete-all.ts
```

### 5. Firebase Functions deployen

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

---

## 📚 API Endpoints

| Endpoint | Beschreibung |
|----------|--------------|
| `/premiums/quote` | Aktuelle Prämien-Suche (2026) |
| `/premiums/cheapest` | Günstigste Angebote für Profile |
| `/premiums/timeline` | Preisentwicklung über Jahre |
| `/premiums/inflation` | Teuerung berechnen |
| `/premiums/compare-years` | Jahresvergleiche |
| `/premiums/ranking` | Top-Kassen Rankings |
| `/regions/lookup` | PLZ → Region Mapping |
| `/meta/sources` | Datenquellen & Status |

**API-Dokumentation:** Siehe `openapi-chatgpt-historical.yaml`

---

## 🔧 Wichtige Scripts

### Daten-Download

```bash
# 2026 Daten herunterladen
npx tsx scripts/download-bag-data.ts

# Historische Daten 2016-2025 herunterladen
npx tsx scripts/download-historical-data.ts
```

### Daten-Transformation

```bash
# Historische Daten transformieren (2016-2025)
npx tsx scripts/transform-complete.ts

# 2026 Daten transformieren
npx tsx scripts/transform-2026.ts

# Einzelnes Jahr transformieren
npx tsx scripts/transform-complete.ts 2020
```

### Daten-Import

```bash
# Kompletter Import aller Jahre (2016-2026)
npx tsx scripts/import-complete-all.ts
```

### PLZ-Datenbank

```bash
# PLZ-Datenbank erstellen (einmalig)
npx tsx scripts/create-complete-plz.ts
```

---

## 🔐 Sicherheit

- ✅ API-Key erforderlich für alle Endpoints
- ✅ CORS auf chat.openai.com beschränkt
- ✅ Keine Secrets in Code (nur in `.env`)
- ✅ Input-Validierung auf allen Endpoints
- ✅ Error-Handling implementiert

**Wichtig:** `.env` Datei ist in `.gitignore` und wird NICHT committed!

---

## 📊 Datenqualität

| Metrik | Wert |
|--------|------|
| Prämien-Einträge | 1,611,386 |
| Versicherer | 51 |
| Jahre | 11 (2016-2026) |
| Kantone | 28 |
| Franchisen | 11 (0-2500 CHF) |
| Altersgruppen | 3 (child, young_adult, adult) |
| Modelle | 5 (standard, hmo, telmed, family_doctor, diverse) |
| PLZ-Einträge | 4,226 |
| Datenquelle | BAG Priminfo (Bundesamt für Gesundheit) |

---

## 🤖 ChatGPT GPT Setup

### 1. API-Key konfigurieren

Im GPT Builder unter **Settings → Actions → Authentication**:

- **Authentication Type:** API Key
- **Auth Type:** Custom
- **Custom Header Name:** `X-API-Key`
- **API Key:** Ihr Key aus `.env` Datei

### 2. OpenAPI Schema hochladen

- Datei: `openapi-chatgpt-historical.yaml`
- Im GPT Builder unter **Actions** → **Import from URL or file**

### 3. Instructions kopieren

- Datei: `GPT_INSTRUCTIONS_FINAL_COMPACT.md`
- Kopieren und einfügen im GPT Builder Instructions-Feld

**Vollständige Anleitung:** Siehe `DEPLOYMENT.md`

---

## 📖 Weitere Dokumentation

- **DEPLOYMENT.md** - Vollständige Deployment-Anleitung
- **API_DOCUMENTATION.md** - Detaillierte API-Dokumentation
- **DEPLOYMENT_COMPLETE_SUMMARY.md** - Projekt-Zusammenfassung

---

## 🐛 Troubleshooting

### "No results found"
- Prüfen Sie ob die Kombination existiert (nicht alle Versicherer haben alle Modelle in allen Regionen)
- Versuchen Sie verschiedene Franchisen

### "Unauthorized"
- API-Key prüfen (muss in `.env` und ChatGPT GPT gesetzt sein)
- Header-Name muss `X-API-Key` sein (mit Bindestrichen)

### Daten aktualisieren
```bash
# 1. Neue BAG-Daten herunterladen
npx tsx scripts/download-bag-data.ts

# 2. Transformieren
npx tsx scripts/transform-2026.ts

# 3. Importieren
npx tsx scripts/import-complete-all.ts
```

---

## 📜 Lizenz

Datenquelle: BAG Priminfo (Bundesamt für Gesundheit)  
Lizenz: Freie Nutzung. Quellenangabe ist Pflicht.

---

## 🙏 Support

Bei Fragen oder Problemen:
- Email: support@swisshealth-api.ch
- API-Dokumentation: https://swisshealth-api.ch/docs

---

**Gebaut mit ❤️ für bessere Transparenz im Schweizer Gesundheitswesen**