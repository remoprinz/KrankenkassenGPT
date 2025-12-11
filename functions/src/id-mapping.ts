/**
 * Versicherer ID Mapping
 * Mappt verschiedene ID-Formate auf die korrekte DB-ID
 */

export const INSURER_ID_MAPPING: Record<string, string> = {
  // CSS
  '230': '0008',
  '8': '0008',
  '08': '0008',
  '008': '0008',
  'CSS': '0008',
  'css': '0008',
  
  // Helsana
  '62': '0062',
  '062': '0062',
  'HELSANA': '0062',
  'helsana': '0062',
  
  // Swica
  '57': '0057',
  '057': '0057',
  'SWICA': '0057',
  'swica': '0057',
  
  // Sanitas
  '32': '0032',
  '032': '0032',
  'SANITAS': '0032',
  'sanitas': '0032',
  
  // Concordia
  '312': '0312',
  'CONCORDIA': '0312',
  'concordia': '0312',
  
  // Assura
  '1318': '1318',
  'ASSURA': '1318',
  'assura': '1318',
  
  // Visana
  '343': '0343',
  '0343': '0343',
  'VISANA': '0343',
  'visana': '0343',
  
  // ÖKK
  '182': '0182',
  '0182': '0182',
  'OKK': '0182',
  'okk': '0182',
  'ÖKK': '0182',
  
  // KPT
  '290': '0290',
  '0290': '0290',
  'KPT': '0290',
  'kpt': '0290',
  
  // Atupri
  '246': '0246',
  '0246': '0246',
  'ATUPRI': '0246',
  'atupri': '0246'
};

/**
 * Normalisiert eine Versicherer-ID
 * @param id Die eingegebene ID (kann verschiedene Formate haben)
 * @returns Die normalisierte ID für die DB-Abfrage
 */
export function normalizeInsurerId(id: string | undefined): string {
  if (!id) return '';
  
  const idStr = String(id).trim();
  
  // Prüfe ob es ein bekanntes Mapping gibt
  if (INSURER_ID_MAPPING[idStr]) {
    return INSURER_ID_MAPPING[idStr];
  }
  
  // Versuche mit führenden Nullen zu padden (4 Stellen)
  if (/^\d+$/.test(idStr) && idStr.length < 4) {
    const padded = idStr.padStart(4, '0');
    if (INSURER_ID_MAPPING[padded]) {
      return INSURER_ID_MAPPING[padded];
    }
    return padded;
  }
  
  // Gib die ID unverändert zurück
  return idStr;
}
