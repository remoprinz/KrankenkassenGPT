# SwissHealth MCP Server

**Agent-Native MCP Server für Schweizer Krankenkassen-Prämien**

Ein spezialisierter MCP-Server, der KI-Agenten direkten Zugriff auf 1.6 Millionen Schweizer Krankenkassen-Prämien gibt. Designed nach den Prinzipien des "Agent-Native Design" - keine rohen Datenbank-Dumps, sondern intelligente, vorverarbeitete Tools.

## Features

- **7 spezialisierte Tools** statt generischem Datenbank-Zugriff
- **Intent over Resource**: Tools bilden komplette Aufgaben ab
- **Automatische Chart-Generierung** via QuickChart
- **Vorvalidierte Parameter** mit hilfreichen Fehlermeldungen
- **10 Jahre historische Daten** (2016-2026)

## Tools

| Tool | Beschreibung |
|------|--------------|
| `lookup_region` | PLZ → Kanton/Region Lookup |
| `get_premium_quote` | Aktuelle Prämien suchen (2026) |
| `get_cheapest_premiums` | Günstigste für Profile finden |
| `get_premium_timeline` | Preisentwicklung über Jahre |
| `get_premium_inflation` | Inflationsrate berechnen |
| `compare_years` | Zwei Jahre vergleichen |
| `get_premium_ranking` | Langzeit-Ranking der günstigsten |

## Installation

```bash
cd src-mcp
npm install
npm run build
```

## Konfiguration

Setze diese Umgebungsvariablen:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## Verwendung mit Claude Desktop

Füge zu `~/Library/Application Support/Claude/claude_desktop_config.json` hinzu:

```json
{
  "mcpServers": {
    "swisshealth": {
      "command": "node",
      "args": ["/path/to/swisshealth-api/src-mcp/build/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key"
      }
    }
  }
}
```

## Verwendung mit Cursor

Füge zu `.cursor/mcp.json` im Projekt hinzu:

```json
{
  "mcpServers": {
    "swisshealth": {
      "command": "node",
      "args": ["./src-mcp/build/index.js"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

## Unterschied zum "alten" MCP-Server

| Alt (Supabase Adapter) | Neu (Agent-Native) |
|------------------------|-------------------|
| Generischer DB-Zugriff | Spezialisierte Tools |
| KI muss SQL verstehen | KI nennt nur Intent |
| Rohe JSON-Dumps | Vorverarbeitete Resultate |
| Keine Charts | Automatische Visualisierungen |
| Hohe Fehlerquote | Validierung & Elicitation |

## Architektur

```
src-mcp/
├── src/
│   ├── index.ts         # MCP Server + Tool Handlers
│   ├── config.ts        # Konfiguration, Profile, Kantone
│   ├── chart-service.ts # QuickChart Integration
│   ├── id-mapping.ts    # Versicherer-ID Normalisierung
│   └── insurer-names.ts # Name-Mappings
├── build/               # Kompilierte JS-Dateien
├── package.json
└── tsconfig.json
```

## Datenquelle

- **BAG Priminfo 2026** (Bundesamt für Gesundheit)
- **1.6 Millionen Einträge**
- **51 Versicherer**
- **Alle Kantone, Franchisen, Modelle**

## Lizenz

MIT - siehe LICENSE
