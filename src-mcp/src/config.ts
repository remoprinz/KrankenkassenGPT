/**
 * SwissHealth MCP Server Configuration
 */

export const CONFIG = {
  // API Settings
  API_VERSION: 'v1',
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  
  // Data Source
  DATA_SOURCE: {
    name: 'BAG Priminfo 2026',
    publisher: 'Bundesamt für Gesundheit (BAG)',
    license: 'Freie Nutzung. Quellenangabe ist Pflicht.',
    version: '2026-09-23',
    url: 'https://opendata.swiss/de/dataset/health-insurance-premiums'
  },
  
  // Profile Mappings
  PROFILES: {
    'single_adult': {
      age_band: 'adult',
      franchise_chf: 2500,
      accident_covered: false,
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
    'family_3kids': {
      age_band: 'adult',
      franchise_chf: 500,
      accident_covered: true,
      description: 'Familie mit 3 Kindern (Fallback)'
    },
    'student': {
      age_band: 'young_adult',
      franchise_chf: 2500,
      accident_covered: false,
      description: 'Student/in, 19-25 Jahre'
    },
    'young_adult': {
      age_band: 'young_adult',
      franchise_chf: 2500,
      accident_covered: true,
      description: 'Junger Erwachsener, 19-25 Jahre'
    }
  } as Record<string, { age_band: string; franchise_chf: number; accident_covered: boolean; description: string }>,
  
  // Region Name Mapping
  REGION_NAMES: {
    'PR-REG CH0': 'Region 0',
    'PR-REG CH1': 'Region 1',
    'PR-REG CH2': 'Region 2',
    'PR-REG CH3': 'Region 3'
  } as Record<string, string>,
  
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
  } as Record<string, string>,
  
  // Valid Franchises
  VALID_FRANCHISES: [0, 100, 200, 300, 400, 500, 600, 1000, 1500, 2000, 2500],
  
  // Valid Age Bands
  VALID_AGE_BANDS: ['child', 'young_adult', 'adult'],
  
  // Valid Model Types
  VALID_MODEL_TYPES: ['standard', 'hmo', 'telmed', 'family_doctor', 'diverse']
};

export type AgeBand = 'child' | 'young_adult' | 'adult';
export type ModelType = 'standard' | 'hmo' | 'telmed' | 'family_doctor' | 'diverse';
export type Profile = 'single_adult' | 'couple' | 'family_1kid' | 'family_2kids' | 'student' | 'young_adult';
