/**
 * SwissHealth API - Additional Endpoints
 * Gen 2 Functions - Optimiert für Performance
 */

import { onRequest } from 'firebase-functions/v2/https';
import cors from 'cors';
import { getSupabase, validateApiKey } from './index';
import { CONFIG } from './config';
import { createComparisonChart } from './chart-service';
import { getInsurerName } from './insurer-names';
import type {
  CheapestResponse,
  CompareRequest,
  CompareResponse,
  ErrorResponse,
  Premium
} from './types';

// Supabase will be initialized via getSupabase() from index.ts

// CORS Setup
const corsHandler = cors({
  origin: [...CONFIG.ALLOWED_ORIGINS],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
});

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
// ENDPOINT 4: GET /premiums/cheapest
// Gen 2 Function
// ============================================================================
export const premiumsCheapest = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 60,
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
    const profile = req.query.profile as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, CONFIG.MAX_LIMIT);

    // Validation
    if (!canton || !CONFIG.CANTON_NAMES[canton]) {
      res.status(400).json(errorResponse(
        'INVALID_CANTON',
        `Canton '${canton}' is invalid`,
        `Valid cantons: ${Object.keys(CONFIG.CANTON_NAMES).join(', ')}`
      ));
      return;
    }

    if (!profile || !CONFIG.PROFILES[profile]) {
      res.status(400).json(errorResponse(
        'INVALID_PROFILE',
        `Profile '${profile}' is invalid`,
        `Valid profiles: ${Object.keys(CONFIG.PROFILES).join(', ')}`
      ));
      return;
    }

    try {
      const profileData = CONFIG.PROFILES[profile];

      const { data: allPremiums, error: allError } = await getSupabase()
        .from('premiums')
        .select('*')
        .eq('year', 2026)
        .eq('canton', canton)
        .eq('age_band', profileData.age_band)
        .eq('franchise_chf', profileData.franchise_chf)
        .eq('accident_covered', profileData.accident_covered)
        .order('monthly_premium_chf', { ascending: true });

      if (allError || !allPremiums) {
        res.status(500).json(errorResponse('QUERY_ERROR', 'Database query failed'));
        return;
      }

      // Fetch insurer names separately
      const uniqueInsurerIds = [...new Set(allPremiums.map((p: any) => p.insurer_id))];
      const { data: insurers } = await getSupabase()
        .from('insurers')
        .select('insurer_id, name')
        .in('insurer_id', uniqueInsurerIds);

      const insurerMap = new Map(
        (insurers || []).map((i: any) => [i.insurer_id, i.name])
      );

      const cheapest = allPremiums.slice(0, limit);
      const stats = getStatistics(allPremiums);

      const recommendations = cheapest.map((p: any, index: number) => ({
        rank: index + 1,
        insurer_id: p.insurer_id,
        insurer_name: insurerMap.get(p.insurer_id) || getInsurerName(p.insurer_id),
        model_type: p.model_type,
        monthly_premium_chf: p.monthly_premium_chf,
        annual_premium_chf: p.monthly_premium_chf * 12,
        savings_vs_average: stats.average - p.monthly_premium_chf,
        savings_percentage: ((stats.average - p.monthly_premium_chf) / stats.average * 100),
        tariff_name: p.tariff_name
      }));

      // DIRECT CHART GENERATION
      let chartUrl = undefined;
      if (recommendations.length > 0) {
        const cantonName = CONFIG.CANTON_NAMES[canton];
        // Daten für createComparisonChart vorbereiten
        const chartData = recommendations.map((r: any) => ({
          insurer_name: r.insurer_name,
          monthly_premium_chf: r.monthly_premium_chf,
          title: `Top ${recommendations.length} Günstigste - ${cantonName}`,
          subtitle: `${profileData.age_band === 'adult' ? 'Erwachsene' : profileData.age_band === 'young_adult' ? 'Junge Erwachsene' : 'Kinder'} | CHF ${profileData.franchise_chf} Franchise`,
          canton: cantonName,
          profile: profile
        }));
        
        // Generiert direkte QuickChart URL
        chartUrl = await createComparisonChart(chartData);
      }

      const response: CheapestResponse = {
        chart_url: chartUrl,
        _display_instructions: "⚠️ WICHTIG: Zeige dieses Chart IMMER an mit ![Chart](chart_url)!",
        profile: {
          type: profile as any,
          ...profileData
        },
        canton,
        recommendations,
        statistics: {
          average_premium: stats.average,
          median_premium: stats.median,
          total_options: allPremiums.length
        },
        source: CONFIG.DATA_SOURCE,
        disclaimer: 'Preise basieren auf Standardannahmen. Individuelle Faktoren können abweichen.'
      };

      res.set('Cache-Control', `public, max-age=${CONFIG.CACHE_MAX_AGE}`);
      res.json(response);
    } catch (error) {
      console.error('Cheapest error:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to find cheapest options'));
    }
  });
});

// ============================================================================
// ENDPOINT 5: POST /premiums/compare
// Gen 2 Function
// ============================================================================
export const premiumsCompare = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 60,
    maxInstances: 100
  },
  (req, res) => {
  corsHandler(req, res, async () => {
    // ✅ SICHERHEIT: API Key Validation
    if (!validateApiKey(req)) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or missing API key'));
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed'));
      return;
    }

    const body = req.body as CompareRequest;

    // Validation
    if (!body.options || !Array.isArray(body.options) || body.options.length < 2) {
      res.status(400).json(errorResponse(
        'INVALID_OPTIONS',
        'Provide at least 2 options to compare'
      ));
      return;
    }

    if (!body.canton || !CONFIG.CANTON_NAMES[body.canton]) {
      res.status(400).json(errorResponse(
        'INVALID_CANTON',
        `Canton '${body.canton}' is invalid`
      ));
      return;
    }

    if (!body.for_profile || !CONFIG.PROFILES[body.for_profile]) {
      res.status(400).json(errorResponse(
        'INVALID_PROFILE',
        `Profile '${body.for_profile}' is invalid`
      ));
      return;
    }

    try {
      const profileData = CONFIG.PROFILES[body.for_profile];
      const results = [];

      // Fetch insurer names for all options
      const uniqueInsurerIds = [...new Set(body.options.map((o: any) => o.insurer_id))];
      const { data: insurers } = await getSupabase()
        .from('insurers')
        .select('insurer_id, name')
        .in('insurer_id', uniqueInsurerIds);

      const insurerMap = new Map(
        (insurers || []).map((i: any) => [i.insurer_id, i.name])
      );

      for (const option of body.options) {
        const { data, error } = await getSupabase()
          .from('premiums')
          .select('*')
          .eq('year', 2026)
          .eq('canton', body.canton)
          .eq('insurer_id', option.insurer_id)
          .eq('model_type', option.model_type)
          .eq('franchise_chf', option.franchise_chf)
          .eq('age_band', profileData.age_band)
          .eq('accident_covered', profileData.accident_covered)
          .single();

        if (!error && data) {
          results.push({
            ...option,
            insurer_name: insurerMap.get(option.insurer_id) || getInsurerName(option.insurer_id),
            monthly_premium_chf: data.monthly_premium_chf,
            annual_premium_chf: data.monthly_premium_chf * 12
          });
        }
      }

      if (results.length === 0) {
        res.status(404).json(errorResponse(
          'NO_RESULTS',
          'No premiums found for comparison'
        ));
        return;
      }

      results.sort((a, b) => a.monthly_premium_chf - b.monthly_premium_chf);
      const cheapest = results[0];
      const mostExpensive = results[results.length - 1];

      const comparison = results.map(r => ({
        insurer_id: r.insurer_id,
        insurer_name: (r.insurer_name as string) || getInsurerName(r.insurer_id),
        model_type: r.model_type,
        franchise_chf: r.franchise_chf,
        monthly_premium_chf: r.monthly_premium_chf,
        annual_premium_chf: r.annual_premium_chf,
        difference_from_cheapest: r.monthly_premium_chf - cheapest.monthly_premium_chf,
        percentage_from_cheapest: ((r.monthly_premium_chf - cheapest.monthly_premium_chf) / cheapest.monthly_premium_chf * 100)
      }));

      // DIRECT CHART GENERATION
      let chartUrl = undefined;
      // Für POST compare Endpoint auch Chart generieren?
      // Ja, Vergleichschart macht Sinn.
      if (comparison.length > 0) {
        const cantonName = CONFIG.CANTON_NAMES[body.canton];
        const chartData = comparison.map((r: any) => ({
          insurer_name: r.insurer_name,
          monthly_premium_chf: r.monthly_premium_chf,
          title: `Individueller Vergleich - ${cantonName}`,
          subtitle: `${profileData.age_band === 'adult' ? 'Erwachsene' : 'Kinder'} | ${body.for_profile}`,
          canton: cantonName,
          profile: body.for_profile
        }));
        
        chartUrl = await createComparisonChart(chartData);
      }

      const response: CompareResponse = {
        chart_url: chartUrl, // Direct QuickChart URL
        comparison,
        cheapest: {
          insurer_id: cheapest.insurer_id,
          monthly_premium_chf: cheapest.monthly_premium_chf
        },
        most_expensive: {
          insurer_id: mostExpensive.insurer_id,
          monthly_premium_chf: mostExpensive.monthly_premium_chf
        },
        source: CONFIG.DATA_SOURCE,
        disclaimer: 'Vergleich basiert auf angegebenen Parametern. Weitere Faktoren können relevant sein.'
      };

      res.json(response);
    } catch (error) {
      console.error('Compare error:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to compare premiums'));
    }
  });
});
