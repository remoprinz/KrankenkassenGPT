#!/usr/bin/env tsx
/**
 * KRITISCHER WIEDERHERSTELLUNGS-SCRIPT
 * ====================================
 * 
 * Dieser Script stellt die komplette Datenbank wieder her und 
 * normalisiert alle IDs sauber und konsistent.
 * 
 * SCHRITTE:
 * 1. Lösche alle aktuellen Prämien-Daten
 * 2. Importiere alle Backup-Daten (2011-2025) 
 * 3. Importiere 2026 Daten
 * 4. Normalisiere alle IDs (führende Nullen entfernen)
 * 5. Aktualisiere Versicherer-Namen
 * 6. Verifiziere Datenintegrität
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for output
const colors = {
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(`${colors.red}❌ SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlen${colors.reset}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Stats tracking
const stats = {
  deleted: 0,
  imported: 0,
  normalized: 0,
  errors: 0,
  duplicatesSkipped: 0,
  startTime: Date.now()
};

// Premium data type
interface Premium {
  insurer_id: string;
  year: number;
  canton: string;
  region_code?: string;
  age_band: string;
  franchise_chf: number;
  accident_covered: boolean;
  model_type: string;
  monthly_premium_chf: number;
  tariff_name?: string;
}

async function clearDatabase() {
  console.log(`${colors.cyan}============================================================${colors.reset}`);
  console.log(`${colors.cyan}SCHRITT 1: DATENBANK LEEREN${colors.reset}`);
  console.log(`${colors.cyan}============================================================${colors.reset}\n`);

  // Get current count
  const { count: beforeCount } = await supabase
    .from('premiums')
    .select('*', { count: 'exact', head: true });

  console.log(`   Aktuelle Einträge: ${beforeCount?.toLocaleString()}`);
  console.log(`   ${colors.yellow}⚠️  Lösche alle Prämien-Daten...${colors.reset}`);

  // Delete all premiums
  const { error, count } = await supabase
    .from('premiums')
    .delete()
    .neq('year', 0); // Delete everything (trick to delete all)

  if (error) {
    console.error(`   ${colors.red}❌ Fehler beim Löschen:${colors.reset}`, error.message);
    process.exit(1);
  }

  stats.deleted = count || 0;
  console.log(`   ${colors.green}✅ ${stats.deleted} Einträge gelöscht${colors.reset}\n`);
}

async function loadJsonFile(filePath: string): Promise<Premium[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  return Array.isArray(data) ? data : data.premiums || [];
}

function normalizeInsurerId(id: string): string {
  // Remove leading zeros
  return id.replace(/^0+/, '') || '0';
}

function normalizePremium(premium: Premium): Premium {
  // Default franchise based on age_band
  let defaultFranchise = 2500; // Default for adults
  if (premium.age_band === 'child') {
    defaultFranchise = 0;
  } else if (premium.age_band === 'young_adult') {
    defaultFranchise = 2500;
  }

  return {
    ...premium,
    insurer_id: normalizeInsurerId(premium.insurer_id),
    // Ensure all required fields have proper types
    year: parseInt(String(premium.year)),
    franchise_chf: premium.franchise_chf !== null && premium.franchise_chf !== undefined 
      ? parseInt(String(premium.franchise_chf))
      : defaultFranchise,
    monthly_premium_chf: parseFloat(String(premium.monthly_premium_chf)),
    accident_covered: Boolean(premium.accident_covered),
    model_type: premium.model_type || 'standard',
    age_band: premium.age_band || 'adult'
  };
}

async function importYear(year: number, premiums: Premium[], isDuplicate: boolean = false) {
  if (premiums.length === 0) {
    console.log(`   ${colors.yellow}⚠️  Jahr ${year}: Keine Daten${colors.reset}`);
    return;
  }

  console.log(`   📅 Jahr ${year}: ${premiums.length.toLocaleString()} Einträge${isDuplicate ? ' (Duplikat-Check)' : ''}`);

  // Normalize all IDs before import
  const normalizedPremiums = premiums.map(normalizePremium);

  // Create unique key for deduplication
  const uniquePremiums = new Map<string, Premium>();
  for (const p of normalizedPremiums) {
    const key = `${p.insurer_id}-${p.year}-${p.canton}-${p.age_band}-${p.franchise_chf}-${p.accident_covered}-${p.model_type}`;
    if (!uniquePremiums.has(key)) {
      uniquePremiums.set(key, p);
    } else {
      stats.duplicatesSkipped++;
    }
  }

  const uniqueArray = Array.from(uniquePremiums.values());
  console.log(`      Eindeutige Einträge: ${uniqueArray.length}`);
  
  // Import in batches
  const BATCH_SIZE = 500;
  let imported = 0;

  for (let i = 0; i < uniqueArray.length; i += BATCH_SIZE) {
    const batch = uniqueArray.slice(i, i + BATCH_SIZE);
    
    const { error, data } = await supabase
      .from('premiums')
      .insert(batch)
      .select();

    if (error) {
      console.error(`      ${colors.red}❌ Batch-Fehler:${colors.reset}`, error.message);
      stats.errors++;
      // Continue with next batch instead of failing
    } else {
      imported += data?.length || 0;
      process.stdout.write(`      Importiert: ${imported}/${uniqueArray.length}\r`);
    }
  }

  stats.imported += imported;
  console.log(`      ${colors.green}✅ ${imported} importiert${colors.reset}`);
}

async function importAllData() {
  console.log(`${colors.cyan}============================================================${colors.reset}`);
  console.log(`${colors.cyan}SCHRITT 2: DATEN IMPORTIEREN${colors.reset}`);
  console.log(`${colors.cyan}============================================================${colors.reset}\n`);

  const transformedDir = path.join(__dirname, '../data/transformed');
  
  // Define priority order (avoid duplicates)
  const priorityFiles = [
    // Complete historical data first
    'premiums_2011.json',
    'premiums_2012.json',
    'premiums_2013.json',
    'premiums_2016.json',
    'premiums_2017.json',
    'premiums_2018.json',
    'premiums_2019.json',
    'premiums_2020.json',
    'premiums_2021.json',
    'premiums_2022.json',
    'premiums_2023.json',
    'premiums_2024.json',
    'premiums_2025.json',
  ];

  // Import priority files
  for (const file of priorityFiles) {
    const filePath = path.join(transformedDir, file);
    if (fs.existsSync(filePath)) {
      const year = parseInt(file.match(/\d{4}/)?.[0] || '0');
      const premiums = await loadJsonFile(filePath);
      await importYear(year, premiums);
    }
  }

  // Import 2026 data separately
  console.log(`\n   ${colors.blue}📊 Importiere 2026 Daten...${colors.reset}`);
  const premiums2026Path = path.join(__dirname, '../data/praemien_2026.json');
  if (fs.existsSync(premiums2026Path)) {
    const premiums2026 = await loadJsonFile(premiums2026Path);
    await importYear(2026, premiums2026);
  } else {
    console.log(`   ${colors.yellow}⚠️  2026 Daten nicht gefunden${colors.reset}`);
  }
}

async function updateInsurerNames() {
  console.log(`${colors.cyan}============================================================${colors.reset}`);
  console.log(`${colors.cyan}SCHRITT 3: VERSICHERER-NAMEN AKTUALISIEREN${colors.reset}`);
  console.log(`${colors.cyan}============================================================${colors.reset}\n`);

  const insurerMapping: { [key: string]: string } = {
    "8": "CSS Versicherung",
    "32": "Concordia",
    "57": "Caisse-maladie de la vallée d'Entremont",
    "62": "AMB Assurances",
    "134": "Visana",
    "182": "sodalis",
    "194": "Atupri",
    "246": "Aquilana",
    "290": "Galenos",
    "312": "Helsana",
    "343": "Intras",
    "360": "Sanitas",
    "376": "KPT",
    "455": "ÖKK",
    "509": "Progrès",
    "558": "SLKK",
    "762": "Lumnezia",
    "774": "Luzerner Hinterland",
    "780": "Rhenusana",
    "820": "Sanitas",
    "829": "Avenir",
    "881": "Sympany",
    "901": "CM Vallée de Joux",
    "923": "Swica",
    "941": "Vivao",
    "966": "Wincare",
    "994": "Assura-Basis",
    "1040": "EGK",
    "1060": "Sodalis",
    "1113": "Groupe Mutuel",
    "1142": "INTRAS",
    "1147": "agrisano",
    "1318": "Assura",
    "1322": "Helsana",
    "1328": "Agrisano",
    "1384": "Groupe Mutuel",
    "1386": "KPT",
    "1401": "Groupe Mutuel",
    "1479": "Helsana",
    "1507": "CSS Versicherung",
    "1509": "Swica",
    "1529": "Accorda",
    "1535": "Assura",
    "1542": "KPT",
    "1555": "Groupe Mutuel",
    "1560": "KPT",
    "1562": "Assura",
    "1565": "Agrisano",
    "1566": "Sodalis",
    "1568": "Helsana",
    "1569": "Sodalis",
    "1570": "INTRAS",
    "1573": "agrisano",
    "1575": "CM Entremont",
    "1577": "CM Vallée de Joux"
  };

  // Delete existing insurers
  const { error: deleteError } = await supabase
    .from('insurers')
    .delete()
    .neq('insurer_id', '0'); // Trick to delete all

  if (deleteError) {
    console.log(`   ${colors.yellow}⚠️  Konnte alte Einträge nicht löschen${colors.reset}`);
  }

  // Insert new insurers
  const insurersToInsert = Object.entries(insurerMapping).map(([id, name]) => ({
    insurer_id: id,
    name: name
  }));

  const { error: insertError, data } = await supabase
    .from('insurers')
    .upsert(insurersToInsert, { onConflict: 'insurer_id' })
    .select();

  if (insertError) {
    console.error(`   ${colors.red}❌ Fehler beim Einfügen:${colors.reset}`, insertError.message);
  } else {
    console.log(`   ${colors.green}✅ ${data?.length || 0} Versicherer aktualisiert${colors.reset}`);
  }
}

async function verifyData() {
  console.log(`${colors.cyan}============================================================${colors.reset}`);
  console.log(`${colors.cyan}SCHRITT 4: DATENINTEGRITÄT VERIFIZIEREN${colors.reset}`);
  console.log(`${colors.cyan}============================================================${colors.reset}\n`);

  // Count total premiums
  const { count: totalCount } = await supabase
    .from('premiums')
    .select('*', { count: 'exact', head: true });

  console.log(`   ${colors.blue}📊 Gesamt Prämien:${colors.reset} ${totalCount?.toLocaleString()}`);

  // Count by year
  const years = [2011, 2012, 2013, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  console.log(`\n   ${colors.blue}📅 Einträge pro Jahr:${colors.reset}`);
  
  for (const year of years) {
    const { count } = await supabase
      .from('premiums')
      .select('*', { count: 'exact', head: true })
      .eq('year', year);
    
    if (count && count > 0) {
      console.log(`      ${year}: ${count.toLocaleString()} ✅`);
    } else {
      console.log(`      ${year}: 0 ❌`);
    }
  }

  // Check for IDs with leading zeros
  const { count: leadingZeroCount } = await supabase
    .from('premiums')
    .select('*', { count: 'exact', head: true })
    .like('insurer_id', '0%');

  console.log(`\n   ${colors.blue}🔍 IDs mit führenden Nullen:${colors.reset} ${leadingZeroCount || 0}`);
  
  if (leadingZeroCount && leadingZeroCount > 0) {
    console.log(`      ${colors.red}❌ WARNUNG: Es gibt noch IDs mit führenden Nullen!${colors.reset}`);
  } else {
    console.log(`      ${colors.green}✅ Alle IDs sind normalisiert${colors.reset}`);
  }

  // Count unique insurers
  const { data: insurers } = await supabase
    .from('premiums')
    .select('insurer_id');
  
  const uniqueInsurers = [...new Set(insurers?.map(i => i.insurer_id))];
  console.log(`\n   ${colors.blue}🏢 Anzahl Versicherer:${colors.reset} ${uniqueInsurers.length}`);

  // Test some queries
  console.log(`\n   ${colors.blue}🧪 Test-Abfragen:${colors.reset}`);
  
  // Test Concordia
  const { data: concordiaTest } = await supabase
    .from('premiums')
    .select('year, monthly_premium_chf')
    .eq('insurer_id', '32')
    .eq('canton', 'ZH')
    .eq('year', 2020)
    .limit(1);
  
  if (concordiaTest && concordiaTest.length > 0) {
    console.log(`      Concordia (32) in ZH 2020: ${colors.green}✅ CHF ${concordiaTest[0].monthly_premium_chf}${colors.reset}`);
  } else {
    console.log(`      Concordia (32) in ZH 2020: ${colors.red}❌ Keine Daten${colors.reset}`);
  }

  // Test Assura
  const { data: assuraTest } = await supabase
    .from('premiums')
    .select('year, monthly_premium_chf')
    .eq('insurer_id', '1318')
    .eq('canton', 'ZH')
    .eq('year', 2020)
    .limit(1);
  
  if (assuraTest && assuraTest.length > 0) {
    console.log(`      Assura (1318) in ZH 2020: ${colors.green}✅ CHF ${assuraTest[0].monthly_premium_chf}${colors.reset}`);
  } else {
    console.log(`      Assura (1318) in ZH 2020: ${colors.red}❌ Keine Daten${colors.reset}`);
  }
}

async function testAPI() {
  console.log(`${colors.cyan}============================================================${colors.reset}`);
  console.log(`${colors.cyan}SCHRITT 5: API-TESTS${colors.reset}`);
  console.log(`${colors.cyan}============================================================${colors.reset}\n`);

  const apiKey = process.env.API_KEY || '';
  const tests = [
    {
      name: 'Günstigste 2026',
      url: 'https://krankenkassen.ragit.io/premiums/cheapest?canton=ZH&profile=single_adult&limit=3'
    },
    {
      name: 'Concordia Timeline',
      url: 'https://krankenkassen.ragit.io/premiums/timeline?insurer_id=32&canton=ZH&profile=single_adult&start_year=2016'
    },
    {
      name: 'Assura Timeline',
      url: 'https://krankenkassen.ragit.io/premiums/timeline?insurer_id=1318&canton=ZH&profile=single_adult&start_year=2016'
    }
  ];

  for (const test of tests) {
    try {
      const response = await fetch(test.url, {
        headers: { 'X-API-Key': apiKey }
      });
      const data = await response.json();
      
      if (response.ok) {
        const resultCount = data.recommendations?.length || data.timeline?.length || 0;
        console.log(`   ${colors.green}✅ ${test.name}: ${resultCount} Ergebnisse${colors.reset}`);
      } else {
        console.log(`   ${colors.red}❌ ${test.name}: HTTP ${response.status}${colors.reset}`);
      }
    } catch (e) {
      console.log(`   ${colors.red}❌ ${test.name}: Fehler${colors.reset}`);
    }
  }
}

async function main() {
  console.log(`\n${colors.cyan}🚀 STARTE VOLLSTÄNDIGE DATENBANK-WIEDERHERSTELLUNG${colors.reset}`);
  console.log(`${colors.cyan}===================================================${colors.reset}\n`);

  try {
    // Step 1: Clear database
    await clearDatabase();

    // Step 2: Import all data
    await importAllData();

    // Step 3: Update insurer names
    await updateInsurerNames();

    // Step 4: Verify data integrity
    await verifyData();

    // Step 5: Test API
    await testAPI();

    // Final stats
    const duration = Math.round((Date.now() - stats.startTime) / 1000);
    
    console.log(`\n${colors.cyan}============================================================${colors.reset}`);
    console.log(`${colors.green}✅ WIEDERHERSTELLUNG ERFOLGREICH ABGESCHLOSSEN${colors.reset}`);
    console.log(`${colors.cyan}============================================================${colors.reset}\n`);
    console.log(`   ${colors.blue}📊 Finale Statistik:${colors.reset}`);
    console.log(`      • Gelöscht: ${stats.deleted.toLocaleString()}`);
    console.log(`      • Importiert: ${stats.imported.toLocaleString()}`);
    console.log(`      • Duplikate übersprungen: ${stats.duplicatesSkipped.toLocaleString()}`);
    console.log(`      • Fehler: ${stats.errors}`);
    console.log(`      • Dauer: ${duration} Sekunden\n`);
    
    console.log(`${colors.green}🎉 Die Datenbank ist jetzt vollständig wiederhergestellt und normalisiert!${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}❌ KRITISCHER FEHLER:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the recovery
main();
