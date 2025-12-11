    # 📋 PROJEKT-ÜBERSICHT

**Swiss Health Insurance Premium API + ChatGPT GPT**

---

## 🎯 Was ist dieses Projekt?

Ein **produktionsreifer ChatGPT Custom GPT** der Schweizer Krankenkassen-Prämien analysiert und vergleicht.

### Kernfunktionalität

- ✅ Prämien-Suche für 2026 (alle Versicherer, Franchisen, Modelle)
- ✅ Historische Analysen (2016-2025)
- ✅ Preisentwicklungen & Trends
- ✅ PLZ-basierte Suche
- ✅ Vergleiche zwischen Versicherern und Jahren

---

## 📊 Daten

### Quelle
**BAG Priminfo** (Bundesamt für Gesundheit)
- Offizielle Schweizer Prämien-Daten
- Öffentlich zugänglich
- Quellenangabe erforderlich

### Umfang
- **1,611,386** Prämien-Einträge
- **51** Versicherer (inkl. CSS, Assura, Helsana, Swica, Sanitas)
- **11** Jahre (2016-2026)
- **28** Kantone
- **4,226** Postleitzahlen

### Dimensionen

**Franchisen:** 0, 100, 200, 300, 400, 500, 600, 1000, 1500, 2000, 2500 CHF

**Altersgruppen:**
- child (0-18 Jahre)
- young_adult (19-25 Jahre)
- adult (26+ Jahre)

**Versicherungsmodelle:**
- standard (freie Arztwahl)
- hmo (HMO-Modell)
- telmed (Telefonberatung)
- family_doctor (Hausarzt-Modell)
- diverse (sonstige)

**Unfalldeckung:**
- Mit Unfall (wenn Arbeitgeber nicht zahlt)
- Ohne Unfall (wenn Arbeitgeber zahlt)

---

## 🏗️ Technische Architektur

### Backend: Firebase Functions
- **Sprache:** TypeScript/Node.js 20
- **9 Endpoints** für verschiedene Funktionen
- **CORS:** Auf chat.openai.com beschränkt
- **Auth:** API-Key basiert

### Datenbank: Supabase PostgreSQL
- **Tabellen:** premiums, locations, insurers
- **Indizes:** Optimiert für schnelle Abfragen
- **Constraints:** Unique Constraints für Datenintegrität

### Frontend: ChatGPT Custom GPT
- **UI:** Natürliche Konversation
- **Features:** Multiple-Choice, PLZ-Parsing, Kontext-Management
- **UX:** Mobile-optimiert, BAG-zertifiziert

### Daten-Pipeline
```
BAG Open Data
    ↓ (download-scripts)
Excel/CSV Rohdaten
    ↓ (transform-scripts)
Strukturiertes JSON
    ↓ (import-scripts)
Supabase PostgreSQL
    ↓ (Firebase Functions)
ChatGPT GPT
    ↓
Benutzer
```

---

## 📁 Wichtige Dateien

### Für Deployment
- `README.md` - Haupt-Dokumentation
- `DEPLOYMENT.md` - Deployment-Anleitung
- `openapi-chatgpt-historical.yaml` - API-Schema (Version 2.2.0)
- `GPT_INSTRUCTIONS_FINAL_COMPACT.md` - ChatGPT Instructions (7,980 Zeichen)

### Für Entwicklung
- `functions/src/index.ts` - Haupt-API-Endpoints
- `functions/src/historical-endpoints.ts` - Timeline, Inflation, etc.
- `functions/src/id-mapping.ts` - Versicherer-ID-Mapping
- `functions/src/config.ts` - Konfiguration & Profile

### Scripts (Daten-Management)
- `scripts/transform-complete.ts` - Transformation 2016-2025
- `scripts/transform-2026.ts` - Transformation 2026
- `scripts/import-complete-all.ts` - Import in Datenbank
- `scripts/create-complete-plz.ts` - PLZ-Datenbank
- `scripts/README.md` - Script-Dokumentation

### Konfiguration
- `.env` - Umgebungsvariablen (**NICHT IN GIT!**)
- `firebase.json` - Firebase-Konfiguration
- `package.json` - Dependencies

---

## 🔒 Sicherheit

### Secrets Management
- ✅ Alle API-Keys in `.env` (nicht in Git)
- ✅ `.env` in `.gitignore` 
- ✅ Keine hardcoded Secrets in Code
- ✅ `functions/.env` auch in `.gitignore`

### API Security
- ✅ API-Key erforderlich für alle Endpoints
- ✅ CORS-Restriktionen
- ✅ Input-Validierung
- ✅ Error-Handling ohne sensitive Infos

---

## 📈 Erfolgsmetriken

| Metrik | Ziel | Status |
|--------|------|--------|
| Datenqualität | 100% | ✅ Erreicht |
| API-Verfügbarkeit | 99%+ | ✅ Production |
| Response-Zeit | <2s | ✅ Optimiert |
| Fehlerrate | <1% | ✅ Robust |
| Versicherer-Abdeckung | Alle großen | ✅ 51 Versicherer |

---

## 🚀 Deployment-Status

| Komponente | Version | Status |
|------------|---------|--------|
| Firebase Functions | 2.2.0 | ✅ Deployed |
| Supabase DB | - | ✅ 1.6M Einträge |
| OpenAPI Schema | 2.2.0 | ✅ Ready |
| GPT Instructions | Final | ✅ Optimiert |
| PLZ-Datenbank | - | ✅ 4,226 Einträge |

---

## 📝 Changelog

### Version 2.2.0 (11. Dez 2025)
- ✅ 2026 Daten hinzugefügt (113,798 Einträge)
- ✅ Kompletter Re-Import aller Versicherer
- ✅ ID-Mapping für flexible Versicherer-IDs
- ✅ YAML Parameter-Fix (age_band, franchise_chf)
- ✅ Timeline model_type Support
- ✅ Inflation Endpoint Parameter-Fix
- ✅ Quote Endpoint Response-Schema

### Version 2.1.0
- ✅ Historische Daten 2016-2025
- ✅ Timeline, Inflation, Rankings
- ✅ PLZ-Lookup

### Version 2.0.0
- ✅ Initiale Version mit 2026 Daten

---

## 🎓 Gelöste Herausforderungen

1. **99% Datenverlust** → 100% Vollständigkeit
2. **Nur CSS-Daten** → Alle 51 Versicherer
3. **Fehlende 2026 Daten** → 113k Einträge importiert
4. **Parameter-Mismatch** → YAML & Functions synchronisiert
5. **ID-Inkonsistenzen** → Flexibles Mapping implementiert
6. **Keine PLZ-Suche** → 4,226 PLZ integriert

---

## 👥 Für Entwickler

### Code-Standards
- TypeScript strict mode
- ESLint configured
- Keine hardcoded Secrets
- Umfassende Error-Handling

### Testing
- API-Endpoints verifiziert
- Datenbank-Queries getestet
- ChatGPT Integration getestet

### Performance
- Batch-Import (100 Einträge/Batch)
- Deduplizierung vor Import
- Optimierte DB-Indizes
- Response-Caching (1 Stunde)

---

## 🌟 Nächste Schritte (Optional)

1. **Monitoring:** Firebase Analytics integration
2. **Rate Limiting:** Implementierung pro API-Key
3. **Caching:** Redis für häufige Abfragen
4. **Additional Endpoints:** Versicherer-Details, Bewertungen
5. **Mobile App:** Native iOS/Android App

---

**Projekt ist produktionsbereit und erfolgreich deployed! 🎉**