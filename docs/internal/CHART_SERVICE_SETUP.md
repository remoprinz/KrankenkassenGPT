# 📊 Chart Service Setup Guide

## ✨ Was ist neu?

Ihre SwissHealth API kann jetzt **automatisch professionelle Charts generieren** für:

1. **Vergleichs-Charts:** Top 5 günstigste Krankenkassen als Balkendiagramm
2. **Timeline-Charts:** Preisentwicklung über Jahre als Liniendiagramm
3. **Inflations-Charts:** Jährliche und kumulative Inflation als Kombi-Chart

## 🚀 Quick Start

### 1. Dependencies installieren

```bash
cd functions
npm install
```

Die neuen Packages sind:
- `jsonwebtoken`: JWT Token-Generierung und Validierung
- `quickchart-js`: Chart-Rendering Engine

### 2. Umgebungsvariablen setzen

Fügen Sie zu Ihrer `.env` Datei hinzu:

```env
# Existing
API_KEY=ihr-existing-api-key
SUPABASE_URL=ihre-url
SUPABASE_SERVICE_ROLE_KEY=ihr-key

# Neu (Optional - nutzt API_KEY als Fallback)
JWT_SECRET=ihr-jwt-secret-für-charts
FUNCTIONS_URL=https://krankenkassen.ragit.io
```

### 3. Deployment

```bash
npm run deploy
```

## 📈 Wie funktioniert es?

### Architektur

```
1. User fragt GPT nach Daten
   ↓
2. GPT ruft API Endpoint auf (z.B. /premiums/timeline)
   ↓
3. API holt Daten aus Supabase
   ↓
4. API generiert JWT Token mit Chart-Config
   ↓
5. API gibt Daten + chart_url zurück
   ↓
6. GPT zeigt Daten UND Chart via ![Chart](url)
   ↓
7. Browser lädt Chart von /charts/img?token=xxx
   ↓
8. Chart-Endpoint validiert Token und redirected zu QuickChart
   ↓
9. User sieht schönes Chart!
```

### Sicherheit

- **JWT Tokens:** 5 Minuten TTL, signiert mit Secret
- **Kein API-Key in URL:** Token enthält alle Daten verschlüsselt
- **Rate Limiting:** Via Firebase Functions automatisch
- **Caching:** Charts werden 1 Stunde gecacht

## 🧪 Testing

### Test einzelner Charts

```bash
# Development only - zeigt Test-Chart
curl https://krankenkassen.ragit.io/charts/test
```

### Test mit echten Daten

```bash
# 1. Hole Daten mit chart_url
curl -H "X-API-Key: ihr-key" \
  "https://krankenkassen.ragit.io/premiums/timeline?insurer_id=CSS&canton=ZH"

# Response enthält:
# {
#   "timeline": [...],
#   "chart_url": "https://krankenkassen.ragit.io/charts/img?token=xxx"
# }

# 2. Öffne chart_url im Browser
```

## 📊 Chart-Typen im Detail

### 1. Comparison Chart (Balkendiagramm)

**Endpoints die es nutzen:**
- `/premiums/quote`
- `/premiums/cheapest`

**Features:**
- Horizontale Balken für bessere Lesbarkeit
- Top 5 limitiert für Mobile
- Farbverlauf von dunkel zu hell
- CHF-Werte direkt an Balken

### 2. Timeline Chart (Liniendiagramm)

**Endpoints die es nutzen:**
- `/premiums/timeline`

**Features:**
- Glatte Linie mit Datenpunkten
- Trendlinie (gestrichelt) wenn verfügbar
- Prozentuale Änderung im Subtitle
- Farbcodierung bei starken Anstiegen

### 3. Inflation Chart (Kombi-Chart)

**Endpoints die es nutzen:**
- `/premiums/inflation`

**Features:**
- Balken für jährliche Inflation
- Linie für kumulative Inflation
- Zwei Y-Achsen (links/rechts)
- Farbcodierung: Grün/Blau/Orange nach Inflationsrate

## 🎨 Design-System

### Farben

```javascript
primary: '#1e40af'    // Professionelles Blau
accent: '#dc2626'     // Schweizer Rot
secondary: '#64748b'  // Neutral Grau
success: '#16a34a'    // Grün (niedrige Werte)
warning: '#ea580c'    // Orange (hohe Werte)
```

### Mobile-First

- Alle Charts: 400x300px (optimal für Smartphones)
- Retina-Quality: 2x Device Pixel Ratio
- Große Schrift für Lesbarkeit

### Watermark

Subtiles "Datenquelle: BAG" unten rechts für Seriosität.

## 🔧 Anpassungen

### Chart-Größe ändern

In `chart-service.ts`:

```typescript
CHART_THEME = {
  mobile: {
    width: 400,  // Ändern Sie hier
    height: 300  // Ändern Sie hier
  }
}
```

### Farben anpassen

In `chart-service.ts`:

```typescript
CHART_THEME = {
  colors: {
    primary: '#1e40af',  // Ihre Farbe hier
    // ...
  }
}
```

### Token-Laufzeit ändern

In `chart-service.ts`:

```typescript
expiresIn: '5m'  // Ändern zu '10m' für 10 Minuten
```

## 📝 GPT Configuration Update

### OpenAPI Schema

Das Schema wurde bereits auf Version 2.3.0 aktualisiert mit `chart_url` Feldern.

### GPT Instructions

Fügen Sie zu Ihren GPT Instructions hinzu:

```markdown
## Charts anzeigen

Wenn die API ein `chart_url` Feld zurückgibt, zeige IMMER das Chart:

![Chart]({chart_url})

Charts machen Daten verständlicher!
```

## ⚠️ Troubleshooting

### Chart wird nicht angezeigt

1. **Check Token:** Ist JWT_SECRET gesetzt?
2. **Check Logs:** `firebase functions:log`
3. **Check CORS:** Wird von chat.openai.com aufgerufen?

### "Invalid Token" Error

- Token ist abgelaufen (>5 Minuten)
- JWT_SECRET stimmt nicht überein
- Token wurde manipuliert

### Chart sieht komisch aus

- QuickChart hat Limits für komplexe Charts
- Reduzieren Sie Datenpunkte auf max. 20
- Prüfen Sie die Datenstruktur

## 🚀 Nächste Schritte

### Phase 1 ✅ (Erledigt)
- [x] JWT Token-System
- [x] 3 Chart-Typen
- [x] Integration in alle Endpoints
- [x] Mobile-optimiert

### Phase 2 (Zukünftig)
- [ ] Kantone-Heatmap (Schweizer Karte)
- [ ] PDF-Export Option
- [ ] Mehrsprachige Charts (DE/FR/IT)
- [ ] Dark Mode Support
- [ ] Interaktive Charts (mit Chart.js direkt)

## 📞 Support

Bei Fragen oder Problemen:
1. Check diese Dokumentation
2. Check Firebase Logs: `firebase functions:log`
3. Test mit `/charts/test` Endpoint

---

**Version:** 1.0.0  
**Datum:** 12. Dezember 2024  
**Status:** Production Ready 🎉
