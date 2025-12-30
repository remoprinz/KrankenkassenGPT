# 📚 API DOCUMENTATION

**Swiss Health Insurance Premium API v2.2.0**

Base URL: `https://krankenkassen.ragit.io`

---

## 🔐 Authentication

Alle Endpoints erfordern einen API-Key im Header:

```http
X-API-Key: Ihr-API-Key
```

**Fehler bei fehlender Authentifizierung:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

---

## 📍 ENDPOINT 1: Region Lookup

**`GET /regions/lookup`**

Findet Kanton und Prämien-Region basierend auf PLZ.

### Parameter

| Name | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `plz` | string | Ja | Schweizer Postleitzahl (z.B. "8001") |

### Beispiel-Request

```bash
GET /regions/lookup?plz=8001
```

### Beispiel-Response

```json
{
  "plz": "8001",
  "canton": "ZH",
  "canton_name": "Zürich",
  "municipality": "Zürich",
  "region_code": "CH01",
  "region_name": "Region 1"
}
```

---

## 💰 ENDPOINT 2: Premium Quote

**`GET /premiums/quote`**

Sucht aktuelle Prämien-Angebote für 2026.

### Parameter

| Name | Typ | Erforderlich | Default | Beschreibung |
|------|-----|--------------|---------|--------------|
| `canton` | string | Ja | - | Kanton (ZH, BE, GE, etc.) |
| `age_band` | string | Nein | adult | Altersgruppe: child, young_adult, adult |
| `franchise_chf` | string | Nein | "2500" | Franchise: 0, 100, 200, 300, 400, 500, 600, 1000, 1500, 2000, 2500 |
| `accident_covered` | boolean | Nein | true | Mit Unfallversicherung |
| `model_type` | string | Nein | standard | Modell: standard, hmo, telmed, family_doctor, diverse |
| `limit` | integer | Nein | 10 | Anzahl Resultate (max 100) |

### Beispiel-Request

```bash
GET /premiums/quote?canton=ZH&age_band=adult&franchise_chf=2500&accident_covered=false&model_type=hmo&limit=5
```

### Beispiel-Response

```json
{
  "query": {
    "canton": "ZH",
    "age_band": "adult",
    "franchise_chf": 2500,
    "accident_covered": false,
    "model_type": "hmo"
  },
  "results": [
    {
      "insurer_id": "0455",
      "insurer_name": "Insurer 0455",
      "monthly_premium_chf": 302.1,
      "annual_premium_chf": 3625.2,
      "model_type": "hmo",
      "canton": "ZH",
      "region": "CH3",
      "tariff_name": "Gesundheitszentrum"
    }
  ],
  "count": 69,
  "statistics": {
    "min": 302.1,
    "max": 503.85,
    "median": 372.2,
    "average": 379.01
  }
}
```

---

## 📈 ENDPOINT 3: Premium Timeline

**`GET /premiums/timeline`**

Zeigt Preisentwicklung eines Versicherers über mehrere Jahre.

### Parameter

| Name | Typ | Erforderlich | Default | Beschreibung |
|------|-----|--------------|---------|--------------|
| `insurer_id` | string | Ja | - | Versicherer-ID (z.B. "1318", "CSS", "Assura") |
| `canton` | string | Ja | - | Kanton (ZH, BE, etc.) |
| `profile` | string | Nein | single_adult | Profil: single_adult, couple, family_1kid, family_2kids, student, young_adult |
| `model_type` | string | Nein | - | Modell (optional) |
| `start_year` | integer | Nein | 2016 | Start-Jahr (min 2016) |
| `end_year` | integer | Nein | 2025 | End-Jahr (max 2026) |

### Versicherer-ID Mapping

Die API akzeptiert verschiedene ID-Formate:

| Versicherer | Akzeptierte IDs |
|-------------|-----------------|
| CSS | "8", "0008", "230", "CSS" |
| Assura | "1318", "Assura", "ASSURA" |
| Helsana | "62", "0062", "Helsana" |
| Swica | "57", "0057", "Swica" |

### Beispiel-Request

```bash
GET /premiums/timeline?insurer_id=CSS&canton=ZH&profile=single_adult&model_type=hmo&start_year=2020&end_year=2025
```

### Beispiel-Response

```json
{
  "success": true,
  "insurer": {
    "id": "0008",
    "name": "CSS Versicherung"
  },
  "canton": "ZH",
  "profile": "single_adult",
  "period": "2020-2025",
  "timeline": [
    {
      "year": 2020,
      "monthly_premium_chf": 275.8
    },
    {
      "year": 2021,
      "monthly_premium_chf": 272.6
    }
  ],
  "statistics": {
    "total_change_chf": -3.2,
    "percent_change": -1.16,
    "avg_yearly_increase": -0.64
  },
  "trend": {
    "slope": 10.99,
    "intercept": -21925.86,
    "prediction_2027": 347.97
  }
}
```

---

## 📊 ENDPOINT 4: Premium Inflation

**`GET /premiums/inflation`**

Berechnet die jährliche Inflationsrate der Krankenkassen-Prämien.

### Parameter

| Name | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `canton` | string | ZH | Kanton |
| `age_band` | string | adult | Altersgruppe |
| `franchise_chf` | string | "2500" | Franchise |
| `model_type` | string | standard | Modell |
| `start_year` | integer | 2016 | Start-Jahr |
| `end_year` | integer | 2025 | End-Jahr |

### Beispiel-Request

```bash
GET /premiums/inflation?canton=ZH&age_band=adult&franchise_chf=2500&model_type=hmo&start_year=2020&end_year=2025
```

### Beispiel-Response

```json
{
  "success": true,
  "statistics": {
    "avg_yearly_inflation": 3.2,
    "total_inflation": 16.8,
    "years_covered": 5
  },
  "yearly_data": [
    {
      "year": 2020,
      "avg_premium_chf": 275.5,
      "inflation_rate": 0,
      "cumulative_inflation": 0
    },
    {
      "year": 2021,
      "avg_premium_chf": 284.3,
      "inflation_rate": 3.19,
      "cumulative_inflation": 3.19
    }
  ]
}
```

---

## 🔄 ENDPOINT 5: Compare Years

**`GET /premiums/compare-years`**

Vergleicht Prämien zwischen zwei Jahren.

### Parameter

| Name | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `year1` | string | "2020" | Erstes Jahr |
| `year2` | string | "2026" | Zweites Jahr |
| `canton` | string | ZH | Kanton |
| `profile` | string | single_adult | Profil |
| `limit` | string | "10" | Anzahl Resultate |

---

## 🏆 ENDPOINT 6: Premium Ranking

**`GET /premiums/ranking`**

Zeigt welche Kassen über die Jahre konstant günstig waren.

### Parameter

| Name | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `canton` | string | ZH | Kanton |
| `profile` | string | single_adult | Profil |
| `years` | string | "2020,2023,2025" | Komma-getrennte Jahre |
| `top` | string | "5" | Top N Kassen pro Jahr |

---

## 🏥 ENDPOINT 7: Cheapest Premiums

**`GET /premiums/cheapest`**

Findet die günstigsten Versicherungen für vordefinierte Profile (2026).

### Parameter

| Name | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `canton` | string | Ja | Kanton |
| `profile` | string | Ja | Profil (single_adult, couple, family_1kid, family_2kids, student, young_adult) |
| `limit` | integer | Nein | Anzahl Resultate (Standard: 5, Max: 20) |

---

## ℹ️ ENDPOINT 8: Meta Sources

**`GET /meta/sources`**

Gibt Informationen über verfügbare Daten und Versionen zurück.

### Beispiel-Response

```json
{
  "current": {
    "year": 2026,
    "count": 113798,
    "last_updated": "2025-12-11"
  },
  "historical": {
    "available_years": [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    "total_entries": 1497588
  },
  "data_source": {
    "name": "BAG Priminfo 2026",
    "publisher": "Bundesamt für Gesundheit (BAG)",
    "license": "Freie Nutzung. Quellenangabe ist Pflicht.",
    "url": "https://opendata.swiss/de/dataset/health-insurance-premiums"
  }
}
```

---

## ❌ Fehler-Codes

| Code | HTTP Status | Beschreibung |
|------|-------------|--------------|
| `UNAUTHORIZED` | 401 | Fehlender oder ungültiger API-Key |
| `INVALID_CANTON` | 400 | Ungültiger Kanton |
| `INVALID_AGE_BAND` | 400 | Ungültige Altersgruppe |
| `INVALID_FRANCHISE` | 400 | Ungültige Franchise |
| `PLZ_NOT_FOUND` | 404 | PLZ nicht in Datenbank |
| `NO_RESULTS` | 404 | Keine Prämien für diese Kriterien |
| `QUERY_ERROR` | 500 | Datenbank-Fehler |
| `INTERNAL_ERROR` | 500 | Interner Server-Fehler |

### Fehler-Format

```json
{
  "error": {
    "code": "NO_RESULTS",
    "message": "No premiums found for these criteria",
    "suggestion": "Try adjusting your search parameters",
    "docs": "https://swisshealth-api.ch/docs#no_results",
    "timestamp": "2025-12-11T01:00:00.000Z"
  }
}
```

---

## 📊 Profile-Definitionen

| Profile | age_band | franchise_chf | accident_covered |
|---------|----------|---------------|------------------|
| `single_adult` | adult | 2500 | false |
| `couple` | adult | 2500 | true |
| `family_1kid` | adult | 1000 | true |
| `family_2kids` | adult | 500 | true |
| `student` | young_adult | 2500 | false |
| `young_adult` | young_adult | 2500 | true |

---

## 🌍 Kantone

AG, AI, AR, BE, BL, BS, FR, GE, GL, GR, JU, LU, NE, NW, OW, SG, SH, SO, SZ, TG, TI, UR, VD, VS, ZG, ZH

---

## 💡 Best Practices

### 1. Rate Limiting
- Vermeiden Sie zu viele Anfragen in kurzer Zeit
- Cachen Sie Resultate wo möglich

### 2. Error Handling
- Implementieren Sie Retry-Logik für 500-Fehler
- Zeigen Sie hilfreiche Fehlermeldungen

### 3. Performance
- Verwenden Sie `limit` Parameter um Resultate zu begrenzen
- Verkürzen Sie Zeiträume bei Timeline-Abfragen

### 4. Datenqualität
- Nicht alle Kombinationen existieren (z.B. nicht alle Versicherer in allen Kantonen)
- Prüfen Sie immer `count` im Response

---

## 🔧 Entwickler-Tipps

### Versicherer-IDs finden

Die API akzeptiert flexible ID-Formate:
- Numerisch: "8", "1318", "62"
- Mit führenden Nullen: "0008", "0062"
- Name: "CSS", "Assura", "Helsana"

### Franchise-Werte

Alle 11 Franchisen sind verfügbar:
0, 100, 200, 300, 400, 500, 600, 1000, 1500, 2000, 2500

**Wichtig:** Als String übergeben (z.B. `"2500"` nicht `2500`)

### Model Types

- **standard:** Freie Arztwahl, höchste Prämie
- **hmo:** HMO-Modell, 15-25% günstiger
- **telmed:** Telefonische Erstberatung, 10-20% günstiger
- **family_doctor:** Hausarzt-Modell, 10-20% günstiger
- **diverse:** Sonstige Modelle

---

**Für technische Details siehe:** `openapi-chatgpt-historical.yaml`
