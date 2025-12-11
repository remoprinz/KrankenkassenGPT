/**
 * SwissHealth API Configuration
 */

export const CONFIG: any = {
  // API Settings
  API_VERSION: 'v1',
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS: 1000,
  RATE_LIMIT_WINDOW_SECONDS: 3600, // 1 hour
  
  // CORS
  ALLOWED_ORIGINS: [
    'https://chat.openai.com',
    'https://chatgpt.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  
  // Cache
  CACHE_MAX_AGE: 3600, // 1 hour (Prämien ändern sich selten)
  
  // Data Source
  DATA_SOURCE: {
    name: 'BAG Priminfo 2026',
    publisher: 'Bundesamt für Gesundheit (BAG)',
    license: 'Freie Nutzung. Quellenangabe ist Pflicht.',
    version: '2026-09-23',
    url: 'https://opendata.swiss/de/dataset/health-insurance-premiums'
  },
  
  // Profile Mappings (für /premiums/cheapest)
  PROFILES: {
    'single_adult': {
      age_band: 'adult',
      franchise_chf: 2500,
      accident_covered: false, // Standard: ohne Unfall (Arbeitgeber zahlt meist)
      description: 'Einzelperson, Erwachsener, hohe Franchise'
    },
    'couple': {
      age_band: 'adult',
      franchise_chf: 2500,
      accident_covered: true,
      description: 'Paar, Erwachsene, hohe Franchise'
    },
    'family_1kid': {
      age_band: 'adult',
      franchise_chf: 1000,
      accident_covered: true,
      description: 'Familie mit 1 Kind, mittlere Franchise'
    },
    'family_2kids': {
      age_band: 'adult',
      franchise_chf: 500,
      accident_covered: true,
      description: 'Familie mit 2+ Kindern, tiefe Franchise'
    },
    'student': {
      age_band: 'young_adult',
      franchise_chf: 2500,
      accident_covered: false, // Standard: ohne Unfall (meist über Uni/Arbeitgeber)
      description: 'Student/in, 19-25 Jahre'
    },
    'young_adult': {
      age_band: 'young_adult',
      franchise_chf: 2500,
      accident_covered: true,
      description: 'Junger Erwachsener, 19-25 Jahre'
    }
  },
  
  // Region Name Mapping
  REGION_NAMES: {
    'PR-REG CH0': 'Region 0',
    'PR-REG CH1': 'Region 1',
    'PR-REG CH2': 'Region 2',
    'PR-REG CH3': 'Region 3'
  },
  
  // Canton Names
  CANTON_NAMES: {
    'ZH': 'Zürich',
    'BE': 'Bern',
    'LU': 'Luzern',
    'UR': 'Uri',
    'SZ': 'Schwyz',
    'OW': 'Obwalden',
    'NW': 'Nidwalden',
    'GL': 'Glarus',
    'ZG': 'Zug',
    'FR': 'Fribourg',
    'SO': 'Solothurn',
    'BS': 'Basel-Stadt',
    'BL': 'Basel-Landschaft',
    'SH': 'Schaffhausen',
    'AR': 'Appenzell Ausserrhoden',
    'AI': 'Appenzell Innerrhoden',
    'SG': 'St. Gallen',
    'GR': 'Graubünden',
    'AG': 'Aargau',
    'TG': 'Thurgau',
    'TI': 'Ticino',
    'VD': 'Vaud',
    'VS': 'Valais',
    'NE': 'Neuchâtel',
    'GE': 'Genève',
    'JU': 'Jura'
  }
};
