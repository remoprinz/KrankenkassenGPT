#!/usr/bin/env tsx
/**
 * Transform Complete Historical Data - FIXED VERSION
 * 
 * Verarbeitet ALLE Jahre mit korrektem BAG-Code Mapping
 * Behält ALLE Altersgruppen, Franchisen und Unfalldeckungs-Optionen
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data/historical');
const OUTPUT_DIR = path.join(__dirname, '../data/transformed');

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
}

// Farben für Console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * BAG Franchise Code Mapping
 * Maps BAG codes like 'FRA-300' to numeric values
 */
function mapFranchise(code: any): number {
  const str = String(code || '').toUpperCase().trim();
  
  // BAG Codes (FRA-X) - extrahiere Zahl nach FRA-
  if (str.startsWith('FRA-')) {
    const num = parseInt(str.substring(4));
    if (!isNaN(num)) {
      return num;
    }
  }
  
  // Direkte Mappings als Fallback
  if (str === 'FRA-0' || str === '0') return 0;
  if (str === 'FRA-100') return 100;
  if (str === 'FRA-200') return 200;
  if (str === 'FRA-300') return 300;
  if (str === 'FRA-400') return 400;
  if (str === 'FRA-500') return 500;
  if (str === 'FRA-600') return 600;
  if (str === 'FRA-1000') return 1000;
  if (str === 'FRA-1500') return 1500;
  if (str === 'FRA-2000') return 2000;
  if (str === 'FRA-2500') return 2500;
  
  // FRAST Mappings (Franchise-Stufen)
  if (str === 'FRAST1') return 0;    // Kinder: Stufe 1 = 0
  if (str === 'FRAST2') return 100;  // Kinder: Stufe 2 = 100
  if (str === 'FRAST3') return 200;  // Kinder: Stufe 3 = 200
  if (str === 'FRAST4') return 300;  // Erwachsene: Stufe 4 = 300
  if (str === 'FRAST5') return 500;  // Erwachsene: Stufe 5 = 500
  if (str === 'FRAST6') return 1000; // Erwachsene: Stufe 6 = 1000
  if (str === 'FRAST7') return 2500; // Erwachsene: Stufe 7 = 2500
  
  // Numerische Werte
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (!isNaN(num) && num >= 0 && num <= 2500) {
    return num;
  }
  
  // Default
  console.log(`   ⚠️  Unbekannte Franchise: "${code}" -> 2500`);
  return 2500;
}

/**
 * BAG Altersklassen Mapping
 * Maps BAG codes to our age bands
 */
function mapAgeBand(code: any): string {
  const str = String(code || '').toUpperCase();
  
  // BAG Codes (AKL-X)
  if (str === 'AKL-KIN' || str.includes('AKL-KIN')) return 'child';
  if (str === 'AKL-JUG' || str.includes('AKL-JUG')) return 'young_adult';
  if (str === 'AKL-ERW' || str.includes('AKL-ERW')) return 'adult';
  
  // Alternative Codes
  if (str === 'K' || str === 'K1' || str === 'KIN' || str === 'KIND') return 'child';
  if (str === 'J' || str === 'J1' || str === 'JUN' || str === 'JUNG') return 'young_adult';
  if (str === 'E' || str === 'E1' || str === 'ERW') return 'adult';
  
  // Altersbasiert
  if (str === '0' || str === '00' || str === 'CHD') return 'child';
  if (str === '19' || str === '26' || str === 'YNG') return 'young_adult';
  
  // Default
  console.log(`   ⚠️  Unbekannte Altersklasse: "${code}" -> adult`);
  return 'adult';
}

/**
 * BAG Unfalldeckung Mapping
 * Maps BAG codes to boolean
 */
function mapAccidentCovered(code: any): boolean {
  const str = String(code || '').toUpperCase();
  
  // BAG Codes - WICHTIG: OHN-UNF nicht OHNE-UNF!
  if (str === 'MIT-UNF' || str === 'MIT UNF') return true;
  if (str === 'OHN-UNF' || str === 'OHNE-UNF' || str === 'OHNE UNF') return false;
  
  // Alternative Codes
  if (str === 'UNF-JA' || str === 'JA' || str === '1' || str === 'Y') return true;
  if (str === 'UNF-NEIN' || str === 'NEIN' || str === '0' || str === 'N') return false;
  if (str.includes('MIT') || str.includes('INCL')) return true;
  if (str.includes('OHN') || str.includes('OHNE') || str.includes('EXCL')) return false;
  
  // Default: mit Unfall
  return true;
}

/**
 * BAG Modell-Typ Mapping
 * Maps BAG codes to model types
 * WICHTIG: Bezeichnung VOR Code prüfen (TAR-HAM kann HMO oder Hausarzt sein!)
 */
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
  if (tarif === 'TAR-HAM') return 'hmo'; // Default für TAR-HAM wenn Bezeichnung nicht eindeutig
  
  // Default
  return 'standard';
}

/**
 * Verarbeite CSV-Datei (für ältere Jahre)
 */
function processCSV(filePath: string, year: number): Premium[] {
  console.log(`   📄 Verarbeite CSV: ${path.basename(filePath)}`);
  const fileSize = fs.statSync(filePath).size / (1024 * 1024);
  console.log(`      Dateigröße: ${fileSize.toFixed(1)} MB`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Versuche verschiedene Delimiter
  let records: any[] = [];
  const delimiters = [';', ',', '\t'];
  
  for (const delimiter of delimiters) {
    try {
      records = parse(content, {
        columns: true,
        delimiter,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
        from_line: 1,
        max_record_size: 1048576
      });
      if (records.length > 1000) break; // Erfolgreich
    } catch {
      continue;
    }
  }
  
  console.log(`      📊 ${records.length} Zeilen gefunden`);
  
  const results: Premium[] = [];
  const seen = new Set<string>();
  let validCount = 0;
  let skipCount = 0;
  let duplicateCount = 0;
  
  // Process in batches
  const batchSize = 10000;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, Math.min(i + batchSize, records.length));
    
    for (const row of batch) {
      try {
        // Flexibles Spalten-Mapping
        const insurerId = row['Versicherer'] || row['G_ID'] || row['INST'] || row['Code'] || '';
        const canton = row['Kanton'] || row['C_ID'] || row['KT'] || row['CANTON'] || '';
        const region = row['Region'] || row['R_ID'] || row['PR'] || row['Prämienregion'] || '0';
        const ageCode = row['Altersklasse'] || row['V2_TYP'] || row['AKL'] || row['ALTER'] || row['Age'] || '';
        // WICHTIG: "Franchise" zuerst (enthält FRA-X Codes), dann Fallbacks
        const franchiseCode = row['Franchise'] || row['FRA'] || row['Franchisestufe'] || row['FRANCHISE'] || '';
        const accidentCode = row['Unfalleinschluss'] || row['UNF'] || row['Unfall'] || '';
        const modelCode = row['Tariftyp'] || row['Tarif'] || row['V_TYP'] || '';
        const modelDesc = row['Tarifbezeichnung'] || row['V_KBEZ'] || row['Bezeichnung'] || '';
        const premium = parseFloat(row['Prämie'] || row['PRAEMIE'] || row['Premium'] || row['Monatsprämie'] || '0');
        
        // Validierung
        if (!insurerId || !canton || premium <= 0 || premium > 3000) {
          skipCount++;
          continue;
        }
        
        const p: Premium = {
          year,
          insurer_id: String(insurerId).padStart(4, '0'),
          canton: String(canton).toUpperCase().slice(0, 2),
          region_code: String(region).padStart(2, '0'),
          age_band: mapAgeBand(ageCode),
          franchise_chf: mapFranchise(franchiseCode),
          accident_covered: mapAccidentCovered(accidentCode),
          model_type: mapModelType(modelCode, modelDesc),
          monthly_premium_chf: Math.round(premium * 100) / 100
        };
        
        // Deduplizierung mit ALLEN Dimensionen
        const key = `${p.insurer_id}-${p.canton}-${p.region_code}-${p.age_band}-${p.franchise_chf}-${p.accident_covered}-${p.model_type}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(p);
          validCount++;
        } else {
          duplicateCount++;
        }
        
      } catch (e) {
        skipCount++;
      }
    }
    
    if ((i + batchSize) < records.length) {
      process.stdout.write(`\r      ⏳ Verarbeitet: ${Math.min(i + batchSize, records.length)}/${records.length} Zeilen...`);
    }
  }
  
  if (records.length > batchSize) {
    process.stdout.write('\r');
  }
  
  console.log(`      ✅ ${validCount} gültige Prämien extrahiert`);
  if (duplicateCount > 0) {
    console.log(`      📋 ${duplicateCount} echte Duplikate entfernt`);
  }
  if (skipCount > 0) {
    console.log(`      ⚠️  ${skipCount} ungültige Zeilen übersprungen`);
  }
  
  return results;
}

/**
 * Verarbeite Excel-Datei (für neuere Jahre)
 */
function processExcel(filePath: string, year: number): Premium[] {
  console.log(`   📄 Verarbeite Excel: ${path.basename(filePath)}`);
  const fileSize = fs.statSync(filePath).size / (1024 * 1024);
  console.log(`      Dateigröße: ${fileSize.toFixed(1)} MB`);
  
  const workbook = XLSX.read(fs.readFileSync(filePath), { 
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false
  });
  
  // Finde das richtige Blatt
  let sheetName = workbook.SheetNames.find(s => 
    s.toLowerCase().includes('export') ||
    s.toLowerCase().includes('prämien') ||
    s.toLowerCase().includes('praemien') ||
    s.toLowerCase().includes('premium') ||
    s.toLowerCase().includes('ch')
  ) || workbook.SheetNames[0];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { 
    defval: null,
    raw: true 
  });
  
  console.log(`      📊 ${data.length} Zeilen in Blatt "${sheetName}"`);
  
  const results: Premium[] = [];
  const seen = new Set<string>();
  let validCount = 0;
  let skipCount = 0;
  let duplicateCount = 0;
  
  // Stats für Debug
  const stats = {
    ages: new Set<string>(),
    franchises: new Set<number>(),
    accidents: new Set<boolean>(),
    models: new Set<string>()
  };
  
  // Process in batches
  const batchSize = 10000;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, Math.min(i + batchSize, data.length));
    
    for (const row of batch) {
      try {
        // EXAKTES Spalten-Mapping (nicht includes, sondern equals!)
          const rowData = row as any;
        
        const insurerId = rowData['Versicherer'] || rowData['INST'] || rowData['CODE'] || rowData['G_ID'] || rowData['VersNr'];
        const canton = rowData['Kanton'] || rowData['KT'] || rowData['CANTON'] || rowData['C_ID'];
        const region = rowData['Region'] || rowData['REGION'] || rowData['PR'] || rowData['R_ID'] || rowData['Prämienregion'] || '0';
        const ageCode = rowData['Altersklasse'] || rowData['ALTER'] || rowData['AKL'] || rowData['AGE'] || rowData['V2_TYP'];
        // KRITISCH: NUR "Franchise" Spalte (enthält FRA-1500), NICHT "Franchisestufe" (enthält FRAST4)!
        const franchiseCode = rowData['Franchise'] || rowData['FRA'];
        const accidentCode = rowData['Unfalleinschluss'] || rowData['Unfall'] || rowData['UNF'] || rowData['ACCIDENT'];
        // KRITISCH: "Tarif-Typ" (2016) und "Tariftyp" (2017+) sind unterschiedlich!
        const modelCode = rowData['Tariftyp'] || rowData['Tarif-Typ'] || rowData['Tarif'] || rowData['TARIF'] || rowData['MODEL'] || rowData['V_TYP'];
        const modelDesc = rowData['Tarifbezeichnung'] || rowData['Bezeichnung'] || rowData['V_KBEZ'] || rowData['Description'];
        const premium = parseFloat(rowData['Prämie'] || rowData['PRÄMIE'] || rowData['PRAEMIE'] || rowData['PREMIUM'] || rowData['Monatsprämie'] || '0');
        
        if (!insurerId || !canton || premium <= 0 || premium > 3000) {
          skipCount++;
          continue;
        }
        
        const p: Premium = {
          year,
          insurer_id: String(insurerId).padStart(4, '0'),
          canton: String(canton).toUpperCase().slice(0, 2),
          region_code: String(region).padStart(2, '0'),
          age_band: mapAgeBand(ageCode),
          franchise_chf: mapFranchise(franchiseCode),
          accident_covered: mapAccidentCovered(accidentCode),
          model_type: mapModelType(modelCode, modelDesc),
          monthly_premium_chf: Math.round(premium * 100) / 100
        };
        
        // Sammle Stats
        stats.ages.add(p.age_band);
        stats.franchises.add(p.franchise_chf);
        stats.accidents.add(p.accident_covered);
        stats.models.add(p.model_type);
        
        // Deduplizierung mit ALLEN Dimensionen
        const key = `${p.insurer_id}-${p.canton}-${p.region_code}-${p.age_band}-${p.franchise_chf}-${p.accident_covered}-${p.model_type}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(p);
          validCount++;
        } else {
          duplicateCount++;
        }
        
      } catch (e) {
        skipCount++;
      }
    }
    
    if ((i + batchSize) < data.length) {
      process.stdout.write(`\r      ⏳ Verarbeitet: ${Math.min(i + batchSize, data.length)}/${data.length} Zeilen...`);
    }
  }
  
  if (data.length > batchSize) {
    process.stdout.write('\r');
  }
  
  console.log(`      ✅ ${validCount} gültige Prämien extrahiert`);
  console.log(`      📊 Altersgruppen: ${Array.from(stats.ages).join(', ')}`);
  console.log(`      💰 Franchisen: ${Array.from(stats.franchises).sort((a,b) => a-b).join(', ')}`);
  console.log(`      🛡️  Unfalldeckung: ${Array.from(stats.accidents).map(b => b ? 'mit' : 'ohne').join(', ')}`);
  console.log(`      📦 Modelle: ${Array.from(stats.models).join(', ')}`);
  
  if (duplicateCount > 0) {
    console.log(`      📋 ${duplicateCount} echte Duplikate entfernt`);
  }
  if (skipCount > 0) {
    console.log(`      ⚠️  ${skipCount} ungültige Zeilen übersprungen`);
  }
  
  return results;
}

/**
 * Verarbeite ein Jahr
 */
function processYear(year: number): Premium[] {
  const yearDir = path.join(DATA_DIR, year.toString());
  
  if (!fs.existsSync(yearDir)) {
    console.log(`   ⚠️  Keine Daten für Jahr ${year}`);
    return [];
  }
  
  // Priorität: Excel vor CSV (Excel ist konsistenter)
  const files = fs.readdirSync(yearDir);
  
  // Suche zuerst nach Excel-Dateien
  const excelFile = files.find(f => {
    const name = f.toLowerCase();
    return (
      name.includes('mien_ch') &&
      (name.endsWith('.xlsx') || name.endsWith('.xls')) &&
      !name.includes('cheu') &&
      !name.includes('gltig')
    );
  });
  
  if (excelFile) {
    const filePath = path.join(yearDir, excelFile);
    return processExcel(filePath, year);
  }
  
  // Fallback auf CSV wenn kein Excel
  const csvFile = files.find(f => {
    const name = f.toLowerCase();
    return (
      name.includes('mien_ch') &&
      name.endsWith('.csv') &&
      !name.includes('cheu')
    );
  });
  
  if (csvFile) {
    const filePath = path.join(yearDir, csvFile);
    return processCSV(filePath, year);
  }
  
  console.log(`   ⚠️  Keine Prämien-Datei gefunden`);
  return [];
}

/**
 * Main Process
 */
async function main() {
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}🚀 FIXED TRANSFORMATION - ALLE DIMENSIONEN${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Wenn ein Jahr als Argument übergeben wurde, nur dieses verarbeiten
  const yearArg = process.argv[2];
  const years = yearArg 
    ? [parseInt(yearArg)]
    : fs.readdirSync(DATA_DIR)
        .filter(d => /^\d{4}$/.test(d))
        .map(d => parseInt(d))
        .sort((a, b) => a - b);
  
  console.log(`${colors.blue}📅 Zu verarbeitende Jahre: ${years.join(', ')}${colors.reset}\n`);
  
  const allData: Premium[] = [];
  const stats: any = {};
  
  for (const year of years) {
    console.log(`${colors.cyan}📅 Jahr ${year}:${colors.reset}`);
    
    const startTime = Date.now();
    const yearData = processYear(year);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (yearData.length > 0) {
      // Verwende for-Schleife statt spread bei großen Arrays
      for (const item of yearData) {
        allData.push(item);
      }
      
      // Speichere Jahr einzeln (ohne Pretty-Print bei großen Dateien)
      const yearFile = path.join(OUTPUT_DIR, `premiums_${year}.json`);
      // Bei großen Dateien (>50k Einträge) ohne Pretty-Print speichern
      if (yearData.length > 50000) {
        fs.writeFileSync(yearFile, JSON.stringify(yearData));
      } else {
        fs.writeFileSync(yearFile, JSON.stringify(yearData, null, 2));
      }
      
      stats[year] = {
        count: yearData.length,
        duration: duration + 's',
        size: (fs.statSync(yearFile).size / 1024).toFixed(0) + ' KB'
      };
      
      console.log(`   ${colors.green}💾 Gespeichert: ${yearData.length} Einträge (${duration}s)${colors.reset}\n`);
    } else {
      stats[year] = { count: 0, duration: duration + 's', size: '0 KB' };
      console.log(`   ${colors.yellow}⚠️  Keine Daten${colors.reset}\n`);
    }
  }
  
  // Speichere kombinierte Datei (nur wenn alle Jahre verarbeitet wurden)
  if (!yearArg && allData.length > 0) {
    console.log(`${colors.cyan}📦 Erstelle kombinierte Datei...${colors.reset}`);
    const combinedFile = path.join(OUTPUT_DIR, 'premiums_all_years_complete.json');
    // Ohne Pretty-Print bei großen Dateien
    fs.writeFileSync(combinedFile, JSON.stringify(allData));
    const combinedSize = (fs.statSync(combinedFile).size / (1024 * 1024)).toFixed(1);
    console.log(`   ${colors.green}✅ Gespeichert: ${combinedSize} MB${colors.reset}\n`);
  }
  
  // Statistik-Tabelle
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✅ TRANSFORMATION ABGESCHLOSSEN${colors.reset}\n`);
  console.log(`${colors.blue}📊 STATISTIK:${colors.reset}`);
  console.log('─'.repeat(40));
  
  Object.entries(stats).forEach(([year, data]: [string, any]) => {
    const bar = '█'.repeat(Math.ceil(data.count / 5000));
    console.log(`  ${year}: ${String(data.count).padStart(7)} Einträge ${bar}`);
  });
  
  console.log('─'.repeat(40));
  console.log(`  TOTAL: ${colors.green}${allData.length} Prämien-Einträge${colors.reset}`);
  
  // Zusammenfassung
  const successYears = Object.values(stats).filter((s: any) => s.count > 0).length;
  const failedYears = years.length - successYears;
  
  console.log(`\n${colors.blue}📈 ZUSAMMENFASSUNG:${colors.reset}`);
  console.log(`   • Erfolgreiche Jahre: ${successYears}/${years.length}`);
  if (failedYears > 0) {
    console.log(`   • Fehlgeschlagene Jahre: ${failedYears}`);
  }
  console.log(`   • Gesamtdatensätze: ${allData.length}`);
  console.log(`   • Output-Verzeichnis: ${OUTPUT_DIR}`);
  
  if (yearArg) {
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}🚀 Nächster Schritt:${colors.reset}`);
    console.log(`   Wenn die Daten gut aussehen, transformiere alle Jahre:`);
    console.log(`   ${colors.green}npx tsx scripts/transform-complete-fixed.ts${colors.reset}\n`);
  } else {
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}🚀 Nächster Schritt:${colors.reset}`);
    console.log(`   ${colors.green}npm run import:complete${colors.reset}\n`);
  }
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}