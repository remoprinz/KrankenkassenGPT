/**
 * SwissHealth Firebase Functions API
 * 9 Endpoints für ChatGPT Actions (inkl. historische Daten)
 * Gen 2 Functions - Optimiert für Performance
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';
import { getChartUrl, createComparisonChart } from './chart-service';
import { getInsurerName } from './insurer-names';
import type {
  MetaResponse,
  RegionLookupResponse,
  QuoteResponse,
  ErrorResponse,
  Premium
} from './types';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Lazy initialize Supabase (nur wenn Function aufgerufen wird)
let supabase: any = null;

export function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// CORS Setup
const corsHandler = cors({
  origin: [...CONFIG.ALLOWED_ORIGINS],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
});

// Helper: API Key Validation
export function validateApiKey(req: any): boolean {
  const providedKey = req.get('x-api-key') || req.get('X-API-Key') || req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY;
  return providedKey === expectedKey;
}

// Helper: Error Response
function errorResponse(code: string, message: string, suggestion?: string): ErrorResponse {
  return {
    error: {
      code,
      message,
      suggestion,
      docs: 'https://github.com/remoprinz/KrankenkassenGPT/blob/main/docs/api/API_DOCUMENTATION.md#' + code.toLowerCase(),
      timestamp: new Date().toISOString()
    }
  };
}

// Helper: Get Statistics
function getStatistics(premiums: Premium[]): { min: number; max: number; median: number; average: number } {
  const prices = premiums.map(p => p.monthly_premium_chf).sort((a, b) => a - b);
  return {
    min: prices[0] || 0,
    max: prices[prices.length - 1] || 0,
    median: prices[Math.floor(prices.length / 2)] || 0,
    average: prices.reduce((a, b) => a + b, 0) / prices.length || 0
  };
}

// ============================================================================
// ENDPOINT 1: GET /meta/sources
// Gen 2 Function
// ============================================================================
export const metaSources = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 100
  },
  (req, res) => {
  corsHandler(req, res, async () => {
    // ✅ SICHERHEIT: API Key Validation
    if (!validateApiKey(req)) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or missing API key'));
          return;
        }

    if (req.method !== 'GET') {
      res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'Only GET allowed'));
          return;
        }

    try {
      const { count } = await getSupabase()
          .from('premiums')
          .select('*', { count: 'exact', head: true });

        const response: MetaResponse = {
          current: {
          ...CONFIG.DATA_SOURCE,
          last_updated: new Date().toISOString(),
          records: count || 0
        },
        api_version: CONFIG.API_VERSION
      };

      res.set('Cache-Control', `public, max-age=${CONFIG.CACHE_MAX_AGE}`);
      res.json(response);
    } catch (error) {
      console.error('Meta error:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to retrieve metadata'));
      }
    });
});

// ============================================================================
// ENDPOINT 2: GET /regions/lookup
// Gen 2 Function
// ============================================================================
export const regionsLookup = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 100
  },
  (req, res) => {
  corsHandler(req, res, async () => {
    // ✅ SICHERHEIT: API Key Validation
    if (!validateApiKey(req)) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or missing API key'));
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'Only GET allowed'));
          return;
        }

        const plz = req.query.plz as string;
        if (!plz || !/^\d{4}$/.test(plz)) {
      res.status(400).json(errorResponse(
        'INVALID_PLZ',
        'PLZ must be a 4-digit number',
        'Example: ?plz=8001'
      ));
          return;
        }

    try {
      // PLZ → Region Mapping aus Datenbank
      const { data: location, error: locationError } = await getSupabase()
        .from('locations')
        .select('*')
        .eq('zip_code', plz.padStart(4, '0'))
        .single();
      
      if (locationError || !location) {
        res.status(404).json(errorResponse(
          'PLZ_NOT_FOUND',
          `PLZ ${plz} not found in database`,
          'Please check the PLZ or try a nearby postal code'
        ));
        return;
      }
        
      const response: RegionLookupResponse = {
          plz,
          canton: location.canton,
        canton_name: CONFIG.CANTON_NAMES[location.canton] || location.canton,
        municipality: location.city,
          region_code: location.region_code,
        region_name: CONFIG.REGION_NAMES[location.region_code] || location.region_code
        };

      res.set('Cache-Control', `public, max-age=${CONFIG.CACHE_MAX_AGE}`);
      res.json(response);
    } catch (error) {
      console.error('Region lookup error:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to lookup region'));
      }
    });
});

// ============================================================================
// ENDPOINT 3: GET /premiums/quote
// Gen 2 Function  
// UPDATED: Chart URL Signature Fix (2025-12-25)
// ============================================================================
export const premiumsQuote = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 100
  },
  (req, res) => {
  corsHandler(req, res, async () => {
    // ✅ SICHERHEIT: API Key Validation
    if (!validateApiKey(req)) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or missing API key'));
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'Only GET allowed'));
          return;
        }

        const canton = req.query.canton as string;
    const ageBand = req.query.age_band as string;
        const franchise = parseInt(req.query.franchise_chf as string);
        // DEFAULT: true (die meisten Leute haben Unfallversicherung)
        const accident = req.query.accident_covered !== undefined 
          ? req.query.accident_covered === 'true'
          : true; 
    const modelType = req.query.model_type as string;
    // Limit Parameter (mit robustem Parsing)
    let limit = 10; // Default
    if (req.query.limit) {
      const parsedLimit = parseInt(req.query.limit as string, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 100); // Max 100 für Performance
      }
    }
    console.log('Requested limit:', req.query.limit, 'Parsed limit:', limit);

    // Validation
    if (!canton || !CONFIG.CANTON_NAMES[canton]) {
      res.status(400).json(errorResponse(
        'INVALID_CANTON',
        `Canton '${canton}' is invalid`,
        `Valid cantons: ${Object.keys(CONFIG.CANTON_NAMES).join(', ')}`
      ));
      return;
    }

    if (!['child', 'young_adult', 'adult'].includes(ageBand)) {
      res.status(400).json(errorResponse(
        'INVALID_AGE_BAND',
        'Age must be: child, young_adult, or adult'
      ));
      return;
    }

    if (![0, 100, 200, 300, 400, 500, 600, 1000, 1500, 2000, 2500].includes(franchise)) {
      res.status(400).json(errorResponse(
        'INVALID_FRANCHISE',
        'Invalid franchise amount',
        'Valid franchises: 0, 100, 200, 300, 400, 500, 600, 1000, 1500, 2000, 2500'
      ));
          return;
        }

    try {
      // Query premiums (ohne Foreign Key Join)
      let query = getSupabase()
          .from('premiums')
          .select('*')
        .eq('year', 2026)
          .eq('canton', canton)
          .eq('age_band', ageBand)
          .eq('franchise_chf', franchise)
          .eq('accident_covered', accident)
        .order('monthly_premium_chf', { ascending: true });

        if (modelType) {
          query = query.eq('model_type', modelType);
        }

        const { data: premiums, error } = await query;

        if (error) {
        console.error('Query error:', error);
        res.status(500).json(errorResponse('QUERY_ERROR', 'Database query failed'));
          return;
        }

        if (!premiums || premiums.length === 0) {
        res.status(404).json(errorResponse(
          'NO_RESULTS',
          'No premiums found for these criteria',
          'Try adjusting your search parameters'
        ));
          return;
        }

      // Fetch insurer names separately
      const uniqueInsurerIds = [...new Set(premiums.map((p: any) => p.insurer_id))];
      const { data: insurers } = await getSupabase()
        .from('insurers')
        .select('insurer_id, name')
        .in('insurer_id', uniqueInsurerIds);

      const insurerMap = new Map(
        (insurers || []).map((i: any) => [i.insurer_id, i.name])
      );

      // Limit anwenden (ChatGPT erwartet genau die Anzahl, die es anfragt!)
      const limitedPremiums = premiums.slice(0, limit);
      
      const results = limitedPremiums.map((p: any) => ({
        insurer_id: p.insurer_id,
        insurer_name: insurerMap.get(p.insurer_id) || getInsurerName(p.insurer_id),
        monthly_premium_chf: p.monthly_premium_chf,
        annual_premium_chf: p.monthly_premium_chf * 12,
        model_type: p.model_type,
        canton: p.canton,
        region: CONFIG.REGION_NAMES[p.region_code] || p.region_code,
        tariff_name: p.tariff_name
      }));

      // Chart URL generieren (VOR dem Response-Objekt)
      let chartUrl = undefined;
      if (results.length > 0) {
        try {
          const topResults = results.slice(0, 5); // Max 5 für Chart
          const cantonName = CONFIG.CANTON_NAMES[canton] || canton;
          
          const chartData = topResults.map((r: any) => ({
            insurer_name: r.insurer_name,
            monthly_premium_chf: r.monthly_premium_chf,
            title: `Top ${topResults.length} Günstigste - ${cantonName}`,
            subtitle: `${ageBand === 'adult' ? 'Erwachsene' : ageBand === 'young_adult' ? 'Junge Erwachsene' : 'Kinder'} | CHF ${franchise} Franchise`
          }));

          // Asynchron Chart generieren
          chartUrl = await createComparisonChart(chartData);
        } catch (chartError) {
          console.error('Chart generation failed:', chartError);
          // Fallback zur statischen URL Signatur, falls dynamische Generierung fehlschlägt
          chartUrl = getChartUrl('comparison', {
            canton,
            age_band: ageBand,
            franchise_chf: franchise,
            accident_covered: accident,
            model_type: modelType,
            limit: 5
          });
        }
      }

      const response: QuoteResponse = {
        chart_url: chartUrl,
        _display_instructions: "⚠️ WICHTIG: Zeige dieses Chart IMMER an mit ![Chart](chart_url)!",
        query: {
          canton,
          age_band: ageBand as any,
          franchise_chf: franchise,
          accident_covered: accident,
          model_type: modelType as any
        },
        results,
        count: results.length,
        statistics: getStatistics(limitedPremiums),
        source: CONFIG.DATA_SOURCE,
        disclaimer: 'Preise sind unverbindlich. Bitte prüfen Sie die aktuellen Konditionen direkt beim Versicherer.'
      };

      res.set('Cache-Control', `public, max-age=${CONFIG.CACHE_MAX_AGE}`);
      res.json(response);
    } catch (error) {
      console.error('Quote error:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to generate quote'));
    }
  });
});

// Import additional endpoints
export { premiumsCheapest, premiumsCompare } from './endpoints';

// Import historical data endpoints
export { 
  premiumsTimeline, 
  premiumsInflation, 
  premiumsCompareYears, 
  premiumsRanking 
} from './historical-endpoints';

// Import chart endpoints
export { chartsImg, chartsTest } from './chart-endpoints';

// Import lead endpoints
export { leadsSubmit } from './leads-endpoint';