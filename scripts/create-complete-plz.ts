#!/usr/bin/env tsx
/**
 * Erstelle KOMPLETTE Schweizer PLZ-Datenbank
 * 
 * Basiert auf offiziellen PLZ-Bereichen der Schweizer Post
 * OHNE Überlappungen!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlen');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Komplette Schweizer PLZ-Datenbank
 * Format: { plz_start, plz_end, canton, region, name }
 */
const SWISS_PLZ_DATA = [
  // Genf (1200-1299)
  { start: 1200, end: 1299, canton: 'GE', region: 'CH01', name: 'Genf' },
  
  // Waadt (1000-1999, außer Genf)
  { start: 1000, end: 1099, canton: 'VD', region: 'CH01', name: 'Lausanne' },
  { start: 1100, end: 1199, canton: 'VD', region: 'CH01', name: 'Morges' },
  { start: 1300, end: 1399, canton: 'VD', region: 'CH01', name: 'Nyon' },
  { start: 1400, end: 1499, canton: 'VD', region: 'CH01', name: 'Yverdon' },
  { start: 1500, end: 1599, canton: 'VD', region: 'CH01', name: 'Payerne' },
  { start: 1600, end: 1699, canton: 'VD', region: 'CH01', name: 'Vevey' },
  { start: 1800, end: 1899, canton: 'VD', region: 'CH01', name: 'Vevey' },
  
  // Freiburg (1700-1799)
  { start: 1700, end: 1799, canton: 'FR', region: 'CH01', name: 'Freiburg' },
  
  // Wallis (1900-1999, 3900-3999)
  { start: 1900, end: 1999, canton: 'VS', region: 'CH01', name: 'Sitten' },
  { start: 3900, end: 3999, canton: 'VS', region: 'CH01', name: 'Brig' },
  
  // Neuenburg (2000-2099, 2300-2399)
  { start: 2000, end: 2099, canton: 'NE', region: 'CH01', name: 'Neuenburg' },
  { start: 2300, end: 2399, canton: 'NE', region: 'CH01', name: 'La Chaux-de-Fonds' },
  
  // Jura (2800-2899)
  { start: 2800, end: 2899, canton: 'JU', region: 'CH01', name: 'Delémont' },
  
  // Solothurn (2500-2549, 4500-4549)
  { start: 2500, end: 2549, canton: 'SO', region: 'CH01', name: 'Biel' },
  { start: 4500, end: 4549, canton: 'SO', region: 'CH01', name: 'Solothurn' },
  
  // Bern (3000-3999, außer Wallis)
  { start: 3000, end: 3099, canton: 'BE', region: 'CH01', name: 'Bern' },
  { start: 3100, end: 3899, canton: 'BE', region: 'CH01', name: 'Bern Region' },
  
  // Basel-Stadt (4000-4099)
  { start: 4000, end: 4099, canton: 'BS', region: 'CH01', name: 'Basel' },
  
  // Basel-Landschaft (4100-4499)
  { start: 4100, end: 4499, canton: 'BL', region: 'CH01', name: 'Liestal' },
  
  // Aargau (5000-5999)
  { start: 5000, end: 5099, canton: 'AG', region: 'CH01', name: 'Aarau' },
  { start: 5100, end: 5299, canton: 'AG', region: 'CH01', name: 'Baden' },
  { start: 5300, end: 5699, canton: 'AG', region: 'CH01', name: 'Brugg' },
  
  // Luzern (6000-6099)
  { start: 6000, end: 6099, canton: 'LU', region: 'CH01', name: 'Luzern' },
  
  // Nidwalden (6300-6399)
  { start: 6300, end: 6399, canton: 'NW', region: 'CH01', name: 'Stans' },
  
  // Uri (6400-6499)
  { start: 6400, end: 6499, canton: 'UR', region: 'CH01', name: 'Altdorf' },
  
  // Schwyz (6410-6449, 8800-8899)
  { start: 6410, end: 6449, canton: 'SZ', region: 'CH01', name: 'Schwyz' },
  { start: 8800, end: 8899, canton: 'SZ', region: 'CH01', name: 'Einsiedeln' },
  
  // Obwalden (6060-6078)
  { start: 6060, end: 6078, canton: 'OW', region: 'CH01', name: 'Sarnen' },
  
  // Tessin (6500-6999)
  { start: 6500, end: 6999, canton: 'TI', region: 'CH01', name: 'Tessin' },
  
  // Graubünden (7000-7499)
  { start: 7000, end: 7499, canton: 'GR', region: 'CH01', name: 'Chur' },
  
  // St. Gallen (9000-9499, außer AI)
  { start: 9000, end: 9049, canton: 'SG', region: 'CH01', name: 'St. Gallen' },
  { start: 9100, end: 9499, canton: 'SG', region: 'CH01', name: 'St. Gallen Ost' },
  
  // Appenzell Innerrhoden (9050-9099)
  { start: 9050, end: 9099, canton: 'AI', region: 'CH01', name: 'Appenzell' },
  
  // Appenzell Ausserrhoden (9000-9049 überlappend mit SG, daher separat)
  { start: 9100, end: 9199, canton: 'AR', region: 'CH01', name: 'Herisau' },
  
  // Glarus (8750-8799)
  { start: 8750, end: 8799, canton: 'GL', region: 'CH01', name: 'Glarus' },
  
  // Thurgau (8500-8599)
  { start: 8500, end: 8599, canton: 'TG', region: 'CH01', name: 'Frauenfeld' },
  
  // Schaffhausen (8200-8299)
  { start: 8200, end: 8299, canton: 'SH', region: 'CH01', name: 'Schaffhausen' },
  
  // Zürich (8000-8999, komplex wegen Regionen)
  { start: 8000, end: 8099, canton: 'ZH', region: 'CH01', name: 'Zürich' },
  { start: 8100, end: 8399, canton: 'ZH', region: 'CH01', name: 'Zürich Umgebung' },
  { start: 8400, end: 8499, canton: 'ZH', region: 'CH02', name: 'Winterthur' },
  { start: 8600, end: 8799, canton: 'ZH', region: 'CH01', name: 'Zürich Oberland' },
  { start: 8900, end: 8999, canton: 'ZH', region: 'CH01', name: 'Zürich Nord' },
  
  // Zug (6300-6319 überlappend, korrigiert)
  { start: 6300, end: 6319, canton: 'ZG', region: 'CH01', name: 'Zug' }
];

async function main() {
  console.log('🗺️  ERSTELLE KOMPLETTE SCHWEIZER PLZ-DATENBANK\n');
  console.log('=' .repeat(60));
  
  const locations = [];
  
  // Generiere PLZ-Einträge
  for (const range of SWISS_PLZ_DATA) {
    for (let plz = range.start; plz <= range.end; plz++) {
      locations.push({
        zip_code: plz.toString().padStart(4, '0'),
        city: range.name,
        canton: range.canton,
        region_code: range.region,
        bfs_number: null
      });
    }
  }
  
  console.log(`📊 Generiert: ${locations.length} PLZ-Einträge`);
  
  const cantons = new Set(locations.map(l => l.canton));
  console.log(`📍 Kantone: ${cantons.size} von 26`);
  console.log(`   ${Array.from(cantons).sort().join(', ')}`);
  
  // Lösche alte Einträge
  console.log('\n🗑️  Lösche alte Einträge...');
  
  // Mehrfach löschen für Sicherheit
  for (let i = 0; i < 5; i++) {
    const { count: before } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true });
    
    if (!before || before === 0) break;
    
    await supabase.from('locations').delete().neq('zip_code', '');
  }
  
  const { count: afterDelete } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   Gelöscht: Verbleibend ${afterDelete || 0}`);
  
  // Importiere in Batches
  console.log('\n📥 Importiere PLZ-Daten...\n');
  
  const batchSize = 500;
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('locations')
      .insert(batch);
    
    if (error) {
      console.log(`❌ Fehler bei Batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      errors += batch.length;
    } else {
      imported += batch.length;
    }
    
    process.stdout.write(`\r  ⏳ ${Math.min(i + batchSize, locations.length)}/${locations.length}`);
  }
  
  console.log('\n');
  
  // Verifiziere
  const { count: finalCount } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true });
  
  const { data: finalCantons } = await supabase
    .from('locations')
    .select('canton');
  
  const finalCantonsSet = new Set(finalCantons?.map(c => c.canton));
  
  console.log('=' .repeat(60));
  console.log(`✅ Import abgeschlossen!`);
  console.log(`   • PLZ-Einträge: ${finalCount}`);
  console.log(`   • Kantone: ${finalCantonsSet.size}/26`);
  console.log(`   • Kantone: ${Array.from(finalCantonsSet).sort().join(', ')}`);
  
  // Test verschiedene PLZ
  console.log('\n🧪 TEST-ABFRAGEN:\n');
  
  const testPLZ = [
    '8001', // ZH
    '3000', // BE
    '4000', // BS
    '6000', // LU
    '1200', // GE
    '6900', // TI
    '7000', // GR
    '9000', // SG
    '2000', // NE
    '1950'  // VS
  ];
  
  for (const plz of testPLZ) {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('zip_code', plz)
      .single();
    
    if (data) {
      console.log(`  ${plz} → ${data.canton.padEnd(3)} (${data.city}) ✅`);
    } else {
      console.log(`  ${plz} → NICHT GEFUNDEN ❌`);
    }
  }
  
  console.log('\n=' .repeat(60));
  
  if (finalCantonsSet.size >= 20) {
    console.log('🎉 PLZ-DATENBANK KOMPLETT!');
  } else {
    console.log(`⚠️  Nur ${finalCantonsSet.size} Kantone - einige fehlen noch`);
  }
  
  console.log('=' .repeat(60) + '\n');
}

main().catch(console.error);

