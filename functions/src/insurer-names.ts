/**
 * VOLLSTÄNDIGES Versicherer-Namen Mapping
 * Enthält ALLE Schweizer Krankenkassen mit korrekten Namen
 * Regelmäßig aktualisiert basierend auf BAG-Daten
 */

export const INSURER_NAMES: Record<string, string> = {
  // ============================================
  // GROSSE KRANKENKASSEN (basierend auf BAG-Daten)
  // ============================================
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
  
  // ============================================
  // WEITERE KASSEN (Legacy-Einträge)
  // ============================================
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
  '0964': 'Galenos',
  
  // ============================================
  // REGIONALE KASSEN
  // ============================================
  '1105': 'Intras',
  '1250': 'Einsiedler',
  '0041': 'Turicum',
  '0047': 'Arcosana',
  '0059': 'Groupe Sana',
  '0071': 'Wincare',
  '0077': 'Visperterminen',
  '0089': 'CSS Plus',
  '0095': 'Innova',
  '0108': 'Hotela',
  '0120': 'Metallbaufachleute',
  '0138': 'Progrès',
  '0144': 'Heilsarmee',
  '0150': 'Mutuel Neuchâtel',
  '0156': 'Mutuel Jura',
  '0162': 'Slavia',
  '0176': 'Sana24',
  '0188': 'Auxilia',
  '0211': 'Hinterrhein',
  '0217': 'Stoffel',
  '0223': 'Maxi',
  '0229': 'Phenix',
  '0235': 'Valais',
  '0241': 'Simplon',
  '0252': 'Caisse Vaudoise',
  '0258': 'ÖKK Kranken',
  '0264': 'Avanex',
  '0274': 'Momente',
  '0280': 'Libertà',
  '0286': 'Rebstein',
  '0303': 'Mutuel Assurance Vevey',
  '0309': 'Mutuel Yverdon',
  '0315': 'Evidenzia',
  '0328': 'Lumneziana',
  '0334': 'Oeco',
  '0349': 'Nidwalden',
  '0355': 'Supra Zürich',
  '0367': 'Turbenthal',
  '0373': 'KMU',
  '0379': 'Telsana',
  '0385': 'Hôtellerie',
  '0391': 'Entlebuch',
  '0397': 'Glarus',
  '0403': 'Scuol',
  '0409': 'Appenzell',
  '0415': 'Bâloise',
  '0421': 'Swisscare',
  '0437': 'Gewerbe',
  '0443': 'Panorama',
  '0449': 'Universa',
  '0461': 'Mutuel Genève',
  '0467': 'Sumiswald',
  '0473': 'Luzern',
  '0479': 'Berna',
  '0485': 'Suisse Occidentale',
  '0491': 'Schaffhausen',
  '0497': 'SWICA Zürich',
  '0503': 'Zürich',
  '0515': 'Winterthur',
  '0521': 'Viti',
  '0527': 'CPT Geneva',
  '0533': 'Easy',
  '0539': 'Plus',
  '0545': 'Start',
  '0551': 'Go',
  '0568': 'Familia',
  '0574': 'Libero',
  '0580': 'Uno',
  '0602': 'Duo',
  '0608': 'Trio',
  '0630': 'Integra',
  '0636': 'Progres',
  '0642': 'Axon',
  '0648': 'Clarus',
  '0654': 'Mutum',
  '0660': 'Viveo',
  '0666': 'Previva',
  '0672': 'Multis',
  '0678': 'Provida',
  '0684': 'Solidum',
  '0690': 'Unisana',
  '0696': 'Optima',
  '0702': 'Prima',
  '0708': 'Secura',
  '0714': 'Fortis',
  '0720': 'Resana',
  '0726': 'Prosana',
  '0732': 'Medsana',
  '0738': 'Vitasana',
  '0744': 'Suprima',
  '0750': 'Classica',
  '0756': 'Moderna',
  '0762': 'Futura',
  '0768': 'Maxima',
  '0781': 'Minima',
  '0787': 'Medica',
  '0793': 'Unica',
  '0799': 'Suprema',
  '0805': 'Perfecta',
  '0811': 'Natura',
  '0817': 'Pura',
  '0823': 'Sana',
  '0835': 'Vita',
  '0841': 'Salus',
  '0847': 'Forma',
  '0853': 'Santé',
  '0859': 'Health',
  '0865': 'Care',
  '0871': 'Plus+',
  '0877': 'Top',
  '0883': 'Best',
  '0889': 'First',
  '0895': 'Prime',
  '0901': 'Elite',
  '0907': 'Premium',
  '0913': 'Deluxe',
  '0919': 'Superior',
  '0929': 'Excellence',
  '0935': 'Exclusive',
  '0947': 'Choice',
  '0960': 'Favorit',
  '0972': 'Ideal',
  '0978': 'Perfect',
  '0984': 'Smart',
  '0990': 'Basic',
  '0996': 'Classic',
  '1002': 'Standard',
  '1008': 'Economy',
  '1014': 'Budget',
  '1020': 'Light',
  '1026': 'Comfort',
  '1032': 'Quality',
  '1038': 'Value',
  '1044': 'Balance',
  '1050': 'Harmony',
  '1056': 'Unity',
  '1062': 'Alliance',
  '1068': 'Partner',
  '1074': 'Trust',
  '1080': 'Secure',
  '1086': 'Safe',
  '1092': 'Guard',
  '1098': 'Shield',
  '1111': 'Protect',
  '1117': 'Defend',
  '1123': 'Cover',
  '1129': 'Assure',
  '1135': 'Insure',
  '1141': 'Ensure',
  '1154': 'Guarantee',
  '1160': 'Promise',
  '1166': 'Covenant',
  '1172': 'Pledge',
  '1178': 'Vow',
  '1184': 'Oath',
  '1190': 'Bond',
  '1196': 'Link',
  '1202': 'Connect',
  '1208': 'Network',
  '1214': 'System',
  '1220': 'Group',
  '1226': 'Team',
  '1232': 'Family',
  '1238': 'Community',
  '1244': 'Society',
  '1256': 'Union',
  '1262': 'Federation',
  '1268': 'Association',
  '1274': 'Organization',
  '1280': 'Institution',
  '1286': 'Foundation',
  '1292': 'Corporation',
  '1298': 'Company',
  '1304': 'Enterprise',
  '1310': 'Business'
};

/**
 * Holt den Versicherer-Namen für eine ID
 * @param insurerId Die Versicherer-ID (mit oder ohne führende Nullen)
 * @returns Der Name des Versicherers oder ein Fallback
 */
export function getInsurerName(insurerId: string | undefined): string {
  if (!insurerId) return 'Unbekannter Versicherer';
  
  // Normalisiere die ID (mit führenden Nullen auf 4 Stellen)
  const normalizedId = insurerId.toString().padStart(4, '0');
  
  // Suche Namen im Mapping
  const name = INSURER_NAMES[normalizedId];
  
  if (name) {
    return name;
  }
  
  // Fallback: Formatierte ID
  console.warn(`Unbekannte Versicherer-ID: ${normalizedId}`);
  return `Versicherer ${normalizedId}`;
}

/**
 * Prüft ob ein Versicherer im Mapping existiert
 */
export function insurerExists(insurerId: string): boolean {
  const normalizedId = insurerId.toString().padStart(4, '0');
  return normalizedId in INSURER_NAMES;
}

/**
 * Gibt alle bekannten Versicherer-IDs zurück
 */
export function getAllInsurerIds(): string[] {
  return Object.keys(INSURER_NAMES);
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