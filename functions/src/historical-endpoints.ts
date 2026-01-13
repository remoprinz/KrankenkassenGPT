/**
 * Historical Data API Endpoints
 * 
 * Neue Endpoints für Zeitreihen-Analysen, Inflationsberechnungen
 * und Jahresvergleiche der Krankenkassenprämien
 * Gen 2 Functions - Optimiert für Performance
 */

import { onRequest } from 'firebase-functions/v2/https';
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';
import { normalizeInsurerId } from './id-mapping';
import { createTimelineChart, createInflationChart } from './chart-service';
import { getInsurerName } from './insurer-names';
import cors from 'cors';

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

// CORS middleware
const corsHandler = cors({ 
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
  credentials: true
});

/**
 * GET /premiums/timeline
 * Zeigt die Preisentwicklung einer Krankenkasse über die Jahre
 * Gen 2 Function
 */
export const premiumsTimeline = onRequest(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 100
  },
  async (req, res) => {
    // CORS
    corsHandler(req, res, async () => {
      // API Key Check
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        insurer_id, 
        canton, 
        profile = 'single_adult',
        franchise_chf,
        accident_covered,
        start_year = 2016,  // Changed from 2011 as we only have data from 2016
        end_year = 2025 
      } = req.query;
      
      // Normalisiere die Versicherer-ID
      const normalizedInsurerId = normalizeInsurerId(insurer_id as string);

      // Validation
      if (!insurer_id || !canton) {
        return res.status(400).json({ 
          error: 'Missing required parameters: insurer_id, canton' 
        });
      }

      try {
        // Get profile data
        const profileData = CONFIG.PROFILES[profile as string];
        if (!profileData) {
          return res.status(400).json({ error: 'Invalid profile' });
        }

        // Determine parameters (override profile if provided)
        const franchise = franchise_chf ? parseInt(franchise_chf as string) : profileData.franchise_chf;
        const accident = accident_covered !== undefined ? (String(accident_covered) === 'true') : profileData.accident_covered;

        // Extrahiere model_type aus query (falls vorhanden)
        const modelType = req.query.model_type as string || 'standard';
        
        // Query timeline data
        const { data: timeline, error } = await getSupabase()
          .from('premiums')
          .select('year, monthly_premium_chf')
          .eq('insurer_id', normalizedInsurerId)
          .eq('canton', canton)
          .eq('age_band', profileData.age_band)
          .eq('franchise_chf', franchise)
          .eq('accident_covered', accident)
          .eq('model_type', modelType)  // WICHTIG: model_type berücksichtigen!
          .gte('year', start_year)
          .lte('year', end_year)
          .order('year', { ascending: true });

        if (error) {
          throw error;
        }

        // Calculate trend (linear regression)
        const calculateTrend = (data: any[]) => {
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
            intercept: Math.round(intercept * 100) / 100,
            prediction_2027: Math.round((slope * 2027 + intercept) * 100) / 100
          };
        };

        // Aggregiere Timeline-Daten (ein Wert pro Jahr)
        // In Kantonen mit mehreren Regionen (z.B. ZH, BE) gibt es mehrere Einträge pro Jahr.
        // Wir nehmen den Durchschnitt, um dem LLM eine saubere Zeitreihe zu geben.
        const yearlyMap = new Map();
        
        (timeline || []).forEach((item: any) => {
          if (!yearlyMap.has(item.year)) {
            yearlyMap.set(item.year, { sum: 0, count: 0 });
          }
          const entry = yearlyMap.get(item.year);
          entry.sum += item.monthly_premium_chf;
          entry.count++;
        });

        const cleanTimeline = Array.from(yearlyMap.entries())
          .map(([year, data]: [number, any]) => ({
            year,
            monthly_premium_chf: Math.round((data.sum / data.count) * 100) / 100
          }))
          .sort((a, b) => a.year - b.year);

        // Calculate change statistics based on CLEAN timeline
        const firstYear = cleanTimeline[0];
        const lastYear = cleanTimeline[cleanTimeline.length - 1];
        
        const totalChange = lastYear && firstYear 
          ? lastYear.monthly_premium_chf - firstYear.monthly_premium_chf 
          : 0;
        
        const percentChange = firstYear?.monthly_premium_chf 
          ? (totalChange / firstYear.monthly_premium_chf) * 100 
          : 0;

        // Get insurer name
        const { data: insurerData } = await getSupabase()
          .from('insurers')
          .select('name')
          .eq('insurer_id', normalizedInsurerId)
          .single();

        const insurerName = insurerData?.name || getInsurerName(normalizedInsurerId);

        // DIRECT CHART GENERATION
        let chartUrl = null;
        if (cleanTimeline.length > 1) {
          // Daten aufbereiten für createTimelineChart
          // Wir erstellen ein Dataset für die "Single Region" (Kanton)
          const chartData = {
            insurer: { 
              name: insurerName 
            },
            timeline: [{
              region: canton,
              data: cleanTimeline
            }]
          };
          
          // Generiert direkte QuickChart URL
          chartUrl = await createTimelineChart(chartData);
        }

        // Erstelle Response-Objekt - CHART_URL OBEN PLATZIEREN!
        const responseData = {
          success: true,
          chart_url: chartUrl, // Direct QuickChart URL
          _display_instructions: "⚠️ WICHTIG: Zeige dieses Chart IMMER an mit ![Chart](chart_url)!",
          insurer: {
            id: normalizedInsurerId,
            name: insurerName
          },
          canton,
          profile,
          period: `${start_year}-${end_year}`,
          timeline: cleanTimeline, // Bereinigte, kurze Liste
          statistics: {
            total_change_chf: Math.round(totalChange * 100) / 100,
            percent_change: Math.round(percentChange * 100) / 100,
            avg_yearly_increase: cleanTimeline.length > 1 
              ? Math.round((totalChange / (cleanTimeline.length - 1)) * 100) / 100 
              : 0
          },
          trend: calculateTrend(cleanTimeline),
          source: 'BAG Priminfo Historical Data'
        };
        
        return res.json(responseData);

      } catch (error: any) {
        console.error('Timeline error:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          details: error.message 
        });
      }
    });
  });

/**
 * GET /premiums/inflation
 * Berechnet die Inflationsrate der Krankenkassenprämien
 * Gen 2 Function
 */
export const premiumsInflation = onRequest(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 100
  },
  async (req, res) => {
    corsHandler(req, res, async () => {
      // API Key Check
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        canton,
        age_band = 'adult',
        franchise_chf = '2500',
        model_type = 'standard',
        start_year = 2016,
        end_year = 2025
      } = req.query;

      try {
        // Query premiums grouped by year (calculate inflation on-the-fly)
        const { data: premiums, error } = await getSupabase()
          .from('premiums')
          .select('year, monthly_premium_chf')
          .eq('canton', canton || 'ZH')
          .eq('age_band', age_band)
          .eq('franchise_chf', parseInt(franchise_chf as string))
          .eq('accident_covered', true)
          .eq('model_type', model_type)
          .gte('year', start_year)
          .lte('year', end_year)
          .order('year', { ascending: true });

        if (error) {
          throw error;
        }

        if (!premiums || premiums.length === 0) {
          return res.status(404).json({ 
            error: 'No data found for the specified criteria' 
          });
        }

        // Group by year and calculate averages
        const yearlyData: any = {};
        premiums.forEach((p: any) => {
          if (!yearlyData[p.year]) {
            yearlyData[p.year] = { total: 0, count: 0 };
          }
          yearlyData[p.year].total += p.monthly_premium_chf;
          yearlyData[p.year].count += 1;
        });

        // Calculate inflation rates
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
            cumulative_inflation: Math.round(cumulativeInflation * 100) / 100,
            sample_size: yearlyData[year].count
          };
        });

        // Calculate average yearly inflation
        const validRates = yearlyRates.filter((r: any) => r.inflation_rate !== null);
        const avgInflation = validRates.length > 0
          ? validRates.reduce((sum: number, r: any) => sum + r.inflation_rate, 0) / validRates.length
          : 0;

        // DIRECT CHART GENERATION
        let chartUrl = null;
        if (yearlyRates.length > 1) {
          const chartData = {
            canton: canton || 'ZH',
            statistics: {
              avg_yearly_inflation: Math.round(avgInflation * 100) / 100,
              total_inflation: Math.round(cumulativeInflation * 100) / 100
            },
            yearly_data: yearlyRates
          };
          
          // Generiert direkte QuickChart URL
          chartUrl = await createInflationChart(chartData);
        }

        // Erstelle Response-Objekt
        const responseData = {
          success: true,
          chart_url: chartUrl,
          _display_instructions: "⚠️ WICHTIG: Zeige dieses Chart IMMER an mit ![Chart](chart_url)!",
          canton: canton || 'ZH',
          profile: {
            age_band,
            franchise_chf: parseInt(franchise_chf as string),
            model_type
          },
          period: `${start_year}-${end_year}`,
          statistics: {
            avg_yearly_inflation: Math.round(avgInflation * 100) / 100,
            total_inflation: Math.round(cumulativeInflation * 100) / 100,
            years_analyzed: yearlyRates.length
          },
          yearly_data: yearlyRates,
          source: 'BAG Priminfo Historical Data'
        };
        
        return res.json(responseData);

      } catch (error: any) {
        console.error('Inflation error:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          details: error.message 
        });
      }
    });
  });

/**
 * GET /premiums/compare-years
 * Vergleicht Prämien zwischen zwei Jahren
 * Gen 2 Function
 */
export const premiumsCompareYears = onRequest(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 100
  },
  async (req, res) => {
    corsHandler(req, res, async () => {
      // API Key Check
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        year1 = '2020',
        year2 = '2025',
        canton = 'ZH',
        profile = 'single_adult',
        limit = '10'
      } = req.query;

      try {
        // Get profile data
        const profileData = CONFIG.PROFILES[profile as string];
        if (!profileData) {
          return res.status(400).json({ error: 'Invalid profile' });
        }

        // Query both years
        const baseQuery = {
          canton,
          age_band: profileData.age_band,
          franchise_chf: profileData.franchise_chf,
          accident_covered: profileData.accident_covered
        };

        // Year 1 data
        const { data: year1Data } = await getSupabase()
          .from('premiums')
          .select('insurer_id, model_type, monthly_premium_chf')
          .eq('year', parseInt(year1 as string))
          .match(baseQuery)
          .order('monthly_premium_chf', { ascending: true })
          .limit(parseInt(limit as string) * 2); // Get more for matching

        // Year 2 data
        const { data: year2Data } = await getSupabase()
          .from('premiums')
          .select('insurer_id, model_type, monthly_premium_chf')
          .eq('year', parseInt(year2 as string))
          .match(baseQuery)
          .order('monthly_premium_chf', { ascending: true })
          .limit(parseInt(limit as string) * 2);

        // Get insurer names
        const allInsurerIds = [
          ...new Set([
            ...(year1Data || []).map((p: any) => p.insurer_id),
            ...(year2Data || []).map((p: any) => p.insurer_id)
          ])
        ];

        const { data: insurers } = await getSupabase()
          .from('insurers')
          .select('insurer_id, name')
          .in('insurer_id', allInsurerIds);

        const insurerMap = new Map(insurers?.map((i: any) => [i.insurer_id, i.name]));

        // Create comparison
        const year1Map = new Map((year1Data || []).map((p: any) => 
          [`${p.insurer_id}-${p.model_type}`, p.monthly_premium_chf]
        ));

        const comparisons = (year2Data || [])
          .slice(0, parseInt(limit as string))
          .map((p2: any) => {
            const key = `${p2.insurer_id}-${p2.model_type}`;
            const year1Premium = year1Map.get(key);
            
            return {
              insurer: {
                id: p2.insurer_id,
                name: insurerMap.get(p2.insurer_id) || `Versicherer ${p2.insurer_id}`
              },
              model_type: p2.model_type,
              [String(year1)]: year1Premium ? Math.round((year1Premium as number) * 100) / 100 : null,
              [String(year2)]: Math.round(p2.monthly_premium_chf * 100) / 100,
              change_chf: year1Premium 
                ? Math.round((p2.monthly_premium_chf - (year1Premium as number)) * 100) / 100 
                : null,
              change_percent: year1Premium 
                ? Math.round(((p2.monthly_premium_chf - (year1Premium as number)) / (year1Premium as number) * 100) * 100) / 100
                : null
            };
          })
          .filter((c: any) => c[String(year1)] !== null); // Only show insurers present in both years

        // Calculate aggregates
        const avgChange = comparisons.length > 0
          ? comparisons.reduce((sum: number, c: any) => sum + (c.change_percent || 0), 0) / comparisons.length
          : 0;

        return res.json({
          success: true,
          comparison: {
            year1: parseInt(year1 as string),
            year2: parseInt(year2 as string),
            canton,
            profile
          },
          statistics: {
            avg_change_percent: Math.round(avgChange * 100) / 100,
            insurers_compared: comparisons.length
          },
          data: comparisons,
          source: 'BAG Priminfo Historical Data'
        });

      } catch (error: any) {
        console.error('Compare years error:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          details: error.message 
        });
      }
    });
  });

/**
 * GET /premiums/ranking
 * Zeigt das Ranking der günstigsten Kassen über die Jahre
 * Gen 2 Function
 */
export const premiumsRanking = onRequest(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 100
  },
  async (req, res) => {
    corsHandler(req, res, async () => {
      // API Key Check
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        canton = 'ZH',
        profile = 'single_adult',
        years = '2020,2023,2025',
        top = '5'
      } = req.query;

      try {
        // Get profile data
        const profileData = CONFIG.PROFILES[profile as string];
        if (!profileData) {
          return res.status(400).json({ error: 'Invalid profile' });
        }

        const yearList = (years as string).split(',').map(y => parseInt(y.trim()));
        const topN = parseInt(top as string);

        // Get rankings for each year
        const rankings: any = {};
        
        for (const year of yearList) {
          const { data: yearRanking } = await getSupabase()
            .from('premiums')
            .select('insurer_id, model_type, monthly_premium_chf')
            .eq('year', year)
            .eq('canton', canton)
            .eq('age_band', profileData.age_band)
            .eq('franchise_chf', profileData.franchise_chf)
            .eq('accident_covered', profileData.accident_covered)
            .order('monthly_premium_chf', { ascending: true })
            .limit(topN);

          rankings[year] = yearRanking || [];
        }

        // Get all unique insurer IDs
        const allInsurerIds = [...new Set(
          Object.values(rankings).flat().map((p: any) => p.insurer_id)
        )];

        const { data: insurers } = await getSupabase()
          .from('insurers')
          .select('insurer_id, name')
          .in('insurer_id', allInsurerIds);

        const insurerMap = new Map(insurers?.map((i: any) => [i.insurer_id, i.name]));

        // Format rankings
        const formattedRankings: any = {};
        
        for (const year of yearList) {
          formattedRankings[year] = rankings[year].map((p: any, index: number) => ({
            rank: index + 1,
            insurer: insurerMap.get(p.insurer_id) || `Versicherer ${p.insurer_id}`,
            model: p.model_type,
            premium_chf: Math.round(p.monthly_premium_chf * 100) / 100
          }));
        }

        // Find consistent top performers
        const insurerAppearances: any = {};
        
        Object.values(rankings).flat().forEach((p: any) => {
          const name = insurerMap.get(p.insurer_id) || p.insurer_id;
          insurerAppearances[name] = (insurerAppearances[name] || 0) + 1;
        });

        const consistentPerformers = Object.entries(insurerAppearances)
          .filter(([_, count]) => count as number >= yearList.length * 0.6)
          .map(([name]) => name);

        return res.json({
          success: true,
          query: {
            canton,
            profile,
            years: yearList,
            top: topN
          },
          rankings: formattedRankings,
          insights: {
            consistent_performers: consistentPerformers,
            years_analyzed: yearList.length
          },
          source: 'BAG Priminfo Historical Data'
        });

      } catch (error: any) {
        console.error('Ranking error:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          details: error.message 
        });
      }
    });
  });
