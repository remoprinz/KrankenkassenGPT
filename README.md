# 🇨🇭 Swiss Health Insurance Premium API & MCP Server

**Die zentrale Schnittstelle für Schweizer Krankenkassen-Daten (2016-2026)**

Dieses Repository enthält zwei leistungsstarke Schnittstellen zu 1.6 Millionen Prämien-Daten:

1.  🤖 **[NEU] Agent-Native MCP Server** (für Claude, Cursor, Agenten)
2.  🌐 **HTTP API** (für ChatGPT Custom GPTs, Web-Apps)

---

## 🤖 1. Agent-Native MCP Server (Neu!)

Der **Model Context Protocol (MCP)** Server ermöglicht KI-Agenten (wie Claude Desktop oder Cursor), intelligent mit den Daten zu interagieren, statt nur Datenbank-Abfragen zu machen.

### Features
- **Intent-based Tools:** `get_cheapest_premiums`, `get_premium_timeline`
- **Automatische Charts:** Generiert Visualisierungen direkt im Chat
- **Mathematische Präzision:** Berechnet Inflation und Trends serverseitig

### Installation

**Via NPM (empfohlen):**
```bash
npx @prinz_esox/swiss-health-mcp
```

**Via Source:**
```bash
cd src-mcp
npm install
npm run build
```

[👉 Zur vollständigen MCP-Dokumentation](src-mcp/README.md)

---

## 🌐 2. HTTP API (für ChatGPT Custom GPTs)

Die bewährte REST-API, die hinter dem "Swiss Health Guide" Custom GPT steckt.

- **Status:** ✅ Produktionsbereit (v2.3.0)
- **Daten:** 1.6 Millionen Einträge (2016-2026)
- **Basis:** Firebase Functions + Supabase

### API Endpoints Überblick

| Endpoint | Beschreibung |
|----------|--------------|
| `/premiums/quote` | Aktuelle Prämien-Suche (2026) |
| `/premiums/cheapest` | Günstigste Angebote für Profile |
| `/premiums/timeline` | Preisentwicklung über Jahre |
| `/premiums/inflation` | Teuerung berechnen |
| `/regions/lookup` | PLZ → Region Mapping |

[👉 Zur API-Dokumentation](docs/api/API_DOCUMENTATION.md)

---

## 🏗️ Architektur

```
                    ┌─────────────────┐
                    │  Datenbank      │
                    │  (Supabase)     │
                    └────────┬────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
    ┌───────────────┐                 ┌───────────────┐
    │  MCP Server   │                 │  HTTP API     │
    │  (Node.js)    │                 │  (Firebase)   │
    └───────┬───────┘                 └───────┬───────┘
            │                                 │
    ┌───────▼───────┐                 ┌───────▼───────┐
    │  Claude /     │                 │  ChatGPT /    │
    │  Cursor       │                 │  Web Apps     │
    └───────────────┘                 └───────────────┘
```

## 📁 Projekt-Struktur

```
swisshealth-api/
├── src-mcp/                # 🤖 NEU: MCP Server (TypeScript)
│   ├── src/                # Tools & Logik
│   └── package.json        # @prinz_esox/swiss-health-mcp
│
├── functions/              # 🌐 HTTP API (Firebase Functions)
│   └── src/                # Endpoints (Express/Node)
│
├── scripts/                # 🔧 ETL-Pipelines (Data Ingestion)
│   ├── transform-2026.ts   # Daten-Transformation
│   └── import-*.ts         # Datenbank-Import
│
├── data/                   # Rohdaten (Excel/JSON)
└── docs/                   # Dokumentation
```

---

## 🚀 Schnellstart (Entwicklung)

### Voraussetzungen
- Node.js 18+
- Supabase Account
- Firebase CLI (für API Deployment)

### Umgebungsvariablen
Erstellen Sie `.env` im Root (oder `src-mcp/.env`):

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 📊 Datenqualität

| Metrik | Wert |
|--------|------|
| Prämien-Einträge | 1,611,386 |
| Versicherer | 51 |
| Jahre | 11 (2016-2026) |
| Kantone | 28 |
| Franchisen | 11 (0-2500 CHF) |
| Quelle | BAG Priminfo (Bundesamt für Gesundheit) |

---

## 📜 Lizenz

**Code:** MIT License  
**Daten:** Open Data (BAG) - Quellenangabe erforderlich.

---

**Gebaut mit ❤️ für bessere Transparenz im Schweizer Gesundheitswesen**
