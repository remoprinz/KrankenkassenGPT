import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://llscftszrwvfpyxkaxiw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsc2NmdHN6cnd2ZnB5eGtheGl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI2ODUyMCwiZXhwIjoyMDgwODQ0NTIwfQ.53cwX0REKeu8GSVDArVo5Q0NDsJGuxE0v9piRDmjY14'
);

async function main() {
  console.log('🔍 Suche nach Versicherer ID 131...\n');
  
  const { data: allInsurers, error } = await supabase
    .from('insurers')
    .select('insurer_id, name')
    .order('insurer_id');

  if (error) {
    console.error('❌ Fehler:', error);
    return;
  }

  const insurer131 = allInsurers?.find(i => i.insurer_id === '131');
  
  if (insurer131) {
    console.log(`✅ Gefunden: ${insurer131.name}`);
  } else {
    console.log('⚠️  Versicherer ID 131 nicht gefunden!\n');
    console.log('📋 Verfügbare Versicherer-IDs (erste 20):');
    allInsurers?.slice(0, 20).forEach(i => {
      console.log(`   ${i.insurer_id}: ${i.name}`);
    });
    console.log(`\n   ... und ${allInsurers!.length - 20} weitere`);
  }
}

main().catch(console.error);
