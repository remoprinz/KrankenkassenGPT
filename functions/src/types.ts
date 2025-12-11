/**
 * SwissHealth API Types
 */

export type AgeBand = 'child' | 'young_adult' | 'adult';
export type ModelType = 'standard' | 'hmo' | 'telmed' | 'hausarzt' | 'divers';
export type Profile = 'single_adult' | 'couple' | 'family_1kid' | 'family_2kids' | 'student' | 'young_adult';

// Database Types
export interface Premium {
  id: number;
  year: number;
  insurer_id: string;
  canton: string;
  region_code: string;
  age_band: AgeBand;
  accident_covered: boolean;
  franchise_chf: number;
  model_type: ModelType;
  monthly_premium_chf: number;
  tariff_name?: string;
}

export interface Insurer {
  insurer_id: string;
  name?: string;
  short_name?: string;
  is_active: boolean;
}

// API Response Types
export interface Source {
  name: string;
  publisher: string;
  license?: string;
  version: string;
  published_at?: string;
  last_updated?: string;
  url?: string;
  records?: number;
}

export interface MetaResponse {
  current: Source;
  api_version: string;
}

export interface RegionLookupResponse {
  plz: string;
  canton: string;
  canton_name: string;
  municipality?: string;
  region_code: string;
  region_name: string;
}

export interface PremiumResult {
  insurer_id: string;
  insurer_name?: string;
  monthly_premium_chf: number;
  annual_premium_chf: number;
  model_type: ModelType;
  canton: string;
  region: string;
  tariff_name?: string;
}

export interface QuoteResponse {
  query: {
    canton: string;
    age_band: AgeBand;
    franchise_chf: number;
    accident_covered: boolean;
    model_type?: ModelType;
  };
  results: PremiumResult[];
  count: number;
  statistics: {
    min: number;
    max: number;
    median: number;
    average: number;
  };
  source: Source;
  disclaimer: string;
}

export interface CheapestResponse {
  profile: {
    type: Profile;
    age_band: AgeBand;
    franchise_chf: number;
    accident_covered: boolean;
    description: string;
  };
  canton: string;
  recommendations: Array<{
    rank: number;
    insurer_id: string;
    insurer_name?: string;
    model_type: ModelType;
    monthly_premium_chf: number;
    annual_premium_chf: number;
    savings_vs_average: number;
    savings_percentage: number;
    tariff_name?: string;
  }>;
  statistics: {
    average_premium: number;
    median_premium: number;
    total_options: number;
  };
  source: Source;
  disclaimer: string;
}

export interface CompareRequest {
  options: Array<{
    insurer_id: string;
    model_type: ModelType;
    franchise_chf: number;
  }>;
  for_profile: Profile;
  canton: string;
}

export interface CompareResponse {
  comparison: Array<{
    insurer_id: string;
    insurer_name?: string;
    model_type: ModelType;
    franchise_chf: number;
    monthly_premium_chf: number;
    annual_premium_chf: number;
    difference_from_cheapest: number;
    percentage_from_cheapest: number;
  }>;
  cheapest: {
    insurer_id: string;
    monthly_premium_chf: number;
  };
  most_expensive: {
    insurer_id: string;
    monthly_premium_chf: number;
  };
  source: Source;
  disclaimer: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    suggestion?: string;
    docs?: string;
    timestamp: string;
  };
}