/**
 * Chart Service Module
 * Generiert JWT-basierte Chart URLs für sichere Visualisierungen
 */

import * as crypto from 'crypto';
import QuickChart from 'quickchart-js';
import { 
  CHART_SIZES, 
  COLOR_SCHEMES, 
  normalizeRegionName,
  getColorForValue 
} from './chart-utils';
import { getInsurerName } from './insurer-names';

// Chart Configuration Types
export interface ChartToken {
  chartType: 'comparison' | 'timeline' | 'inflation';
  params: {
    insurer_id?: string;
    insurer_name?: string;
    canton?: string;
    profile?: string;
    model_type?: string;
    start_year?: number;
    end_year?: number;
    age_band?: string;
    franchise_chf?: number;
    accident_covered?: boolean;
    limit?: number;
  };
}

// Legacy Design System (für Rückwärtskompatibilität)
const CHART_THEME = {
  colors: {
    ...COLOR_SCHEMES.primary,
    accent: '#dc2626',
    secondary: '#64748b',
    background: '#ffffff',
    grid: '#e5e7eb'
  },
  fonts: {
    family: 'sans-serif',
    sizes: CHART_SIZES.mobile.fontSize
  },
  mobile: CHART_SIZES.mobile
};

export function getChartUrl(chartType: 'comparison' | 'timeline' | 'inflation', params: any): string {
  const baseUrl = process.env.FUNCTIONS_URL || 'https://krankenkassen.ragit.io';
  const secret = process.env.JWT_SECRET || process.env.API_KEY || 'fallback-secret';
  
  // Füge type zu params hinzu, dann sortiere ALLE gemeinsam
  const allParams = { ...params, type: chartType };
  
  const queryParams = new URLSearchParams();
  
  // Append all params safely - SORTIERT für konsistente Signatur!
  Object.keys(allParams).sort().forEach(key => {
    if (allParams[key] !== undefined && allParams[key] !== null) {
      if (typeof allParams[key] === 'object') {
         queryParams.append(key, JSON.stringify(allParams[key]));
      } else {
         queryParams.append(key, String(allParams[key]));
      }
    }
  });
  
  const queryString = queryParams.toString();
  const signature = crypto.createHmac('sha256', secret)
    .update(queryString)
    .digest('hex')
    .substring(0, 16);
    
  return `${baseUrl}/charts/img?${queryString}&sig=${signature}`;
}

export function validateChartParams(query: any): ChartToken | null {
  const { sig, ...params } = query;
  if (!sig) {
    console.error('validateChartParams: No signature provided');
    return null;
  }
  
  // Recreate the query string from params (same order as in getChartUrl)
  const secret = process.env.JWT_SECRET || process.env.API_KEY || 'fallback-secret';
  const queryParams = new URLSearchParams();
  
  // WICHTIG: Gleiche Reihenfolge wie in getChartUrl!
  Object.keys(params).sort().forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      if (typeof params[key] === 'object') {
        queryParams.append(key, JSON.stringify(params[key]));
      } else {
        queryParams.append(key, String(params[key]));
      }
    }
  });
  
  const queryString = queryParams.toString();
  const expectedSignature = crypto.createHmac('sha256', secret)
    .update(queryString)
    .digest('hex')
    .substring(0, 16);
  
  // Validiere Signatur
  if (sig !== expectedSignature) {
    console.error('validateChartParams: Invalid signature', {
      provided: sig,
      expected: expectedSignature,
      queryString: queryString
    });
    return null;
  }
  
  // Signatur ist valide, parse Parameter
  return {
    chartType: params.type as any,
    params: {
      canton: params.canton,
      insurer_name: params.insurer_name,
      profile: params.profile,
      insurer_id: params.insurer_id,
      age_band: params.age_band,
      franchise_chf: params.franchise_chf ? Number(params.franchise_chf) : undefined,
      model_type: params.model_type,
      start_year: params.start_year ? Number(params.start_year) : undefined,
      end_year: params.end_year ? Number(params.end_year) : undefined,
      accident_covered: params.accident_covered === 'true',
      limit: params.limit ? Number(params.limit) : undefined
    }
  };
}

// --- SAFE CHART GENERATION FUNCTIONS (VISUAL UPGRADE) ---
// Alle Chart-Funktionen geben jetzt Short URLs zurück (async)

export async function createComparisonChart(data: any[]): Promise<string> {
  const chart = new QuickChart();
  // Standard QuickChart.io Host verwenden (nicht unsere Domain!)
  chart.setWidth(CHART_SIZES.mobile.width);
  chart.setHeight(CHART_SIZES.mobile.height);
  chart.setBackgroundColor('#ffffff');
  
  // Sort und limitiere für Mobile
  const sortedData = [...data].sort((a, b) => {
    const priceA = a.monthly_premium_chf || a.premium || 0;
    const priceB = b.monthly_premium_chf || b.premium || 0;
    return priceA - priceB;
  });
  
  const topData = sortedData.slice(0, 8); // 8 optimal für Mobile
  
  // Berechne Min/Max für Farbcodierung
  const prices = topData.map(d => d.monthly_premium_chf || d.premium || 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  const config = {
    type: 'bar', // Vertical bars
    data: {
      labels: topData.map(d => {
        // Versuche Namen zu bekommen: Erst vorhandene Felder, dann Mapping
        let name = d.insurer_name || d.insurer || d.name;
        
        // Wenn kein Name vorhanden, verwende Mapping
        if (!name && d.insurer_id) {
          name = getInsurerName(d.insurer_id);
        }
        
        // Fallback
        if (!name || name.startsWith('Versicherer')) {
          name = `ID ${d.insurer_id || 'unknown'}`;
        }
        
        // Mobile-optimiert: kurze Namen
        return name.length > 12 ? name.substring(0, 10) + '..' : name;
      }),
      datasets: [{
        label: 'CHF/Monat',
        data: prices,
        backgroundColor: prices.map((price: number) => 
          getColorForValue(price, minPrice, maxPrice, 'comparison')
        ),
        borderRadius: 4, // Moderne abgerundete Ecken
        barPercentage: 0.8,
        categoryPercentage: 0.9
      }]
    },
    options: {
      title: {
        display: true,
        text: data[0]?.title || `Top ${topData.length} Günstigste`,
        fontSize: CHART_SIZES.mobile.fontSize.title,
        padding: 8
      },
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: false,
            fontSize: CHART_SIZES.mobile.fontSize.tick
          },
          gridLines: {
            drawBorder: false,
            color: '#e5e7eb'
          }
        }],
        xAxes: [{
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45,
            fontSize: CHART_SIZES.mobile.fontSize.tick - 1
          },
          gridLines: {
            display: false
          }
        }]
      },
      plugins: {
        datalabels: {
          display: true,
          align: 'end',
          anchor: 'end',
          color: '#1f2937',
          font: {
            weight: 'bold',
            size: 8 // Kleiner für Mobile
          }
        }
      }
    }
  };
  
  // Remove formatter for safety
  delete (config.options.plugins.datalabels as any).formatter;
  
  chart.setConfig(config);
  
  // Short URL verwenden um URL-Längen-Probleme zu vermeiden
  try {
    return await chart.getShortUrl();
  } catch (e) {
    console.error('Short URL failed, using long URL:', e);
  return chart.getUrl();
  }
}

export async function createTimelineChart(data: any): Promise<string> {
  const chart = new QuickChart();
  // Standard QuickChart.io Host verwenden (nicht unsere Domain!)
  chart.setWidth(CHART_SIZES.mobile.width);
  chart.setHeight(CHART_SIZES.mobile.height);
  chart.setBackgroundColor('#ffffff');
  
  const timelineData = data.timeline || []; // Array von {region, data: []} Objekten
  const insurerName = data.insurer?.name || 'Versicherer';
  
  // Normalisiere und dedupliziere Regionen
  const normalizedData = timelineData.map((regionData: any) => {
    const normalizedRegion = normalizeRegionName(regionData.region);
    return {
      ...regionData,
      region: normalizedRegion
    };
  });
  
  // Dedupliziere basierend auf normalisierten Regionen
  const uniqueRegions = new Map();
  normalizedData.forEach((item: any) => {
    if (!uniqueRegions.has(item.region)) {
      uniqueRegions.set(item.region, item);
    }
  });
  
  const dedupedData = Array.from(uniqueRegions.values());
  
  // Farben für verschiedene Regionen
  const regionColors = COLOR_SCHEMES.regions;

  // Erstelle Datasets
  const datasets = dedupedData.map((regionData: any, index: number) => {
    // Bei nur einer Region: Keine Region im Label
    // Bei mehreren Regionen: Zeige Region
    const regionLabel = dedupedData.length === 1 
      ? '' // Kein Label bei nur einer Region (wird über Title angezeigt)
      : regionData.region; // Nur Region-Name, ohne Versicherer (der steht im Titel)
    
    return {
      label: regionLabel,
      data: regionData.data.map((d: any) => d.monthly_premium_chf),
      borderColor: regionColors[index % regionColors.length],
      backgroundColor: regionColors[index % regionColors.length] + '15', // Sehr transparent
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: regionColors[index % regionColors.length],
      pointBorderWidth: 2,
      fill: true,
      lineTension: 0.2 // Etwas weniger Kurve für Klarheit
    };
  });

  // Extrahiere Labels (Jahre)
  const labels = dedupedData.length > 0 
    ? dedupedData[0].data.map((d: any) => d.year.toString()) 
    : [];

  const config = {
    type: 'line',
    data: {
      labels,
      datasets
    },
    options: {
      title: {
        display: true,
        text: `Preisentwicklung: ${insurerName}`,
        fontSize: 14
      },
      legend: {
        display: dedupedData.length > 1, // Zeige Legende nur wenn > 1 DEDUPLIZIERTE Region
        position: 'bottom',
        labels: {
          fontSize: 10,
          boxWidth: 10
        }
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: false
          },
          gridLines: {
            color: '#f0f0f0'
          }
        }],
        xAxes: [{
          gridLines: {
            display: false
          }
        }]
      }
    }
  };
  
  chart.setConfig(config);
  
  // Short URL verwenden um URL-Längen-Probleme zu vermeiden
  try {
    return await chart.getShortUrl();
  } catch (e) {
    console.error('Short URL failed, using long URL:', e);
  return chart.getUrl();
  }
}

export async function createInflationChart(data: any): Promise<string> {
  const chart = new QuickChart();
  // Standard QuickChart.io Host verwenden (nicht unsere Domain!)
  chart.setWidth(CHART_THEME.mobile.width);
  chart.setHeight(CHART_THEME.mobile.height);
  chart.setBackgroundColor(CHART_THEME.colors.background);
  
  const yearlyData = data.yearly_data || [];
  
  const config = {
    type: 'bar', // Mixed chart: Bars for yearly, Line for cumulative
    data: {
      labels: yearlyData.map((d: any) => d.year.toString()),
      datasets: [
        {
          type: 'line',
          label: 'Kumulativ (%)',
          data: yearlyData.map((d: any) => d.cumulative_inflation || 0),
          borderColor: CHART_THEME.colors.accent,
          borderWidth: 2,
          fill: false,
          yAxisID: 'y2',
          pointRadius: 0
        },
        {
          type: 'bar',
          label: 'Inflation (%)',
          data: yearlyData.map((d: any) => d.inflation_rate || 0),
          backgroundColor: CHART_THEME.colors.blue, // Could be conditional array but let's keep it simple/safe
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      title: {
        display: true,
        text: `Inflation ${data.canton || 'CH'}`,
        fontSize: 14
      },
      legend: {
        display: true,
        position: 'bottom'
      },
      scales: {
        yAxes: [
          {
            id: 'y1',
            type: 'linear',
            position: 'left',
            scaleLabel: {
              display: true,
              labelString: 'Jährlich %'
            },
            gridLines: {
              display: false
            }
          },
          {
            id: 'y2',
            type: 'linear',
            position: 'right',
            scaleLabel: {
              display: true,
              labelString: 'Kumulativ %'
            },
            gridLines: {
              display: false
            }
          }
        ],
        xAxes: [{
          gridLines: {
            display: false
          }
        }]
      }
    }
  };
  
  chart.setConfig(config);
  
  // Short URL verwenden um URL-Längen-Probleme zu vermeiden
  try {
    return await chart.getShortUrl();
  } catch (e) {
    console.error('Short URL failed, using long URL:', e);
  return chart.getUrl();
  }
}
// generateChartFromToken wurde entfernt - Charts werden jetzt direkt im Endpoint generiert
// nachdem die Daten aus Supabase geholt wurden
