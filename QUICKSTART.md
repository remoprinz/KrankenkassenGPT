# ⚡ QUICKSTART

**In 5 Minuten zum funktionierenden ChatGPT Krankenkassen-Experten**

---

## ✅ CHECKLISTE

- [ ] Node.js 20+ installiert
- [ ] Firebase CLI installiert
- [ ] Supabase Account erstellt
- [ ] ChatGPT Plus Account
- [ ] `.env` Datei erstellt

---

## 🚀 SETUP IN 5 SCHRITTEN

### SCHRITT 1: Dependencies installieren (30 Sekunden)

```bash
npm install
cd functions && npm install && cd ..
```

---

### SCHRITT 2: `.env` erstellen (1 Minute)

Erstellen Sie `.env` im Projekt-Root:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
API_KEY=$(openssl rand -base64 32)
```

Kopieren Sie die gleiche Datei nach `functions/.env`.

**Wo finde ich die Supabase Credentials?**
- Dashboard → Settings → API → URL & Service Role Key

---

### SCHRITT 3: ChatGPT GPT konfigurieren (2 Minuten)

1. **Gehen Sie zu:** https://chat.openai.com/gpts/editor

2. **Actions → Import:** Laden Sie `openapi-chatgpt-historical.yaml` hoch

3. **Authentication:**
   - Type: API Key
   - Header Name: `X-API-Key`
   - API Key: [Aus Ihrer `.env` Datei]

4. **Instructions:** Kopieren Sie `GPT_INSTRUCTIONS_FINAL_COMPACT.md`

5. **Save**

---

### SCHRITT 4: Testen (1 Minute)

Im ChatGPT GPT fragen Sie:

```
Was kostet CSS für einen Mann, 52, in 8000 Zürich, HMO, ohne Unfallversicherung?
```

**Erwartetes Ergebnis:**
- GPT fragt nach präziser PLZ
- Zeigt Prämien-Vergleich
- Gibt CSS-Preis und günstigste Alternativen

---

## 🎉 FERTIG!

Ihr ChatGPT Krankenkassen-Experte ist **LIVE** mit:
- ✅ 1.6 Millionen Prämien-Einträgen
- ✅ 11 Jahre Daten
- ✅ 51 Versicherer
- ✅ PLZ-Suche

---

## 📚 Nächste Schritte

- **Vollständige Doku:** Siehe `README.md`
- **Deployment-Details:** Siehe `DEPLOYMENT.md`
- **API-Referenz:** Siehe `API_DOCUMENTATION.md`

---

## 💡 WICHTIG

Die **Datenbank ist bereits gefüllt** mit 1.6M Einträgen!

Sie müssen nur:
1. ✅ Firebase Functions deployen (falls noch nicht geschehen)
2. ✅ ChatGPT GPT konfigurieren

**Keine Daten-Downloads nötig wenn DB schon gefüllt ist!**

---

## 🆘 Probleme?

### "Unauthorized"
→ API-Key in ChatGPT falsch oder fehlt

### "No results"
→ Probieren Sie verschiedene Franchisen (300, 500, 1000, 2500)

### Weitere Hilfe
→ Siehe `DEPLOYMENT.md` Troubleshooting-Sektion

---

**Happy Coding! 🚀**