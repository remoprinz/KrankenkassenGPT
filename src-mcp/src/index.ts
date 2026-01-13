#!/usr/bin/env node
/**
 * SwissHealth MCP Server
 * Agent-Native Server für Schweizer Krankenkassen-Prämien
 * 
 * Bietet spezialisierte Tools statt roher Datenbank-Zugriffe.
 * Designed für KI-Agenten, nicht für Menschen.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { CONFIG } from './config.js';
import { normalizeInsurerId } from './id-mapping.js';
import { getInsurerName } from './insurer-names.js';
import { createComparisonChart, createTimelineChart, createInflationChart } from './chart-service.js';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen als Umgebungsvariablen gesetzt sein');
    }
    
    supabase = createClient(url, key);
  }
  return supabase;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatistics(premiums: Array<{ monthly_premium_chf: number }>) {
  const prices = premiums.map(p => p.monthly_premium_chf).sort((a, b) => a - b);
  return {
    min: prices[0] || 0,
    max: prices[prices.length - 1] || 0,
    median: prices[Math.floor(prices.length / 2)] || 0,
    average: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 || 0
  };
}

function calculateTrend(data: Array<{ year: number; monthly_premium_chf: number }>) {
  if (data.length < 2) return null;
  
  const n = data.length;
  const sumX = data.reduce((sum, d) => sum + d.year, 0);
  const sumY = data.reduce((sum, d) => sum + d.monthly_premium_chf, 0);
  const sumXY = data.reduce((sum, d) => sum + d.year * d.monthly_premium_chf, 0);
  const sumX2 = data.reduce((sum, d) => sum + d.year * d.year, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return {
    slope: Math.round(slope * 100) / 100,
    prediction_2027: Math.round((slope * 2027 + intercept) * 100) / 100
  };
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const TOOLS: Tool[] = [
  {
    name: 'lookup_region',
    description: 'Findet Kanton und Prämien-Region für eine Schweizer Postleitzahl. Nutze dies ZUERST, wenn der Benutzer nur seine PLZ nennt.',
    inputSchema: {
      type: 'object',
      properties: {
        plz: {
          type: 'string',
          description: 'Schweizer Postleitzahl (4 Ziffern, z.B. "8001")'
        }
      },
      required: ['plz']
    }
  },
  {
    name: 'get_premium_quote',
    description: 'Sucht aktuelle Krankenkassen-Prämien für 2026. Gibt die günstigsten Angebote zurück, sortiert nach Preis. Inkl. Statistiken und Vergleichschart.',
    inputSchema: {
      type: 'object',
      properties: {
        canton: {
          type: 'string',
          description: 'Kanton (2-Buchstaben-Code: ZH, BE, GE, etc.)',
          enum: Object.keys(CONFIG.CANTON_NAMES)
        },
        age_band: {
          type: 'string',
          description: 'Altersgruppe',
          enum: ['child', 'young_adult', 'adult'],
          default: 'adult'
        },
        franchise_chf: {
          type: 'number',
          description: 'Franchise in CHF',
          enum: CONFIG.VALID_FRANCHISES,
          default: 2500
        },
        accident_covered: {
          type: 'boolean',
          description: 'Mit Unfallversicherung (true = ja, false = nein). Die meisten Angestellten haben Unfall über Arbeitgeber, daher oft false.',
          default: true
        },
        model_type: {
          type: 'string',
          description: 'Versicherungsmodell. standard = teurer aber freie Arztwahl, hmo/telmed = günstiger mit Einschränkungen',
          enum: CONFIG.VALID_MODEL_TYPES
        },
        limit: {
          type: 'number',
          description: 'Anzahl Resultate (Standard: 10, Max: 50)',
          default: 10
        }
      },
      required: ['canton']
    }
  },
  {
    name: 'get_cheapest_premiums',
    description: 'Findet die günstigsten Versicherungen für vordefinierte Profile (z.B. "single_adult", "family_2kids"). Einfacher als get_premium_quote, da Profile bereits optimale Parameter enthalten.',
    inputSchema: {
      type: 'object',
      properties: {
        canton: {
          type: 'string',
          description: 'Kanton (2-Buchstaben-Code)',
          enum: Object.keys(CONFIG.CANTON_NAMES)
        },
        profile: {
          type: 'string',
          description: 'Vordefiniertes Profil mit optimierten Parametern',
          enum: Object.keys(CONFIG.PROFILES)
        },
        limit: {
          type: 'number',
          description: 'Anzahl Top-Ergebnisse (Standard: 5)',
          default: 5
        }
      },
      required: ['canton', 'profile']
    }
  },
  {
    name: 'get_premium_timeline',
    description: 'Zeigt die Preisentwicklung einer Krankenkasse über mehrere Jahre (2016-2026). Perfekt für: "Wie hat sich Assura entwickelt?" oder "War CSS früher günstiger?"',
    inputSchema: {
      type: 'object',
      properties: {
        insurer_id: {
          type: 'string',
          description: 'Versicherer-ID oder Name (z.B. "1318", "Assura", "CSS")'
        },
        canton: {
          type: 'string',
          description: 'Kanton',
          enum: Object.keys(CONFIG.CANTON_NAMES)
        },
        profile: {
          type: 'string',
          description: 'Profil für konsistente Vergleichsbasis',
          enum: Object.keys(CONFIG.PROFILES),
          default: 'single_adult'
        },
        model_type: {
          type: 'string',
          description: 'Versicherungsmodell',
          enum: CONFIG.VALID_MODEL_TYPES,
          default: 'standard'
        },
        start_year: {
          type: 'number',
          description: 'Start-Jahr (min 2016)',
          default: 2016
        },
        end_year: {
          type: 'number',
          description: 'End-Jahr (max 2026)',
          default: 2025
        }
      },
      required: ['insurer_id', 'canton']
    }
  },
  {
    name: 'get_premium_inflation',
    description: 'Berechnet die jährliche Inflationsrate der Krankenkassenprämien für einen Kanton. Zeigt wie stark die Prämien über die Jahre gestiegen sind.',
    inputSchema: {
      type: 'object',
      properties: {
        canton: {
          type: 'string',
          description: 'Kanton',
          enum: Object.keys(CONFIG.CANTON_NAMES),
          default: 'ZH'
        },
        age_band: {
          type: 'string',
          description: 'Altersgruppe',
          enum: ['child', 'young_adult', 'adult'],
          default: 'adult'
        },
        franchise_chf: {
          type: 'number',
          description: 'Franchise',
          default: 2500
        },
        model_type: {
          type: 'string',
          description: 'Modell',
          enum: CONFIG.VALID_MODEL_TYPES,
          default: 'standard'
        },
        start_year: { type: 'number', default: 2016 },
        end_year: { type: 'number', default: 2025 }
      },
      required: []
    }
  },
  {
    name: 'compare_years',
    description: 'Vergleicht Prämien zwischen zwei Jahren. Zeigt welche Kassen teurer oder günstiger geworden sind.',
    inputSchema: {
      type: 'object',
      properties: {
        year1: { type: 'number', description: 'Erstes Jahr', default: 2020 },
        year2: { type: 'number', description: 'Zweites Jahr', default: 2026 },
        canton: {
          type: 'string',
          enum: Object.keys(CONFIG.CANTON_NAMES),
          default: 'ZH'
        },
        profile: {
          type: 'string',
          enum: Object.keys(CONFIG.PROFILES),
          default: 'single_adult'
        },
        limit: { type: 'number', default: 10 }
      },
      required: []
    }
  },
  {
    name: 'get_premium_ranking',
    description: 'Zeigt welche Kassen über die Jahre konstant günstig waren. Perfekt für: "War Assura schon immer günstig?" oder "Welche Kasse ist langfristig am besten?"',
    inputSchema: {
      type: 'object',
      properties: {
        canton: {
          type: 'string',
          enum: Object.keys(CONFIG.CANTON_NAMES),
          default: 'ZH'
        },
        profile: {
          type: 'string',
          enum: Object.keys(CONFIG.PROFILES),
          default: 'single_adult'
        },
        years: {
          type: 'string',
          description: 'Komma-getrennte Jahre (z.B. "2020,2023,2025")',
          default: '2020,2023,2025'
        },
        top: { type: 'number', description: 'Top N Kassen pro Jahr', default: 5 }
      },
      required: []
    }
  }
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

async function handleLookupRegion(args: { plz: string }) {
  const { plz } = args;
  
  if (!plz || !/^\d{4}$/.test(plz)) {
    return { error: 'PLZ muss eine 4-stellige Zahl sein (z.B. "8001")' };
  }
  
  const { data: location, error } = await getSupabase()
    .from('locations')
    .select('*')
    .eq('zip_code', plz.padStart(4, '0'))
    .single();
  
  if (error || !location) {
    return { error: `PLZ ${plz} nicht gefunden. Bitte prüfen Sie die Postleitzahl.` };
  }
  
  return {
    plz,
    canton: location.canton,
    canton_name: CONFIG.CANTON_NAMES[location.canton] || location.canton,
    municipality: location.city,
    region_code: location.region_code,
    region_name: CONFIG.REGION_NAMES[location.region_code] || location.region_code
  };
}

async function handleGetPremiumQuote(args: {
  canton: string;
  age_band?: string;
  franchise_chf?: number;
  accident_covered?: boolean;
  model_type?: string;
  limit?: number;
}) {
  const {
    canton,
    age_band = 'adult',
    franchise_chf = 2500,
    accident_covered = true,
    model_type,
    limit = 10
  } = args;
  
  // Validation
  if (!CONFIG.CANTON_NAMES[canton]) {
    return { error: `Ungültiger Kanton: ${canton}. Gültige Kantone: ${Object.keys(CONFIG.CANTON_NAMES).join(', ')}` };
  }
  
  if (!CONFIG.VALID_AGE_BANDS.includes(age_band)) {
    return { error: `Ungültige Altersgruppe: ${age_band}. Gültig: child, young_adult, adult` };
  }
  
  if (!CONFIG.VALID_FRANCHISES.includes(franchise_chf)) {
    return { error: `Ungültige Franchise: ${franchise_chf}. Gültig: ${CONFIG.VALID_FRANCHISES.join(', ')}` };
  }
  
  // Query
  let query = getSupabase()
    .from('premiums')
    .select('*')
    .eq('year', 2026)
    .eq('canton', canton)
    .eq('age_band', age_band)
    .eq('franchise_chf', franchise_chf)
    .eq('accident_covered', accident_covered)
    .order('monthly_premium_chf', { ascending: true });
  
  if (model_type) {
    query = query.eq('model_type', model_type);
  }
  
  const { data: premiums, error } = await query;
  
  if (error) {
    return { error: 'Datenbankfehler: ' + error.message };
  }
  
  if (!premiums || premiums.length === 0) {
    return { error: 'Keine Prämien für diese Kriterien gefunden. Versuchen Sie andere Parameter.' };
  }
  
  // Get insurer names
  const insurerIds = [...new Set(premiums.map((p: { insurer_id: string }) => p.insurer_id))];
  const { data: insurers } = await getSupabase()
    .from('insurers')
    .select('insurer_id, name')
    .in('insurer_id', insurerIds);
  
  const insurerMap = new Map((insurers || []).map((i: { insurer_id: string; name: string }) => [i.insurer_id, i.name]));
  
  // Format results
  const limitedPremiums = premiums.slice(0, Math.min(limit, 50));
  const results = limitedPremiums.map((p: { insurer_id: string; monthly_premium_chf: number; model_type: string; canton: string; region_code: string; tariff_name?: string }) => ({
    insurer_id: p.insurer_id,
    insurer_name: insurerMap.get(p.insurer_id) || getInsurerName(p.insurer_id),
    monthly_premium_chf: p.monthly_premium_chf,
    annual_premium_chf: Math.round(p.monthly_premium_chf * 12 * 100) / 100,
    model_type: p.model_type,
    canton: p.canton,
    region: CONFIG.REGION_NAMES[p.region_code] || p.region_code,
    tariff_name: p.tariff_name
  }));
  
  // Generate chart
  let chart_url: string | undefined;
  try {
    const cantonName = CONFIG.CANTON_NAMES[canton];
    const chartData = results.slice(0, 5).map((r: { insurer_name: string; monthly_premium_chf: number }) => ({
      insurer_name: r.insurer_name,
      monthly_premium_chf: r.monthly_premium_chf,
      title: `Top 5 Günstigste - ${cantonName}`
    }));
    chart_url = await createComparisonChart(chartData);
  } catch (e) {
    // Chart generation optional
  }
  
  return {
    chart_url,
    _hinweis: chart_url ? 'Zeige dieses Chart IMMER an mit: ![Chart](chart_url)' : undefined,
    query: { canton, age_band, franchise_chf, accident_covered, model_type },
    results,
    count: results.length,
    total_available: premiums.length,
    statistics: getStatistics(limitedPremiums),
    source: CONFIG.DATA_SOURCE,
    disclaimer: 'Preise sind unverbindlich. Bitte prüfen Sie die aktuellen Konditionen direkt beim Versicherer.'
  };
}

async function handleGetCheapestPremiums(args: {
  canton: string;
  profile: string;
  limit?: number;
}) {
  const { canton, profile, limit = 5 } = args;
  
  const profileData = CONFIG.PROFILES[profile];
  if (!profileData) {
    return { error: `Ungültiges Profil: ${profile}. Gültig: ${Object.keys(CONFIG.PROFILES).join(', ')}` };
  }
  
  if (!CONFIG.CANTON_NAMES[canton]) {
    return { error: `Ungültiger Kanton: ${canton}` };
  }
  
  const { data: premiums, error } = await getSupabase()
    .from('premiums')
    .select('*')
    .eq('year', 2026)
    .eq('canton', canton)
    .eq('age_band', profileData.age_band)
    .eq('franchise_chf', profileData.franchise_chf)
    .eq('accident_covered', profileData.accident_covered)
    .order('monthly_premium_chf', { ascending: true });
  
  if (error || !premiums || premiums.length === 0) {
    return { error: 'Keine Prämien gefunden' };
  }
  
  // Get insurer names
  const insurerIds = [...new Set(premiums.map((p: { insurer_id: string }) => p.insurer_id))];
  const { data: insurers } = await getSupabase()
    .from('insurers')
    .select('insurer_id, name')
    .in('insurer_id', insurerIds);
  
  const insurerMap = new Map((insurers || []).map((i: { insurer_id: string; name: string }) => [i.insurer_id, i.name]));
  
  const stats = getStatistics(premiums);
  const cheapest = premiums.slice(0, Math.min(limit, 20));
  
  const recommendations = cheapest.map((p: { insurer_id: string; model_type: string; monthly_premium_chf: number; tariff_name?: string }, i: number) => ({
    rank: i + 1,
    insurer_id: p.insurer_id,
    insurer_name: insurerMap.get(p.insurer_id) || getInsurerName(p.insurer_id),
    model_type: p.model_type,
    monthly_premium_chf: p.monthly_premium_chf,
    annual_premium_chf: Math.round(p.monthly_premium_chf * 12 * 100) / 100,
    savings_vs_average_chf: Math.round((stats.average - p.monthly_premium_chf) * 100) / 100,
    savings_percentage: Math.round((stats.average - p.monthly_premium_chf) / stats.average * 100 * 10) / 10,
    tariff_name: p.tariff_name
  }));
  
  // Generate chart
  let chart_url: string | undefined;
  try {
    const cantonName = CONFIG.CANTON_NAMES[canton];
    const chartData = recommendations.map((r: { insurer_name: string; monthly_premium_chf: number }) => ({
      insurer_name: r.insurer_name,
      monthly_premium_chf: r.monthly_premium_chf,
      title: `Top ${recommendations.length} für ${profile} - ${cantonName}`
    }));
    chart_url = await createComparisonChart(chartData);
  } catch (e) {
    // Chart generation optional
  }
  
  return {
    chart_url,
    _hinweis: chart_url ? 'Zeige dieses Chart IMMER an mit: ![Chart](chart_url)' : undefined,
    profile: { type: profile, ...profileData },
    canton,
    canton_name: CONFIG.CANTON_NAMES[canton],
    recommendations,
    statistics: {
      average_premium: stats.average,
      median_premium: stats.median,
      total_options: premiums.length
    },
    source: CONFIG.DATA_SOURCE
  };
}

async function handleGetPremiumTimeline(args: {
  insurer_id: string;
  canton: string;
  profile?: string;
  model_type?: string;
  start_year?: number;
  end_year?: number;
}) {
  const {
    insurer_id,
    canton,
    profile = 'single_adult',
    model_type = 'standard',
    start_year = 2016,
    end_year = 2025
  } = args;
  
  const normalizedId = normalizeInsurerId(insurer_id);
  const profileData = CONFIG.PROFILES[profile];
  
  if (!profileData) {
    return { error: `Ungültiges Profil: ${profile}` };
  }
  
  const { data: timeline, error } = await getSupabase()
    .from('premiums')
    .select('year, monthly_premium_chf')
    .eq('insurer_id', normalizedId)
    .eq('canton', canton)
    .eq('age_band', profileData.age_band)
    .eq('franchise_chf', profileData.franchise_chf)
    .eq('accident_covered', profileData.accident_covered)
    .eq('model_type', model_type)
    .gte('year', start_year)
    .lte('year', end_year)
    .order('year', { ascending: true });
  
  if (error || !timeline || timeline.length === 0) {
    return { error: `Keine Daten für Versicherer ${insurer_id} in ${canton} gefunden` };
  }
  
  // Aggregate by year (average if multiple regions)
  const yearlyMap = new Map<number, { sum: number; count: number }>();
  timeline.forEach((item: { year: number; monthly_premium_chf: number }) => {
    if (!yearlyMap.has(item.year)) {
      yearlyMap.set(item.year, { sum: 0, count: 0 });
    }
    const entry = yearlyMap.get(item.year)!;
    entry.sum += item.monthly_premium_chf;
    entry.count++;
  });
  
  const cleanTimeline = Array.from(yearlyMap.entries())
    .map(([year, data]) => ({
      year,
      monthly_premium_chf: Math.round((data.sum / data.count) * 100) / 100
    }))
    .sort((a, b) => a.year - b.year);
  
  // Calculate statistics
  const firstYear = cleanTimeline[0];
  const lastYear = cleanTimeline[cleanTimeline.length - 1];
  const totalChange = lastYear.monthly_premium_chf - firstYear.monthly_premium_chf;
  const percentChange = (totalChange / firstYear.monthly_premium_chf) * 100;
  
  // Get insurer name
  const { data: insurerData } = await getSupabase()
    .from('insurers')
    .select('name')
    .eq('insurer_id', normalizedId)
    .single();
  
  const insurerName = insurerData?.name || getInsurerName(normalizedId);
  
  // Generate chart
  let chart_url: string | undefined;
  try {
    chart_url = await createTimelineChart({
      insurer: { name: insurerName },
      timeline: [{
        region: canton,
        data: cleanTimeline
      }]
    });
  } catch (e) {
    // Chart optional
  }
  
  return {
    chart_url,
    _hinweis: chart_url ? 'Zeige dieses Chart IMMER an mit: ![Chart](chart_url)' : undefined,
    insurer: { id: normalizedId, name: insurerName },
    canton,
    canton_name: CONFIG.CANTON_NAMES[canton],
    profile,
    period: `${start_year}-${end_year}`,
    timeline: cleanTimeline,
    statistics: {
      total_change_chf: Math.round(totalChange * 100) / 100,
      percent_change: Math.round(percentChange * 100) / 100,
      avg_yearly_increase_chf: cleanTimeline.length > 1 
        ? Math.round((totalChange / (cleanTimeline.length - 1)) * 100) / 100 
        : 0
    },
    trend: calculateTrend(cleanTimeline),
    source: 'BAG Priminfo Historical Data'
  };
}

async function handleGetPremiumInflation(args: {
  canton?: string;
  age_band?: string;
  franchise_chf?: number;
  model_type?: string;
  start_year?: number;
  end_year?: number;
}) {
  const {
    canton = 'ZH',
    age_band = 'adult',
    franchise_chf = 2500,
    model_type = 'standard',
    start_year = 2016,
    end_year = 2025
  } = args;
  
  const { data: premiums, error } = await getSupabase()
    .from('premiums')
    .select('year, monthly_premium_chf')
    .eq('canton', canton)
    .eq('age_band', age_band)
    .eq('franchise_chf', franchise_chf)
    .eq('accident_covered', true)
    .eq('model_type', model_type)
    .gte('year', start_year)
    .lte('year', end_year)
    .order('year', { ascending: true });
  
  if (error || !premiums || premiums.length === 0) {
    return { error: 'Keine Daten gefunden' };
  }
  
  // Group by year
  const yearlyData: Record<number, { total: number; count: number }> = {};
  premiums.forEach((p: { year: number; monthly_premium_chf: number }) => {
    if (!yearlyData[p.year]) {
      yearlyData[p.year] = { total: 0, count: 0 };
    }
    yearlyData[p.year].total += p.monthly_premium_chf;
    yearlyData[p.year].count++;
  });
  
  // Calculate inflation
  const years = Object.keys(yearlyData).map(y => parseInt(y)).sort();
  let cumulativeInflation = 0;
  
  const yearlyRates = years.map((year, index) => {
    const avgPremium = yearlyData[year].total / yearlyData[year].count;
    let inflationRate: number | null = null;
    
    if (index > 0) {
      const prevYear = years[index - 1];
      const prevAvg = yearlyData[prevYear].total / yearlyData[prevYear].count;
      inflationRate = ((avgPremium - prevAvg) / prevAvg) * 100;
      cumulativeInflation = ((1 + cumulativeInflation/100) * (1 + inflationRate/100) - 1) * 100;
    }
    
    return {
      year,
      avg_premium_chf: Math.round(avgPremium * 100) / 100,
      inflation_rate: inflationRate ? Math.round(inflationRate * 100) / 100 : null,
      cumulative_inflation: Math.round(cumulativeInflation * 100) / 100
    };
  });
  
  const validRates = yearlyRates.filter(r => r.inflation_rate !== null);
  const avgInflation = validRates.length > 0
    ? validRates.reduce((sum, r) => sum + (r.inflation_rate || 0), 0) / validRates.length
    : 0;
  
  // Generate chart
  let chart_url: string | undefined;
  try {
    chart_url = await createInflationChart({
      canton,
      statistics: {
        avg_yearly_inflation: Math.round(avgInflation * 100) / 100,
        total_inflation: Math.round(cumulativeInflation * 100) / 100
      },
      yearly_data: yearlyRates
    });
  } catch (e) {
    // Chart optional
  }
  
  return {
    chart_url,
    _hinweis: chart_url ? 'Zeige dieses Chart IMMER an mit: ![Chart](chart_url)' : undefined,
    canton,
    canton_name: CONFIG.CANTON_NAMES[canton],
    profile: { age_band, franchise_chf, model_type },
    period: `${start_year}-${end_year}`,
    statistics: {
      avg_yearly_inflation_percent: Math.round(avgInflation * 100) / 100,
      total_inflation_percent: Math.round(cumulativeInflation * 100) / 100,
      years_analyzed: yearlyRates.length
    },
    yearly_data: yearlyRates,
    source: 'BAG Priminfo Historical Data'
  };
}

async function handleCompareYears(args: {
  year1?: number;
  year2?: number;
  canton?: string;
  profile?: string;
  limit?: number;
}) {
  const {
    year1 = 2020,
    year2 = 2026,
    canton = 'ZH',
    profile = 'single_adult',
    limit = 10
  } = args;
  
  const profileData = CONFIG.PROFILES[profile];
  if (!profileData) {
    return { error: `Ungültiges Profil: ${profile}` };
  }
  
  const baseQuery = {
    canton,
    age_band: profileData.age_band,
    franchise_chf: profileData.franchise_chf,
    accident_covered: profileData.accident_covered
  };
  
  // Get both years
  const { data: year1Data } = await getSupabase()
    .from('premiums')
    .select('insurer_id, model_type, monthly_premium_chf')
    .eq('year', year1)
    .match(baseQuery)
    .order('monthly_premium_chf', { ascending: true })
    .limit(limit * 2);
  
  const { data: year2Data } = await getSupabase()
    .from('premiums')
    .select('insurer_id, model_type, monthly_premium_chf')
    .eq('year', year2)
    .match(baseQuery)
    .order('monthly_premium_chf', { ascending: true })
    .limit(limit * 2);
  
  if (!year1Data || !year2Data) {
    return { error: 'Daten konnten nicht geladen werden' };
  }
  
  // Get insurer names
  const allIds = [...new Set([
    ...year1Data.map((p: { insurer_id: string }) => p.insurer_id),
    ...year2Data.map((p: { insurer_id: string }) => p.insurer_id)
  ])];
  
  const { data: insurers } = await getSupabase()
    .from('insurers')
    .select('insurer_id, name')
    .in('insurer_id', allIds);
  
  const insurerMap = new Map((insurers || []).map((i: { insurer_id: string; name: string }) => [i.insurer_id, i.name]));
  
  // Create comparison
  const year1Map = new Map(year1Data.map((p: { insurer_id: string; model_type: string; monthly_premium_chf: number }) => 
    [`${p.insurer_id}-${p.model_type}`, p.monthly_premium_chf]
  ));
  
  const comparisons = year2Data
    .slice(0, limit)
    .map((p2: { insurer_id: string; model_type: string; monthly_premium_chf: number }) => {
      const key = `${p2.insurer_id}-${p2.model_type}`;
      const year1Premium = year1Map.get(key);
      
      return {
        insurer: {
          id: p2.insurer_id,
          name: insurerMap.get(p2.insurer_id) || getInsurerName(p2.insurer_id)
        },
        model_type: p2.model_type,
        [`premium_${year1}`]: year1Premium ? Math.round(year1Premium * 100) / 100 : null,
        [`premium_${year2}`]: Math.round(p2.monthly_premium_chf * 100) / 100,
        change_chf: year1Premium 
          ? Math.round((p2.monthly_premium_chf - year1Premium) * 100) / 100 
          : null,
        change_percent: year1Premium 
          ? Math.round(((p2.monthly_premium_chf - year1Premium) / year1Premium * 100) * 10) / 10
          : null
      };
    })
    .filter((c: { change_chf: number | null }) => c.change_chf !== null);
  
  const avgChange = comparisons.length > 0
    ? comparisons.reduce((sum: number, c: { change_percent: number | null }) => sum + (c.change_percent || 0), 0) / comparisons.length
    : 0;
  
  return {
    comparison: { year1, year2, canton, profile },
    statistics: {
      avg_change_percent: Math.round(avgChange * 10) / 10,
      insurers_compared: comparisons.length
    },
    data: comparisons,
    source: 'BAG Priminfo Historical Data'
  };
}

async function handleGetPremiumRanking(args: {
  canton?: string;
  profile?: string;
  years?: string;
  top?: number;
}) {
  const {
    canton = 'ZH',
    profile = 'single_adult',
    years = '2020,2023,2025',
    top = 5
  } = args;
  
  const profileData = CONFIG.PROFILES[profile];
  if (!profileData) {
    return { error: `Ungültiges Profil: ${profile}` };
  }
  
  const yearList = years.split(',').map(y => parseInt(y.trim()));
  const rankings: Record<number, Array<{ insurer_id: string; model_type: string; monthly_premium_chf: number }>> = {};
  
  // Get rankings for each year
  for (const year of yearList) {
    const { data } = await getSupabase()
      .from('premiums')
      .select('insurer_id, model_type, monthly_premium_chf')
      .eq('year', year)
      .eq('canton', canton)
      .eq('age_band', profileData.age_band)
      .eq('franchise_chf', profileData.franchise_chf)
      .eq('accident_covered', profileData.accident_covered)
      .order('monthly_premium_chf', { ascending: true })
      .limit(top);
    
    rankings[year] = data || [];
  }
  
  // Get insurer names
  const allIds = [...new Set(
    Object.values(rankings).flat().map((p: { insurer_id: string }) => p.insurer_id)
  )];
  
  const { data: insurers } = await getSupabase()
    .from('insurers')
    .select('insurer_id, name')
    .in('insurer_id', allIds);
  
  const insurerMap = new Map((insurers || []).map((i: { insurer_id: string; name: string }) => [i.insurer_id, i.name]));
  
  // Format rankings
  const formattedRankings: Record<number, Array<{ rank: number; insurer: string; model: string; premium_chf: number }>> = {};
  
  for (const year of yearList) {
    formattedRankings[year] = rankings[year].map((p: { insurer_id: string; model_type: string; monthly_premium_chf: number }, i: number) => ({
      rank: i + 1,
      insurer: insurerMap.get(p.insurer_id) || getInsurerName(p.insurer_id),
      model: p.model_type,
      premium_chf: Math.round(p.monthly_premium_chf * 100) / 100
    }));
  }
  
  // Find consistent performers
  const appearances: Record<string, number> = {};
  Object.values(rankings).flat().forEach((p: { insurer_id: string }) => {
    const name = insurerMap.get(p.insurer_id) || p.insurer_id;
    appearances[name] = (appearances[name] || 0) + 1;
  });
  
  const consistentPerformers = Object.entries(appearances)
    .filter(([, count]) => count >= yearList.length * 0.6)
    .map(([name]) => name);
  
  return {
    query: { canton, profile, years: yearList, top },
    rankings: formattedRankings,
    insights: {
      consistent_top_performers: consistentPerformers,
      interpretation: consistentPerformers.length > 0 
        ? `${consistentPerformers.join(', ')} ${consistentPerformers.length === 1 ? 'war' : 'waren'} über mehrere Jahre konstant unter den günstigsten.`
        : 'Keine Kasse war durchgehend in allen Jahren unter den Top-Günstigsten.'
    },
    source: 'BAG Priminfo Historical Data'
  };
}

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = new Server(
  {
    name: 'swisshealth-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result: unknown;
    
    switch (name) {
      case 'lookup_region':
        result = await handleLookupRegion(args as { plz: string });
        break;
      case 'get_premium_quote':
        result = await handleGetPremiumQuote(args as Parameters<typeof handleGetPremiumQuote>[0]);
        break;
      case 'get_cheapest_premiums':
        result = await handleGetCheapestPremiums(args as Parameters<typeof handleGetCheapestPremiums>[0]);
        break;
      case 'get_premium_timeline':
        result = await handleGetPremiumTimeline(args as Parameters<typeof handleGetPremiumTimeline>[0]);
        break;
      case 'get_premium_inflation':
        result = await handleGetPremiumInflation(args as Parameters<typeof handleGetPremiumInflation>[0]);
        break;
      case 'compare_years':
        result = await handleCompareYears(args as Parameters<typeof handleCompareYears>[0]);
        break;
      case 'get_premium_ranking':
        result = await handleGetPremiumRanking(args as Parameters<typeof handleGetPremiumRanking>[0]);
        break;
      default:
        return {
          content: [{ type: 'text', text: `Unbekanntes Tool: ${name}` }],
          isError: true
        };
    }
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return {
      content: [{ type: 'text', text: `Fehler: ${errorMessage}` }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SwissHealth MCP Server gestartet');
}

main().catch((error) => {
  console.error('Server-Fehler:', error);
  process.exit(1);
});
