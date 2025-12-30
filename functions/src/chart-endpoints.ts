/**
 * Chart Rendering Endpoint
 * Validiert JWT Tokens, holt Daten aus Supabase, generiert Charts
 * Gen 2 Functions - Optimiert für Performance
 */

import { onRequest } from 'firebase-functions/v2/https';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { validateChartParams, createComparisonChart, createTimelineChart, createInflationChart } from './chart-service';
import { CONFIG } from './config';
import { normalizeInsurerId } from './id-mapping';
import { normalizeRegionName } from './chart-utils';
import { getInsurerName } from './insurer-names';

// Supabase lazy initialization
let supabase: any = null;
function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// CORS Setup (Open für Images)
const corsHandler = cors({
  origin: true,
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
});

// Helper: Error Response als Bild
function errorImage(): string {
  // 1x1 transparentes PNG
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
}

// ============================================================================
// ENDPOINT: GET /charts/img
// Gen 2 Function - Optimiert für Europa
// FIXED: Signatur-Validierung korrigiert (2025-12-25)
// ============================================================================
export const chartsImg = onRequest(
  {
    region: 'europe-west1',  // Näher an Schweiz!
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 100,
    cors: true
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== 'GET') {
        res.status(405).send('Method not allowed');
        return;
      }

      // Validiere Parameter statt Token
      const paramsData = validateChartParams(req.query);
      
      if (!paramsData) {
        console.error('Invalid chart params or signature');
        // Fallback: Wenn wir in "Debug Mode" wären, könnten wir den Fehler anzeigen.
        // Hier liefern wir einfach kein Bild.
        res.set('Cache-Control', 'no-cache');
        res.redirect(errorImage());
        return;
      }

      const { chartType, params } = paramsData;
      let chartUrl: string;

      try {
        // Hole Daten basierend auf Chart-Typ und generiere Chart
        switch (chartType) {
          case 'timeline': {
            // Timeline-Daten holen (inklusive Region!)
            const normalizedInsurerId = normalizeInsurerId(params.insurer_id || '');
            const profileData = CONFIG.PROFILES[params.profile || 'single_adult'];
            const modelType = params.model_type || 'standard';
            
            const { data: timeline, error } = await getSupabase()
              .from('premiums')
              .select('year, monthly_premium_chf, region_code') // region_code ist der korrekte Spaltenname
              .eq('insurer_id', normalizedInsurerId)
              .eq('canton', params.canton)
              .eq('age_band', profileData.age_band)
              .eq('franchise_chf', profileData.franchise_chf)
              .eq('accident_covered', profileData.accident_covered)
              .eq('model_type', modelType)
              .gte('year', params.start_year || 2016)
              .lte('year', params.end_year || 2025)
              .order('year', { ascending: true });

            if (error || !timeline || timeline.length === 0) {
              console.error('Timeline fetch error:', error);
              res.redirect(errorImage());
              return;
            }

            // Gruppiere nach Regionen (mit normalisierten Namen)
            const regionsMap = new Map<string, any[]>();
            timeline.forEach((item: any) => {
              // Normalisiere region_code zu einheitlichem Format
              const regionCode = item.region_code || 'UNKNOWN';
              const regionName = normalizeRegionName(regionCode);
              
              if (!regionsMap.has(regionName)) {
                regionsMap.set(regionName, []);
              }
              regionsMap.get(regionName)!.push({
                year: item.year,
                monthly_premium_chf: item.monthly_premium_chf
              });
            });

            // Bereite Datasets vor
            const datasets = Array.from(regionsMap.entries()).map(([region, data]) => ({
              region,
              data: data.sort((a, b) => a.year - b.year)
            }));

            // Berechne Statistiken (basierend auf der ersten Region oder Durchschnitt - vereinfacht)
            // Wir nehmen einfach die erste Region für die Text-Statistik im Subtitle,
            // da der Chart selbst jetzt die volle Wahrheit zeigt.
            const mainDataset = datasets[0].data;
            const firstYear = mainDataset[0];
            const lastYear = mainDataset[mainDataset.length - 1];
            const totalChange = lastYear.monthly_premium_chf - firstYear.monthly_premium_chf;
            const percentChange = (totalChange / firstYear.monthly_premium_chf) * 100;

            // Hole Versicherer-Name (aus Params, dann aus Mapping, dann aus DB)
            let insurerName = params.insurer_name;
            
            if (!insurerName) {
              // Versuche zuerst unser lokales Mapping
              insurerName = getInsurerName(normalizedInsurerId);
              
              // Falls immer noch generisch, versuche DB
              if (insurerName.startsWith('Versicherer')) {
                const { data: insurerData } = await getSupabase()
                  .from('insurers')
                  .select('name')
                  .eq('insurer_id', normalizedInsurerId)
                  .single();
                if (insurerData?.name) {
                  insurerName = insurerData.name;
                }
              }
            }

            // Chart-Daten zusammenstellen
            const chartData = {
              insurer: {
                id: normalizedInsurerId,
                name: insurerName || `Versicherer ${normalizedInsurerId}`
              },
              canton: params.canton,
              profile: params.profile,
              period: `${params.start_year || 2016}-${params.end_year || 2025}`,
              timeline: datasets, // Neue Struktur: Array von Datasets
              statistics: {
                total_change_chf: Math.round(totalChange * 100) / 100,
                percent_change: Math.round(percentChange * 100) / 100
              }
            };

            chartUrl = await createTimelineChart(chartData);
            break;
          }

          case 'inflation': {
            // Inflation-Daten holen
            const { data: premiums, error } = await getSupabase()
              .from('premiums')
              .select('year, monthly_premium_chf')
              .eq('canton', params.canton || 'ZH')
              .eq('age_band', params.age_band || 'adult')
              .eq('franchise_chf', params.franchise_chf || 2500)
              .eq('accident_covered', params.accident_covered !== false)
              .eq('model_type', params.model_type || 'standard')
              .gte('year', params.start_year || 2016)
              .lte('year', params.end_year || 2025)
              .order('year', { ascending: true });

            if (error || !premiums || premiums.length === 0) {
              console.error('Inflation fetch error:', error);
              res.redirect(errorImage());
              return;
            }

            // Gruppiere nach Jahr
            const yearlyData: any = {};
            premiums.forEach((p: any) => {
              if (!yearlyData[p.year]) {
                yearlyData[p.year] = { total: 0, count: 0 };
              }
              yearlyData[p.year].total += p.monthly_premium_chf;
              yearlyData[p.year].count += 1;
            });

            // Berechne Inflation
            const years = Object.keys(yearlyData).map(y => parseInt(y)).sort();
            let cumulativeInflation = 0;
            const yearlyRates = years.map((year, index) => {
              const avgPremium = yearlyData[year].total / yearlyData[year].count;
              let inflationRate = null;
              
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

            const validRates = yearlyRates.filter((r: any) => r.inflation_rate !== null);
            const avgInflation = validRates.length > 0
              ? validRates.reduce((sum: number, r: any) => sum + r.inflation_rate, 0) / validRates.length
              : 0;

            const chartData = {
              canton: params.canton || 'ZH',
              statistics: {
                avg_yearly_inflation: Math.round(avgInflation * 100) / 100,
                total_inflation: Math.round(cumulativeInflation * 100) / 100
              },
              yearly_data: yearlyRates
            };

            chartUrl = await createInflationChart(chartData);
            break;
          }

          case 'comparison': {
            // Quote/Cheapest-Daten holen
            const profileData = CONFIG.PROFILES[params.profile || 'single_adult'];
            
            let query = getSupabase()
              .from('premiums')
              .select('*')
              .eq('year', 2026)
              .eq('canton', params.canton)
              .eq('age_band', params.age_band || profileData?.age_band || 'adult')
              .eq('franchise_chf', params.franchise_chf || profileData?.franchise_chf || 2500)
              .eq('accident_covered', params.accident_covered !== undefined ? params.accident_covered : (profileData?.accident_covered || false))
              .order('monthly_premium_chf', { ascending: true })
              .limit(params.limit || 5);

            if (params.model_type) {
              query = query.eq('model_type', params.model_type);
            }

            const { data: premiums, error } = await query;

            if (error || !premiums || premiums.length === 0) {
              console.error('Comparison fetch error:', error);
              res.redirect(errorImage());
              return;
            }

            // Hole Versicherer-Namen
            const uniqueInsurerIds = [...new Set(premiums.map((p: any) => p.insurer_id))];
            const { data: insurers } = await getSupabase()
              .from('insurers')
              .select('insurer_id, name')
              .in('insurer_id', uniqueInsurerIds);

            const insurerMap = new Map(
              (insurers || []).map((i: any) => [i.insurer_id, i.name])
            );

            const cantonName = params.canton ? CONFIG.CANTON_NAMES[params.canton] : 'Schweiz';
            const chartData = premiums.map((p: any) => ({
              insurer_name: insurerMap.get(p.insurer_id) || getInsurerName(p.insurer_id),
              monthly_premium_chf: p.monthly_premium_chf,
              title: `Top ${params.limit || 5} Günstigste - ${cantonName}`,
              subtitle: `${params.age_band === 'adult' ? 'Erwachsene' : params.age_band === 'young_adult' ? 'Junge Erwachsene' : 'Kinder'} | CHF ${params.franchise_chf || 2500} Franchise`,
              canton: cantonName,
              profile: params.profile
            }));

            chartUrl = await createComparisonChart(chartData);
            break;
          }

          default:
            console.error('Unknown chart type:', chartType);
            res.redirect(errorImage());
            return;
        }

        // Cache Chart für 1 Stunde
        res.set('Cache-Control', 'public, max-age=3600');
        
        // Lade Bild von QuickChart und streame es
        const https = require('https');
        const http = require('http');
        
        const protocol = chartUrl.startsWith('https') ? https : http;
        
        protocol.get(chartUrl, (chartRes: any) => {
          // Setze Content-Type vom QuickChart Response
          res.set('Content-Type', chartRes.headers['content-type'] || 'image/png');
          
          // Stream das Bild direkt zum Client
          chartRes.pipe(res);
        }).on('error', (err: any) => {
          console.error('QuickChart fetch error:', err);
          res.set('Cache-Control', 'no-cache');
          res.set('Content-Type', 'image/png');
          res.send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));
        });
        
      } catch (error: any) {
        console.error('Chart generation error:', error);
        res.set('Cache-Control', 'no-cache');
        res.set('Content-Type', 'image/png');
        res.send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));
      }
    });
  });

// Test Endpoint entfernt (wird nicht mehr gebraucht im Production-Build)
export const chartsTest = onRequest(
  { region: 'europe-west1' },
  (req, res) => {
    res.status(404).send('Test endpoint disabled in production');
  }
);
