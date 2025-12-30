import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://llscftszrwvfpyxkaxiw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsc2NmdHN6cnd2ZnB5eGtheGl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI2ODUyMCwiZXhwIjoyMDgwODQ0NTIwfQ.53cwX0REKeu8GSVDArVo5Q0NDsJGuxE0v9piRDmjY14'
);

async function main() {
  console.log('📊 Abfrage 1: Anzahl Einträge in premiums Tabelle...\n');
  const { count: premiumsCount, error: countError } = await supabase
    .from('premiums')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Fehler bei premiums count:', countError);
  } else {
    console.log(`✅ Anzahl Einträge in premiums: ${premiumsCount?.toLocaleString('de-CH')}\n`);
  }

  console.log('📊 Abfrage 2: Versicherer mit ID 131...\n');
  const { data: insurer, error: insurerError } = await supabase
    .from('insurers')
    .select('*')
    .eq('insurer_id', '131')
    .single();

  if (insurerError) {
    console.error('❌ Fehler bei insurer query:', insurerError);
  } else if (insurer) {
    console.log(`✅ Versicherer ID 131:`);
    console.log(`   Name: ${insurer.name}`);
    console.log(`   Kurzname: ${insurer.short_name || 'N/A'}`);
    console.log(`   Website: ${insurer.website || 'N/A'}\n`);
  } else {
    console.log('⚠️  Kein Versicherer mit ID 131 gefunden\n');
  }

  console.log('📋 Bonus: Bekannte Tabellen in der Datenbank...\n');
  const knownTables = ['premiums', 'locations', 'insurers', 'leads'];
  console.log('✅ Tabellen:');
  for (const table of knownTables) {
    const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`   - ${table} (${count?.toLocaleString('de-CH')} Einträge)`);
    }
  }
}

main().catch(console.error);
