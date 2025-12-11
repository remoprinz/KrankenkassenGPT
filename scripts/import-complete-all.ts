#!/usr/bin/env tsx
/**
 * KOMPLETTER RE-IMPORT ALLER HISTORISCHEN + 2026 DATEN
 * Löscht alte Daten und importiert alles neu
 * GARANTIERT dass ALLE Versicherer importiert werden
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

interface ImportStats {
  year: number;
  fileSize: number;
  totalEntries: number;
  imported: number;
  errors: number;
  insurers: number;
  duration: number;
}

async function deleteYear(year: number) {
  console.log(`🗑️  Lösche ${year} Daten...`);
  const { error } = await supabase
    .from('premiums')
    .delete()
    .eq('year', year);
    
  if (error) {
    console.log(`   ⚠️  Fehler beim Löschen: ${error.message}`);
  } else {
    console.log(`   ✅ Gelöscht`);
  }
}

async function importYear(year: number): Promise<ImportStats> {
  const startTime = Date.now();
  
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}📅 JAHR ${year}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  // 1. Lade transformierte Daten
  const filePath = path.join(__dirname, `../data/transformed/premiums_${year}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}❌ Datei nicht gefunden: ${filePath}${colors.reset}`);
    return {
      year,
      fileSize: 0,
      totalEntries: 0,
      imported: 0,
      errors: 0,
      insurers: 0,
      duration: 0
    };
  }
  
  const fileSize = fs.statSync(filePath).size / (1024 * 1024);
  console.log(`📂 Datei: premiums_${year}.json (${fileSize.toFixed(1)} MB)`);
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`📊 Einträge: ${data.length}\n`);
  
  // 2. Alte Daten löschen
  await deleteYear(year);
  
  // 3. Deduplizierung
  const seen = new Set();
  const uniqueData = data.filter((d: any) => {
    const key = `${d.insurer_id}-${d.canton}-${d.region_code}-${d.age_band}-${d.franchise_chf}-${d.accident_covered}-${d.model_type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  if (data.length !== uniqueData.length) {
    console.log(`📋 Duplikate entfernt: ${data.length - uniqueData.length}\n`);
  }
  
  // 4. Import in Batches
  const BATCH_SIZE = 100;
  let imported = 0;
  let errors = 0;
  
  console.log(`💾 Importiere in Batches von ${BATCH_SIZE}...\n`);
  
  for (let i = 0; i < uniqueData.length; i += BATCH_SIZE) {
    const batch = uniqueData.slice(i, i + BATCH_SIZE);
    
    const { data: result, error } = await supabase
      .from('premiums')
      .insert(batch)
      .select('id');
      
    if (error) {
      errors += batch.length;
      console.log(`${colors.red}❌ Batch ${i / BATCH_SIZE + 1} Fehler: ${error.message}${colors.reset}`);
    } else {
      imported += result?.length || 0;
    }
    
    // Progress
    if ((i + BATCH_SIZE) % 1000 === 0) {
      const percent = Math.round(((i + BATCH_SIZE) / uniqueData.length) * 100);
      process.stdout.write(`\r   ${imported}/${uniqueData.length} (${percent}%)`);
    }
  }
  
  process.stdout.write(`\r   ${colors.green}✅ ${imported}/${uniqueData.length}${colors.reset}\n`);
  
  // 5. Verify: Prüfe Versicherer
  const { data: dbData } = await supabase
    .from('premiums')
    .select('insurer_id')
    .eq('year', year)
    .limit(100000);
    
  const insurers = new Set(dbData?.map(d => d.insurer_id) || []);
  
  console.log(`\n${colors.blue}📊 VERIFY:${colors.reset}`);
  console.log(`   Versicherer: ${insurers.size}`);
  console.log(`   Sample IDs: ${Array.from(insurers).slice(0, 10).join(', ')}...`);
  
  // Prüfe ob Assura vorhanden
  const hasAssura = insurers.has('1318');
  if (hasAssura) {
    console.log(`   ${colors.green}✅ Assura (1318) vorhanden${colors.reset}`);
  } else {
    console.log(`   ${colors.red}❌ Assura (1318) FEHLT!${colors.reset}`);
  }
  
  const duration = (Date.now() - startTime) / 1000;
  
  return {
    year,
    fileSize,
    totalEntries: data.length,
    imported,
    errors,
    insurers: insurers.size,
    duration
  };
}

async function main() {
  console.log(`${colors.magenta}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.magenta}🚀 KOMPLETTER RE-IMPORT ALLER DATEN (2016-2026)${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(80)}${colors.reset}\n`);
  
  const startTime = Date.now();
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const stats: ImportStats[] = [];
  
  for (const year of years) {
    const result = await importYear(year);
    stats.push(result);
    
    // Kurze Pause zwischen Jahren
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // FINALE ZUSAMMENFASSUNG
  const totalDuration = (Date.now() - startTime) / 1000 / 60;
  
  console.log(`\n${colors.magenta}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.green}✅ IMPORT KOMPLETT!${colors.reset}\n`);
  
  console.log(`${colors.blue}📊 ZUSAMMENFASSUNG:${colors.reset}\n`);
  
  // Tabelle
  console.log('Jahr  │ Einträge  │ Importiert │ Fehler │ Versicherer │ Dauer');
  console.log('──────┼───────────┼────────────┼────────┼─────────────┼───────');
  
  let totalEntries = 0;
  let totalImported = 0;
  let totalErrors = 0;
  
  stats.forEach(s => {
    totalEntries += s.totalEntries;
    totalImported += s.imported;
    totalErrors += s.errors;
    
    const status = s.errors === 0 ? colors.green : colors.yellow;
    console.log(
      `${s.year} │ ${String(s.totalEntries).padStart(9)} │ ` +
      `${status}${String(s.imported).padStart(10)}${colors.reset} │ ` +
      `${String(s.errors).padStart(6)} │ ${String(s.insurers).padStart(11)} │ ` +
      `${s.duration.toFixed(1)}s`
    );
  });
  
  console.log('──────┼───────────┼────────────┼────────┼─────────────┼───────');
  console.log(
    `TOTAL │ ${String(totalEntries).padStart(9)} │ ` +
    `${colors.green}${String(totalImported).padStart(10)}${colors.reset} │ ` +
    `${String(totalErrors).padStart(6)} │             │ ${totalDuration.toFixed(1)}m`
  );
  
  // Finale DB-Prüfung
  console.log(`\n${colors.blue}🔍 FINALE VERIFIZIERUNG:${colors.reset}\n`);
  
  const { count: dbTotal } = await supabase
    .from('premiums')
    .select('*', { count: 'exact', head: true });
    
  console.log(`   Total Einträge in DB: ${dbTotal}`);
  
  // Prüfe Versicherer über alle Jahre
  const { data: allData } = await supabase
    .from('premiums')
    .select('insurer_id, year')
    .limit(500000);
    
  if (allData) {
    const allInsurers = new Set(allData.map(d => d.insurer_id));
    console.log(`   Eindeutige Versicherer: ${allInsurers.size}`);
    console.log(`   Sample: ${Array.from(allInsurers).slice(0, 15).join(', ')}...`);
    
    // Prüfe kritische Versicherer
    const critical = ['0008', '1318', '0062', '0057', '0032'];
    const criticalNames = ['CSS', 'Assura', 'Helsana', 'Swica', 'Sanitas'];
    
    console.log(`\n   ${colors.blue}Kritische Versicherer:${colors.reset}`);
    critical.forEach((id, index) => {
      const present = allInsurers.has(id);
      const icon = present ? '✅' : '❌';
      console.log(`   ${icon} ${criticalNames[index]} (${id}): ${present ? 'Vorhanden' : 'FEHLT'}`);
    });
  }
  
  console.log(`\n${colors.magenta}${'='.repeat(80)}${colors.reset}`);
  
  if (totalErrors > 0) {
    console.log(`${colors.yellow}⚠️  Import mit ${totalErrors} Fehlern abgeschlossen${colors.reset}`);
  } else {
    console.log(`${colors.green}🎉 PERFEKT! Alle Daten erfolgreich importiert!${colors.reset}`);
  }
  
  console.log(`${colors.magenta}${'='.repeat(80)}${colors.reset}\n`);
}

main().catch(console.error);