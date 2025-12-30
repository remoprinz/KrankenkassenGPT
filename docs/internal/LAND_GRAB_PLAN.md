# 🐝 OPERATION LAND GRAB: Swiss Health MCP

**Ziel:** Der erste und einzige Schweizer Krankenversicherungs-MCP-Server in den globalen Verzeichnissen zu werden.
**Asset:** 1.8 Millionen Prämiendaten (2011-2026) aus `swisshealth-api`.
**Zeitrahmen:** 1 Woche (Fast-Track).
**Status:** 🟡 Phase 1 abgeschlossen (27.12.2025)

---

## 🚀 SOFORT STARTEN: Lokaler Test

### Schritt 1: Cursor MCP konfigurieren

Öffne Cursor Settings → MCP → Edit in settings.json und füge hinzu:

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
        "eyJ...DEIN_KEY...",
        "--read-only"
      ]
    }
  }
}
```

### Schritt 2: Testen

Starte Cursor neu und frage Claude:

> "Was ist die günstigste Krankenkasse in Zürich für einen Erwachsenen mit 2500 CHF Franchise im Jahr 2026?"

Claude wird direkt auf Supabase zugreifen und die Antwort liefern. 🎉

---

## 1. Die Strategie

Wir warten nicht auf Kunden. Wir schaffen Fakten.
Wir stellen einen **offiziellen, hochwertigen MCP-Server** bereit, der Agenten (Claude, ChatGPT, etc.) ermöglicht, Schweizer Krankenkassenprämien in Echtzeit abzufragen.

**Warum?**
1.  **First Mover:** Wer zuerst im Verzeichnis steht, wird Standard.
2.  **Proof of Competence:** Wir zeigen, dass wir "H.I.V.E. Ready" nicht nur predigen, sondern bauen können.
3.  **Sales Tool:** Wir können jedem Versicherungs-CEO zeigen: *"Ihr Konkurrent wird hier nicht gefunden. Unser Server liefert die Daten. Wollen Sie nicht lieber, dass IHR EIGENER Server das tut?"*

---

## 2. Die Architektur

### Option A: Direkt via Supabase MCP (JETZT VERFÜGBAR ✅)

```
[ Claude in Cursor ]
        │
        ▼
[ Supabase MCP Server ]  <-- Offizieller @supabase/mcp-server-supabase
        │
        ▼
[ Supabase (PostgreSQL) ]    <-- Die 1.8 Mio Daten
```

**Vorteile:**
- Sofort einsatzbereit (kein eigener Code nötig)
- Read-Only Modus = 100% sicher
- Volle SQL-Power für komplexe Analysen

### Option B: Custom MCP mit Firebase API (SPÄTER)

```
[ Claude Desktop / Agent ]
        │
        ▼
[ Custom MCP Server ]  <-- Eigener Wrapper mit Business-Logik
        │
        ▼
[ SwissHealth API (REST) ]   <-- Die Logik (Charts, Validation)
        │
        ▼
[ Supabase (PostgreSQL) ]    <-- Die 1.8 Mio Daten
```

**Vorteile:**
- Eigene Tools (`get_cheapest`, `compare_insurers`, `generate_chart`)
- Bessere UX für nicht-technische Nutzer
- Rate-Limiting & API-Keys möglich

---

## 3. Der Umsetzungsplan (AKTUALISIERT)

### ✅ Phase 1: Lokaler Test (ERLEDIGT)
- [x] Supabase MCP Server identifiziert (`@supabase/mcp-server-supabase`)
- [x] MCP-Konfiguration erstellt (`mcp-config/mcp.json`)
- [x] Setup-Anleitung geschrieben (`mcp-config/MCP_SETUP_ANLEITUNG.md`)
- [x] Disclaimer & Haftung dokumentiert (`mcp-config/DISCLAIMER_UND_HAFTUNG.md`)
- [x] SQL-Qualitätschecks erstellt (`scripts/QUALITY_CHECKS.sql`)

### 🟡 Phase 2: Qualitätssicherung (NÄCHSTE SCHRITTE)
- [ ] SQL-Qualitätschecks in Supabase ausführen
- [ ] Stichproben gegen priminfo.admin.ch verifizieren
- [ ] Fehlende Versicherer-Namen ergänzen
- [ ] Lokaler Test in Cursor durchführen

### ⏳ Phase 3: Custom MCP Server
- [ ] Neues Repo `swiss-health-mcp` erstellen
- [ ] MCP-SDK installieren (`@modelcontextprotocol/sdk`)
- [ ] Tools definieren:
  - `get_cheapest_insurers(canton, age, franchise)`
  - `compare_insurers(insurer_ids, canton)`
  - `get_price_history(insurer, canton, years)`
  - `generate_chart(type, params)` → Gibt Chart-URL zurück
- [ ] Disclaimer in jede Response einbauen

### ⏳ Phase 4: Deployment & Registration
- [ ] MCP-Server deployen (Smithery / Glama / Docker)
- [ ] `README.md` + `llms.txt` für das Repo
- [ ] Submit zu:
  - [ ] mcpservers.org
  - [ ] glama.ai
  - [ ] smithery.ai
- [ ] LinkedIn Post: "Der erste Schweizer Krankenversicherungs-MCP ist live!"

---

## 4. Sicherheit & Haftung

### Sicherheit:
- ✅ **Read-Only Modus:** `--read-only` Flag verhindert jegliche Schreiboperationen
- ✅ **Lokale Kontrolle:** MCP-Server läuft auf deiner Maschine, nicht in der Cloud
- ✅ **Keine Token-Exposition:** Service Role Key verlässt nie deinen Rechner

### Haftung:
Jede Antwort muss folgenden Disclaimer enthalten:

> ⚠️ **Alle Angaben ohne Gewähr.** Quelle: BAG Open Data.
> Verbindliche Offerten direkt beim Versicherer einholen.
> Offizieller Prämienrechner: https://www.priminfo.admin.ch

Vollständige Dokumentation: `mcp-config/DISCLAIMER_UND_HAFTUNG.md`

---

## 5. Der Sales-Pitch (Das Ergebnis)

Nach Phase 4 haben wir ein Video.
**Szene:** Remo öffnet Claude.
**Remo tippt:** *"Ich ziehe nach Bern, bin 40. Welche Kasse spart mir am meisten Geld vs. meiner aktuellen (Helsana)?"*
**Claude (nutzt MCP):** *"Basierend auf den aktuellen Daten 2026: Die Helsana kostet in Bern X. Die günstigste Alternative ist Y mit Z CHF Ersparnis. ⚠️ Alle Angaben ohne Gewähr."*

**Der Kommentar:** *"Das hat 50 Millisekunden gedauert. Keine Werbung. Kein Bullshit. Reine Daten. Wenn Sie eine Versicherung sind – wollen Sie in dieser Antwort vorkommen? Dann brauchen Sie H.I.V.E."*

---

## 6. Dateien in diesem Projekt

| Datei | Beschreibung |
|-------|--------------|
| `mcp-config/mcp.json` | MCP-Konfiguration für Cursor |
| `mcp-config/MCP_SETUP_ANLEITUNG.md` | Schritt-für-Schritt Setup |
| `mcp-config/DISCLAIMER_UND_HAFTUNG.md` | Rechtliche Absicherung |
| `scripts/QUALITY_CHECKS.sql` | SQL-Tests für Datenqualität |

---

**Letzte Aktualisierung:** 27. Dezember 2025
**Autor:** Remo Prinz / Project BEE-READY

