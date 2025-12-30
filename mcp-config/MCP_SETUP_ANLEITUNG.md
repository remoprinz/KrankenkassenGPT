# 🐝 SwissHealth MCP - Lokale Setup-Anleitung

**Ziel:** Claude (via Cursor) kann direkt mit deiner Supabase-Datenbank sprechen.
**Status:** ✅ READ-ONLY (sicher!)

---

## 1. Voraussetzungen

- [x] Node.js 18+ installiert
- [x] Supabase-Projekt mit den Prämiendaten
- [x] Cursor IDE (mit MCP-Support)

---

## 2. Supabase-Credentials finden

1. Gehe zu: https://supabase.com/dashboard
2. Wähle dein `swisshealth` Projekt
3. Gehe zu: **Settings → API**
4. Kopiere:
   - **Project URL** (z.B. `https://abc123.supabase.co`)
   - **Service Role Key** (⚠️ GEHEIM! Beginnt mit `eyJ...`)

---

## 3. Cursor MCP konfigurieren

### Option A: Globale Konfiguration (empfohlen)

1. Öffne Cursor Settings (⌘ + ,)
2. Suche nach "MCP"
3. Klicke auf "Edit in settings.json"
4. Füge hinzu:

```json
{
  "mcpServers": {
    "swisshealth-supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--supabase-url",
        "https://DEINE-PROJECT-ID.supabase.co",
        "--supabase-service-role-key",
        "eyJ...DEIN_SERVICE_ROLE_KEY...",
        "--read-only"
      ]
    }
  }
}
```

### Option B: Projekt-spezifische Konfiguration

1. Kopiere `mcp.json` aus diesem Ordner
2. Ersetze die Platzhalter mit deinen echten Credentials
3. Platziere die Datei in `.cursor/mcp.json` im Projekt-Root

---

## 4. Testen

Starte Cursor neu und frage Claude:

```
Zeig mir die Tabellenstruktur der "premiums" Tabelle in Supabase.
```

Oder:

```
Wie viele Datensätze gibt es pro Jahr in der premiums Tabelle?
```

Oder (der Killer-Test):

```
Was ist die günstigste Krankenkasse in Zürich für einen Erwachsenen mit 2500 CHF Franchise im Jahr 2026?
```

---

## 5. Sicherheit

### ✅ Was der MCP-Server kann:
- `SELECT` Abfragen auf alle Tabellen
- Schema-Informationen lesen
- Statistiken abfragen

### ❌ Was der MCP-Server NICHT kann (--read-only Flag):
- Daten ändern (`INSERT`, `UPDATE`, `DELETE`)
- Tabellen erstellen/löschen
- Schema ändern
- Funktionen ausführen

### ⚠️ Wichtig:
- Der `Service Role Key` hat volle Admin-Rechte in Supabase
- Das `--read-only` Flag beschränkt den MCP-Server auf Lese-Operationen
- Teile den Key NIEMALS öffentlich!

---

## 6. Bekannte Tabellen

| Tabelle | Inhalt | Zeilen (ca.) |
|---------|--------|--------------|
| `premiums` | Alle Prämiendaten 2011-2026 | 1.8 Mio |
| `insurers` | Versicherer-Stammdaten | ~50 |
| `locations` | PLZ → Region Mapping | ~4'000 |
| `leads` | Kontaktanfragen | variabel |

---

## 7. Beispiel-Queries für Claude

### Einfache Abfragen:
```
Wie viele verschiedene Versicherer gibt es in der Datenbank?
```

### Analytische Abfragen:
```
Welche Kasse hatte die höchste Preissteigerung zwischen 2020 und 2026 in Zürich?
```

### Vergleiche:
```
Vergleiche die Durchschnittspreise von CSS, Helsana und Swica in Bern von 2016 bis 2026.
```

---

## 8. Troubleshooting

### "MCP Server not found"
→ Stelle sicher, dass `npx` im PATH ist (`which npx`)

### "Authentication failed"
→ Prüfe, ob der Service Role Key korrekt kopiert wurde (keine Leerzeichen!)

### "Permission denied"
→ Das `--read-only` Flag verhindert Schreiboperationen. Das ist korrekt!

### Langsame Abfragen
→ Bei 1.8 Mio Zeilen können komplexe Queries dauern. Nutze `LIMIT` und `WHERE` Klauseln.

---

## 9. Nächste Schritte

Nach erfolgreichem lokalem Test:
1. [ ] MCP-Server als npm-Paket veröffentlichen
2. [ ] Bei mcpservers.org registrieren
3. [ ] LinkedIn-Post: "Der erste Schweizer Krankenversicherungs-MCP ist live!"

---

**Erstellt:** 27. Dezember 2025
**Autor:** Remo Prinz / Project BEE-READY











