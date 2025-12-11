#!/usr/bin/env tsx
/**
 * Transform 2026 Daten
 * Verarbeitet data/Praemien_CH_2026.xlsx → data/transformed/premiums_2026.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

interface Premium {
  year: number;
  insurer_id: string;
  canton: string;
  region_code: string;
  age_band: string;
  franchise_chf: number;
  accident_covered: boolean;
  model_type: string;
  monthly_premium_chf: number;
  tariff_name?: string;
}

// Mapping-Funktionen (gleich wie in transform-complete.ts)
function mapAgeBand(code: any): string {
  const str = String(code || '').toUpperCase().trim();
  if (str.includes('AKL-KIN') || str.includes('KIN')) return 'child';
  if (str.includes('AKL-JUG') || str.includes('JUG')) return 'young_adult';
  if (str.includes('AKL-ERW') || str.includes('ERW')) return 'adult';
  return 'adult';
}

function mapFranchise(code: any): number {
  const str = String(code || '').toUpperCase().trim();
  if (str.startsWith('FRA-')) {
    const num = parseInt(str.substring(4));
    if (!isNaN(num)) return num;
  }
  // Fallback auf numerische Werte
  const num = parseInt(String(code));
  if (!isNaN(num)) return num;
  return 2500; // Default
}

function mapAccidentCovered(code: any): boolean {
  const str = String(code || '').toUpperCase().trim();
  return str.includes('MIT') || str === 'MIT-UNF' || str === '1';
}

function mapModelType(code: any, desc: any = ''): string {
  const tarif = String(code || '').toUpperCase();
  const bezeichnung = String(desc || '').toUpperCase();
  
  // WICHTIG: Bezeichnung ZUERST prüfen (genauer als Code!)
  if (bezeichnung.includes('HAUSARZT') || bezeichnung.includes('FAMILY')) return 'family_doctor';
  if (bezeichnung.includes('CALLMED') || bezeichnung.includes('TELMED') || bezeichnung.includes('CALL MED')) return 'telmed';
  if (bezeichnung.includes('GESUNDHEITSPRAXIS') || bezeichnung.includes('HMO')) return 'hmo';
  if (bezeichnung.includes('BASIS') || bezeichnung.includes('GRUND')) return 'standard';
  
  // Dann BAG Tarif-Codes als Fallback
  if (tarif === 'TAR-BASE' || tarif === 'BASE') return 'standard';
  if (tarif === 'TAR-HMO') return 'hmo';
  if (tarif === 'TAR-FAM' || tarif === 'TAR-HA') return 'family_doctor';
  if (tarif === 'TAR-TEL') return 'telmed';
  if (tarif === 'TAR-DIV') return 'diverse';
  if (tarif === 'TAR-HAM') return 'hmo';
  
  return 'standard';
}

function normalizeRegionCode(code: string): string {
  return code.replace('PR-REG ', '').replace('CH0', 'CH01');
}

async function transform2026() {
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}🚀 2026 DATEN TRANSFORMATION${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  const inputFile = path.join(__dirname, '../data/Praemien_CH_2026.xlsx');
  const outputFile = path.join(__dirname, '../data/transformed/premiums_2026.json');

  if (!fs.existsSync(inputFile)) {
    console.error(`${colors.yellow}⚠️  Datei nicht gefunden: ${inputFile}${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.blue}📖 Lese: ${path.basename(inputFile)}${colors.reset}`);
  const workbook = XLSX.read(fs.readFileSync(inputFile), { 
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false
  });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { 
    defval: null,
    raw: false
  });

  console.log(`   📊 ${data.length} Zeilen in Blatt "${sheetName}"\n`);

  const results: Premium[] = [];
  const seen = new Set<string>();
  let validCount = 0;
  let skipCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row: any = data[i];

    if (i > 0 && i % 10000 === 0) {
      process.stdout.write(`\r   ⏳ Verarbeitet: ${i}/${data.length} Zeilen...`);
    }

    // Basisdaten extrahieren
    const insurerId = String(row['Versicherer'] || row['INST'] || '').trim();
    const canton = String(row['Kanton'] || '').trim();
    const regionRaw = String(row['Region'] || '').trim();
    const year = parseInt(String(row['Geschäftsjahr'] || row['Jahr'] || '2026'));
    const premium = parseFloat(String(row['Prämie'] || row['PREMIUM'] || '0'));

    // Validierung
    if (!insurerId || !canton || !premium || premium <= 0) {
      skipCount++;
      continue;
    }

    // Mapping
    const ageBand = mapAgeBand(row['Altersklasse']);
    const franchiseChf = mapFranchise(row['Franchise']);
    const accidentCovered = mapAccidentCovered(row['Unfalleinschluss']);
    const modelType = mapModelType(row['Tariftyp'], row['Tarifbezeichnung']);
    const regionCode = normalizeRegionCode(regionRaw);

    // ID normalisieren (mit führenden Nullen)
    const normalizedId = insurerId.padStart(4, '0');

    const p: Premium = {
      year,
      insurer_id: normalizedId,
      canton,
      region_code: regionCode,
      age_band: ageBand,
      franchise_chf: franchiseChf,
      accident_covered: accidentCovered,
      model_type: modelType,
      monthly_premium_chf: Math.round(premium * 100) / 100,
      tariff_name: row['Tarifbezeichnung']
    };

    // Deduplizierung
    const key = `${p.insurer_id}-${p.canton}-${p.region_code}-${p.age_band}-${p.franchise_chf}-${p.accident_covered}-${p.model_type}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(p);
      validCount++;
    }
  }

  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  console.log(`   ${colors.green}✅ ${validCount} gültige Prämien extrahiert${colors.reset}`);
  console.log(`   ${colors.yellow}📋 ${data.length - validCount} Duplikate entfernt${colors.reset}\n`);

  // Statistiken
  const stats = {
    insurers: new Set(results.map(p => p.insurer_id)),
    cantons: new Set(results.map(p => p.canton)),
    ages: new Set(results.map(p => p.age_band)),
    franchises: new Set(results.map(p => p.franchise_chf)),
    models: new Set(results.map(p => p.model_type))
  };

  console.log(`${colors.blue}📊 STATISTIK:${colors.reset}`);
  console.log(`   🏢 Versicherer: ${stats.insurers.size}`);
  console.log(`   🗺️  Kantone: ${stats.cantons.size}`);
  console.log(`   👤 Altersgruppen: ${Array.from(stats.ages).join(', ')}`);
  console.log(`   💰 Franchisen: ${Array.from(stats.franchises).sort((a, b) => a - b).join(', ')}`);
  console.log(`   📦 Modelle: ${Array.from(stats.models).join(', ')}\n`);

  // Speichern
  fs.writeFileSync(outputFile, JSON.stringify(results));
  console.log(`${colors.green}💾 Gespeichert: ${outputFile}${colors.reset}`);
  console.log(`${colors.green}   ${results.length} Einträge${colors.reset}\n`);

  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✅ 2026 TRANSFORMATION ABGESCHLOSSEN${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

transform2026().catch(console.error);