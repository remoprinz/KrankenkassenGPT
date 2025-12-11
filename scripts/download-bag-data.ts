#!/usr/bin/env tsx
/**
 * BAG Priminfo Daten Download
 * Lädt die offiziellen Excel-Dateien vom BAG Open Data Portal
 * Quelle: https://opendata.swiss/de/dataset/health-insurance-premiums
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');

// BAG Open Data Portal - Offizielle Quellen
// Zuletzt aktualisiert: 23. September 2025
const SOURCES = [
  {
    name: 'Prämien Schweiz 2026',
    url: 'https://www.web.statistik.zh.ch/ogd/daten/ressourcen/KTZH_00002491_00005522.csv',
    filename: 'praemien_ch_2026.xlsx',
    description: 'Alle Krankenversicherungsprämien (15.2 MB)'
  },
  {
    name: 'Einzugsgebiete (PLZ Mapping)',
    url: 'https://www.web.statistik.zh.ch/ogd/daten/ressourcen/KTZH_00002491_00005517.csv',
    filename: 'einzugsgebiete_2026.xlsx',
    description: 'PLZ zu Prämienregion Mapping (188 KB)'
  },
  {
    name: 'Erläuterungen',
    url: 'https://www.web.statistik.zh.ch/ogd/daten/ressourcen/KTZH_00002491_00005523.xlsx',
    filename: 'erlaeuterungen_praemiendaten.xlsx',
    description: 'Dokumentation der Spalten-Struktur (24 KB)'
  }
];

// Fallback: Direkte URLs (falls die obigen nicht funktionieren)
const FALLBACK_BASE = 'https://opendata.swiss/de/dataset/health-insurance-premiums';

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`📥 Downloade: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SwissHealth-API/0.1 (Educational Project)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
    
    const sizeKB = (buffer.byteLength / 1024).toFixed(2);
    console.log(`   ✅ Gespeichert: ${dest} (${sizeKB} KB)`);
  } catch (error: any) {
    console.error(`   ❌ Fehler: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('=' .repeat(80));
  console.log('BAG OPEN DATA DOWNLOAD');
  console.log('Quelle: https://opendata.swiss/de/dataset/health-insurance-premiums');
  console.log('Lizenz: Freie Nutzung. Quellenangabe ist Pflicht.');
  console.log('=' .repeat(80));
  console.log();
  
  // Erstelle Data-Verzeichnis
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`📁 Erstellt: ${DATA_DIR}\n`);
  }
  
  // Download alle Dateien
  for (const source of SOURCES) {
    const destPath = path.join(DATA_DIR, source.filename);
    
    console.log(`📦 ${source.name}`);
    console.log(`   ℹ️  ${source.description}`);
    
    try {
      await downloadFile(source.url, destPath);
    } catch (error) {
      console.error(`\n⚠️  WARNUNG: ${source.name} konnte nicht geladen werden.`);
      console.error(`   URL: ${source.url}`);
      console.error(`   
💡 TIPP: Lade die Datei manuell herunter:`);
      console.error(`   1. Gehe zu: ${FALLBACK_BASE}`);
      console.error(`   2. Suche: "${source.name}"`);
      console.error(`   3. Download → speichere als: ${source.filename}`);
      console.error(`   4. Verschiebe nach: ${DATA_DIR}\n`);
    }
    
    console.log();
  }
  
  console.log('=' .repeat(80));
  console.log('✅ Download abgeschlossen!');
  console.log(`📂 Dateien liegen in: ${DATA_DIR}`);
  console.log();
  console.log('📋 Nächster Schritt:');
  console.log('   npm run parse  # Excel → JSON konvertieren');
  console.log('=' .repeat(80));
}

main().catch(error => {
  console.error('\n❌ FEHLER:', error.message);
  console.error('\n💡 LÖSUNGEN:');
  console.error('   1. Prüfe deine Internet-Verbindung');
  console.error('   2. Lade manuell von opendata.swiss herunter');
  console.error('   3. Lege die Dateien in ./data/');
  process.exit(1);
});
