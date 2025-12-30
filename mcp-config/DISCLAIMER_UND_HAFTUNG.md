# ⚠️ Haftungsausschluss & Datenqualität

**Projekt:** SwissHealth API / MCP Server
**Letzte Aktualisierung:** 27. Dezember 2025

---

## 1. Datenquelle

Alle Prämiendaten stammen aus dem **Open Data Portal des Bundesamts für Gesundheit (BAG)**:

- **Quelle:** https://opendata.swiss/de/dataset/health-insurance-premiums
- **Herausgeber:** Bundesamt für Gesundheit (BAG)
- **Lizenz:** Freie Nutzung. Quellenangabe ist Pflicht.
- **Abgedeckte Jahre:** 2011 - 2026
- **Datensätze:** ca. 1.8 Millionen

---

## 2. Haftungsausschluss (Disclaimer)

### Für Endnutzer (via ChatGPT/Claude/MCP):

> **WICHTIG:** Die hier dargestellten Prämiendaten dienen ausschliesslich zu Informationszwecken. 
> Trotz sorgfältiger Prüfung können Importfehler, Rundungsdifferenzen oder veraltete Daten nicht ausgeschlossen werden.
> 
> **Es gelten ausschliesslich die offiziellen Offerten der jeweiligen Krankenkassen.**
> 
> Für verbindliche Angebote kontaktieren Sie bitte den Versicherer direkt oder nutzen Sie den offiziellen Prämienrechner des BAG: https://www.priminfo.admin.ch

### Für Entwickler (API/MCP-Nutzung):

> Die SwissHealth API und der zugehörige MCP-Server werden "AS IS" ohne jegliche Gewährleistung bereitgestellt.
> Der Betreiber haftet nicht für:
> - Unvollständige oder fehlerhafte Daten
> - Ausfälle oder Verzögerungen
> - Schäden, die durch die Nutzung der Daten entstehen
> - Entscheidungen, die auf Basis dieser Daten getroffen werden

---

## 3. Bekannte Einschränkungen

| Bereich | Einschränkung | Risiko |
|---------|---------------|--------|
| **Prämien** | Nur Grundversicherung (OKP), keine Zusatzversicherungen | Nutzer könnte Gesamtkosten unterschätzen |
| **Regionen** | Nicht alle PLZ haben exaktes Mapping | Falsche Prämienregion möglich |
| **Modelle** | Nicht alle Modelle aller Kassen sind erfasst | Günstigere Optionen könnten fehlen |
| **Aktualität** | Daten werden jährlich aktualisiert | Unterjährige Änderungen nicht erfasst |
| **Historisch** | Daten vor 2016 teilweise unvollständig | Langzeit-Trends können verzerrt sein |

---

## 4. Qualitätssicherung

### Durchgeführte Prüfungen:

1. **Vollständigkeitscheck:** Alle 26 Kantone für alle Jahre vorhanden ✅
2. **Plausibilitätscheck:** Keine negativen Prämien, keine unrealistischen Werte ✅
3. **Konsistenzcheck:** Versicherer-IDs konsistent über Jahre ✅
4. **Stichproben:** Manuelle Prüfung gegen priminfo.admin.ch ✅

### Automatisierte Tests (empfohlen):

```sql
-- Prüfe Datenvollständigkeit pro Jahr
SELECT year, COUNT(*) as records, COUNT(DISTINCT canton) as cantons
FROM premiums
GROUP BY year
ORDER BY year;

-- Prüfe auf Ausreisser (Prämien > 1000 CHF/Monat für Erwachsene)
SELECT * FROM premiums
WHERE monthly_premium_chf > 1000 AND age_band = 'adult'
LIMIT 10;
```

---

## 5. Empfohlener Disclaimer für AI-Responses

Jede Antwort, die Prämiendaten enthält, sollte folgenden Hinweis enthalten:

### Kurz (für Chat):
```
⚠️ Alle Angaben ohne Gewähr. Verbindliche Offerten direkt beim Versicherer einholen.
```

### Lang (für Reports):
```
📋 Datenquelle: Bundesamt für Gesundheit (BAG), Open Data Portal
⚠️ Haftungsausschluss: Die dargestellten Prämien dienen ausschliesslich zu Informationszwecken.
   Trotz sorgfältiger Prüfung können Fehler nicht ausgeschlossen werden.
   Für verbindliche Angebote kontaktieren Sie den Versicherer direkt.
🔗 Offizieller Prämienrechner: https://www.priminfo.admin.ch
```

---

## 6. MCP-Server Konfiguration für Disclaimer

Der MCP-Server sollte so konfiguriert werden, dass er bei jeder Datenabfrage den Disclaimer mitsendet.

### Empfehlung für System Prompt:

```
Du hast Zugriff auf die SwissHealth-Datenbank mit 1.8 Millionen Prämiendaten.

WICHTIGE REGELN:
1. Füge bei JEDER Prämienauskunft folgenden Hinweis hinzu:
   "⚠️ Alle Angaben ohne Gewähr. Quelle: BAG Open Data. Verbindliche Offerten beim Versicherer einholen."

2. Empfehle bei konkreten Wechselabsichten IMMER den offiziellen Prämienrechner:
   https://www.priminfo.admin.ch

3. Weise darauf hin, dass nur die Grundversicherung (OKP) abgedeckt ist,
   nicht Zusatzversicherungen.

4. Bei historischen Vergleichen: Erwähne, dass vergangene Entwicklungen
   keine Garantie für zukünftige Prämien sind.
```

---

## 7. Rechtliche Grundlage

- **KVG (Krankenversicherungsgesetz):** Prämien sind öffentlich und müssen vom BAG publiziert werden.
- **Open Data Lizenz:** Die Daten dürfen frei genutzt werden, Quellenangabe ist Pflicht.
- **Haftung:** Keine Beratung im Sinne von FINMA-regulierten Versicherungsberatung.

---

## 8. Kontakt bei Fragen

Bei Unklarheiten oder vermuteten Datenfehlern:

- **E-Mail:** [Deine Kontakt-E-Mail]
- **Offizielle BAG-Quelle:** https://www.bag.admin.ch
- **Prämienrechner:** https://www.priminfo.admin.ch

---

**Dieser Disclaimer ist Teil des Projekts SwissHealth API und muss bei jeder Nutzung der Daten beachtet werden.**











