# 🚀 Chart Service Deployment

## Quick Deployment (5 Minuten)

### 1️⃣ Dependencies installieren

```bash
cd functions
npm install
```

### 2️⃣ Umgebungsvariablen prüfen

Stellen Sie sicher, dass Ihre `.env` Datei existiert:

```bash
# functions/.env sollte enthalten:
API_KEY=ihr-api-key
SUPABASE_URL=ihre-supabase-url
SUPABASE_SERVICE_ROLE_KEY=ihr-supabase-key

# Optional (nutzt API_KEY als Fallback wenn nicht gesetzt):
JWT_SECRET=ihr-jwt-secret
FUNCTIONS_URL=https://krankenkassen.ragit.io
```

### 3️⃣ Build & Test lokal

```bash
# Build TypeScript
npm run build

# Test lokal (optional)
npm run serve
```

### 4️⃣ Deploy zu Firebase

```bash
# Deploy nur Functions
firebase deploy --only functions

# Oder spezifische Functions:
firebase deploy --only functions:chartsImg,functions:premiumsTimeline,functions:premiumsQuote
```

### 5️⃣ Test in Production

```bash
# Setze API Key als Umgebungsvariable
export API_KEY=ihr-api-key

# Run Test Script
node scripts/test-charts.js
```

## ✅ Deployment Checklist

- [ ] `npm install` erfolgreich
- [ ] `.env` Datei vorhanden mit allen Keys
- [ ] `npm run build` ohne Fehler
- [ ] `firebase deploy` erfolgreich
- [ ] Test-Script zeigt chart_urls
- [ ] Chart-URLs öffnen im Browser
- [ ] GPT kann Charts anzeigen

## 🔍 Verifizierung

### Test Timeline mit Chart

```bash
curl -H "X-API-Key: IHR_KEY" \
  "https://krankenkassen.ragit.io/premiums/timeline?insurer_id=CSS&canton=ZH"
```

Response sollte enthalten:
```json
{
  "timeline": [...],
  "chart_url": "https://krankenkassen.ragit.io/charts/img?token=..."
}
```

### Test Chart-URL direkt

Öffnen Sie die `chart_url` aus der Response im Browser. Sie sollten ein professionelles Chart sehen!

## 🐛 Troubleshooting

### "Cannot find module" Fehler

```bash
cd functions
npm install
npm run build
```

### "Unauthorized" bei API Calls

Prüfen Sie:
- API_KEY in .env gesetzt?
- Firebase Functions deployed?
- Richtige URL verwendet?

### Charts werden nicht angezeigt

1. Prüfen Sie Firebase Logs:
```bash
firebase functions:log --only chartsImg
```

2. Test Token-Generation:
```bash
node -e "console.log(require('jsonwebtoken').sign({test:1},'secret'))"
```

3. Prüfen Sie QuickChart Status:
```bash
curl https://quickchart.io/chart?c={type:'bar',data:{labels:['Test'],datasets:[{data:[1]}]}}
```

## 📊 Monitoring

### Firebase Console

1. Öffnen Sie [Firebase Console](https://console.firebase.google.com)
2. Wählen Sie Ihr Projekt
3. Functions → Logs
4. Suchen Sie nach `chartsImg` Function

### Metriken prüfen

- **Invocations:** Wie oft werden Charts generiert?
- **Execution time:** Sollte <1s sein
- **Error rate:** Sollte <1% sein

## 🎉 Success!

Wenn alle Tests grün sind:

1. **Update GPT:** Neue OpenAPI Schema (v2.3.0) hochladen
2. **Test in ChatGPT:** "Zeige mir die Preisentwicklung von CSS in Zürich"
3. **Freuen:** Sie haben jetzt professionelle Charts! 📊

---

**Support:** Bei Problemen siehe `CHART_SERVICE_SETUP.md` für Details.
