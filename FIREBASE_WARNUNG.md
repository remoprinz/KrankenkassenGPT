# ⚠️ FIREBASE DEPLOYMENT WARNUNG

## Dieses Projekt ist: **SwissHealth API**
## Firebase Projekt: **jassguruchat** (wegen Custom Domain)
## Custom Domain: **krankenkassen.ragit.io**

---

## ❌ NIEMALS auf diese Projekte deployen:

- `kigate-prod` → Das ist KIGATE (kigate.ch)
- `jassguru` → Das ist Jasstafel

---

## ✅ Sicheres Deployment:

```bash
# Verwende IMMER das sichere Script:
npm run deploy

# Oder manuell:
firebase use jassguruchat
cd functions && npm run build && cd ..
firebase deploy --project jassguruchat
```

---

## 🔍 Vor dem Deploy prüfen:

```bash
# Aktuelles Projekt anzeigen:
firebase use

# Sollte zeigen: jassguruchat
```

---

## 📅 Incident History:

**2026-01-07**: KIGATE wurde versehentlich auf `jassguruchat` deployed.
Dies hat diese SwissHealth API zerstört und das Custom GPT funktionierte nicht mehr.
**2026-01-12**: Problem behoben, Sicherheitsmaßnahmen implementiert.
