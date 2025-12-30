# 📜 SCRIPTS DOKUMENTATION

Diese Scripts verwalten den Daten-Pipeline vom BAG bis zur Datenbank.

---

## 📥 DOWNLOAD SCRIPTS

### `download-bag-data.ts`

Lädt aktuelle BAG-Daten (2026) herunter.

```bash
npx tsx scripts/download-bag-data.ts
```

**Download:**
- `Prämien_CH.xlsx` (aktuelle Prämien)
- `Einzugsgebiete.xlsx` (Regionen)

**Output:** `data/`

---

### `download-historical-data.ts`

Lädt historische BAG-Daten (2016-2025) herunter.

```bash
npx tsx scripts/download-historical-data.ts
```

**Download:** Alle Jahre 2016-2025 mit allen Dateien

**Output:** `data/historical/JAHR/`

**Dauer:** ~15-20 Minuten (Downloads sind groß)

---

## 🔄 TRANSFORM SCRIPTS

### `transform-complete.ts`

Transformiert historische Rohdaten (2016-2025) in strukturiertes JSON-Format.

```bash
# Alle Jahre transformieren
npx tsx scripts/transform-complete.ts

# Einzelnes Jahr transformieren
npx tsx scripts/transform-complete.ts 2020
```

**Input:** `data/historical/JAHR/*.xlsx` oder `.csv`

**Output:** `data/transformed/premiums_JAHR.json`

**Features:**
- Mappt BAG-Codes (AKL-ERW → adult, FRA-2500 → 2500, etc.)
- Dedupliziert Einträge (BAG hat Duplikate)
- Normalisiert Versicherer-IDs (8 → 0008)
- Validiert Daten

**Dauer:** ~2-3 Minuten pro Jahr

**Wichtige Mappings:**
- `AKL-KIN` → `child`
- `AKL-JUG` → `young_adult`
- `AKL-ERW` → `adult`
- `FRA-0` bis `FRA-2500` → 0 bis 2500
- `MIT-UNF` → `true`, `OHN-UNF` → `false`
- `TAR-BASE` → `standard`
- `TAR-HAM` → `family_doctor` oder `hmo` (basierend auf Tarifbezeichnung)
- `TAR-DIV` → `diverse` oder `telmed`

---

### `transform-2026.ts`

Transformiert 2026 Daten.

```bash
npx tsx scripts/transform-2026.ts
```

**Input:** `data/Praemien_CH_2026.xlsx`

**Output:** `data/transformed/premiums_2026.json`

**Dauer:** ~30 Sekunden

**Besonderheit:** 2026 liegt direkt in `data/`, nicht in `historical/`

---

## 💾 IMPORT SCRIPTS

### `import-complete-all.ts`

Importiert alle transformierten Daten in Supabase.

```bash
npx tsx scripts/import-complete-all.ts
```

**Features:**
- Löscht alte Daten pro Jahr (um Duplikate zu vermeiden)
- Dedupliziert vor Import
- Import in Batches (Performance)
- Progress-Tracking
- Verifiziert Import (zählt Versicherer)

**Input:** `data/transformed/premiums_*.json`

**Output:** Supabase `premiums` Tabelle

**Dauer:** ~20-25 Minuten für 11 Jahre

**Wichtig:** 
- Stellt sicher dass ALLE Versicherer importiert werden
- Nicht nur ein Teil der Daten

---

## 📍 PLZ-DATENBANK

### `create-complete-plz.ts`

Erstellt vollständige PLZ-Datenbank für Region-Lookup.

```bash
npx tsx scripts/create-complete-plz.ts
```

**Features:**
- 4,226 Postleitzahlen
- Alle 26 Kantone
- Mapping PLZ → Region-Code (CH01, CH02, CH03)

**Output:** Supabase `locations` Tabelle

**Dauer:** ~30 Sekunden

**Nur einmalig nötig!**

---

## 🔧 WORKFLOW

### Erste Einrichtung

```bash
# 1. PLZ-Datenbank (einmalig)
npx tsx scripts/create-complete-plz.ts

# 2. Daten herunterladen
npx tsx scripts/download-historical-data.ts
npx tsx scripts/download-bag-data.ts

# 3. Transformieren
npx tsx scripts/transform-complete.ts
npx tsx scripts/transform-2026.ts

# 4. Importieren
npx tsx scripts/import-complete-all.ts
```

**Total-Dauer:** ~45-60 Minuten

### Jährliche Updates

Wenn BAG neue Daten veröffentlicht (normalerweise September):

```bash
# 1. Download (Jahr anpassen!)
npx tsx scripts/download-bag-data.ts

# 2. Transformieren (Jahr anpassen!)
npx tsx scripts/transform-2026.ts

# 3. Importieren
npx tsx scripts/import-complete-all.ts
```

**Dauer:** ~5 Minuten

---

## ⚙️ KONFIGURATION

### Umgebungsvariablen

Alle Scripts benötigen `.env` im Projekt-Root:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
API_KEY=Ihr-API-Key  # Nur für Test-Scripts
```

### Daten-Verzeichnisse

Scripts erwarten folgende Struktur:

```
data/
├── Praemien_CH_2026.xlsx        # 2026 Rohdaten
├── historical/
│   ├── 2016/*.xlsx              # 2016 Rohdaten
│   ├── 2017/*.xlsx              # 2017 Rohdaten
│   └── ...
└── transformed/
    ├── premiums_2016.json       # Transformiert
    ├── premiums_2017.json
    └── ...
```

---

## 🐛 Troubleshooting

### "Cannot find module 'xlsx'"

```bash
npm install
```

### "SUPABASE_URL is not defined"

Erstellen Sie `.env` Datei im Projekt-Root.

### Transform findet keine Daten

Prüfen Sie ob Dateien in `data/historical/JAHR/` existieren:

```bash
ls -la data/historical/2020/
```

### Import schlägt fehl

Prüfen Sie Supabase-Verbindung:

```bash
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { count } = await supabase
  .from('premiums')
  .select('*', { count: 'exact', head: true });

console.log('Verbindung OK, Einträge:', count);
"
```

---

## 📝 Script-Reihenfolge

**Für Production:**

1. ✅ `create-complete-plz.ts` (einmalig)
2. ✅ `download-historical-data.ts`
3. ✅ `download-bag-data.ts`
4. ✅ `transform-complete.ts`
5. ✅ `transform-2026.ts`
6. ✅ `import-complete-all.ts`

**Für Updates:**

1. ✅ `download-bag-data.ts` (neues Jahr)
2. ✅ Script anpassen für neues Jahr
3. ✅ `import-complete-all.ts`

---

## ⚡ Performance-Tipps

### Transformation beschleunigen

```bash
# Nur ein Jahr transformieren (viel schneller)
npx tsx scripts/transform-complete.ts 2025
```

### Import beschleunigen

Import-Script nutzt bereits Batching und Progress-Tracking - keine weitere Optimierung nötig.

### Memory-Probleme

Falls "Out of Memory" Fehler:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npx tsx scripts/import-complete-all.ts
```

---

**Alle Scripts sind production-ready und enthalten keine hardcoded Secrets!** 🔒
