/**
 * Versicherer-Namen Mapping
 * Enthält die wichtigsten Schweizer Krankenkassen
 */

export const INSURER_NAMES: Record<string, string> = {
  '0008': 'CSS',
  '0032': 'Concordia',
  '0134': 'Visana',
  '0194': 'Atupri',
  '0246': 'Aquilana',
  '0290': 'Galenos',
  '0312': 'Helsana',
  '0343': 'Intras',
  '0360': 'Sanitas',
  '0376': 'KPT',
  '0455': 'ÖKK',
  '0509': 'Progrès',
  '0881': 'Sympany',
  '0923': 'Swica',
  '0941': 'Vivao',
  '0966': 'Wincare',
  '1040': 'EGK',
  '1113': 'Groupe Mutuel',
  '1318': 'Assura',
  '1322': 'Helsana Plus',
  '1384': 'Groupe Mutuel',
  '1386': 'KPT',
  '1401': 'Groupe Mutuel',
  '1479': 'Helsana',
  '1507': 'CSS',
  '1509': 'Swica',
  '1535': 'Assura',
  '1542': 'KPT',
  '1555': 'Groupe Mutuel',
  '1560': 'KPT',
  '1562': 'Assura',
  '1568': 'Helsana',
  '0062': 'Helsana',
  '0057': 'Swica',
  '0182': 'ÖKK',
  '0094': 'EasySana',
  '1148': 'AMB Assurances',
  '0053': 'Vivao Sympany',
  '0114': 'EGK',
  '0126': 'Aquilana',
  '0132': 'Agrisano',
  '0083': 'Avenir',
  '0102': 'SLKK',
  '0129': 'Compact',
  '0170': 'Sodalis',
  '0205': 'Kolping',
  '0268': 'Sumiswalder',
  '0297': 'Provita',
  '0322': 'Supra',
  '0361': 'Sanagate',
  '0374': 'Vivacare',
  '0431': 'Rhenusana',
  '0562': 'Glarner',
  '0590': 'Birchmeier',
  '0596': 'KLuG',
  '0615': 'Vita Surselva',
  '0624': 'Luzerner Hinterland',
  '0775': 'Sanavals',
  '0780': 'Rhenusana',
  '0784': 'Steffisburg',
  '0820': 'Sanitas',
  '0829': 'KKV',
  '0954': 'Wädenswil',
  '0964': 'Galenos'
};

/**
 * Holt den Versicherer-Namen für eine ID
 */
export function getInsurerName(insurerId: string | undefined): string {
  if (!insurerId) return 'Unbekannter Versicherer';
  
  const normalizedId = insurerId.toString().padStart(4, '0');
  const name = INSURER_NAMES[normalizedId];
  
  if (name) {
    return name;
  }
  
  return `Versicherer ${normalizedId}`;
}

/**
 * Sucht Versicherer nach Name (case-insensitive)
 */
export function findInsurerByName(name: string): string | undefined {
  const searchName = name.toLowerCase().trim();
  
  for (const [id, insurerName] of Object.entries(INSURER_NAMES)) {
    if (insurerName.toLowerCase().includes(searchName)) {
      return id;
    }
  }
  
  return undefined;
}
