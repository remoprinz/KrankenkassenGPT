/**
 * Smart Chart Generator
 * Intelligente Chart-Typ-Auswahl basierend auf API-Endpoint und Daten
 */

import { 
  createRankingChart,
  createCantonComparisonChart,
  createModelComparisonChart,
  createFranchiseImpactChart,
  CHART_SIZES,
  COLOR_SCHEMES 
} from './chart-utils';
import { 
  createComparisonChart, 
  createTimelineChart, 
  createInflationChart 
} from './chart-service';
import QuickChart from 'quickchart-js';

export interface ChartContext {
  endpoint: string;
  method: string;
  params: any;
  data: any;
  queryText?: string; // Vom GPT übergebener Suchtext
}

/**
 * Analysiert den Kontext und wählt den optimalen Chart-Typ
 */
export function analyzeChartContext(context: ChartContext): ChartDecision {
  const { endpoint, data } = context;
  
  // Timeline Endpoints
  if (endpoint.includes('/timeline')) {
    return {
      type: 'timeline',
      subtype: data.timeline?.length > 1 ? 'multi-region' : 'single-region',
      config: {
        showLegend: data.timeline?.length > 1,
        fillArea: true,
        showTrend: true
      }
    };
  }
  
  // Vergleichs-Endpoints
  if (endpoint.includes('/compare')) {
    const itemCount = Array.isArray(data) ? data.length : (data.comparisons?.length || 0);
    
    if (itemCount > 20) {
      // Zu viele für normalen Chart - zeige Top/Flop
      return {
        type: 'ranking',
        subtype: 'top-flop',
        config: {
          showTop: 5,
          showFlop: 5
        }
      };
    }
    
    return {
      type: 'comparison',
      subtype: 'standard',
      config: {
        limit: 10,
        sortAscending: true,
        colorCoding: true
      }
    };
  }
  
  // Nationale Übersicht
  if (endpoint.includes('/nationwide')) {
    return {
      type: 'canton-comparison',
      subtype: 'grouped-bar',
      config: {
        groupBy: 'region',
        showAverage: true
      }
    };
  }
  
  // Search Endpoint - kontext-abhängig
  if (endpoint.includes('/search')) {
    return analyzeSearchQuery(context);
  }
  
  // Inflation
  if (endpoint.includes('/inflation')) {
    return {
      type: 'inflation',
      subtype: 'mixed',
      config: {
        showYearly: true,
        showCumulative: true
      }
    };
  }
  
  // Default
  return {
    type: 'comparison',
    subtype: 'standard',
    config: {}
  };
}

/**
 * Analysiert Such-Queries für optimale Chart-Auswahl
 */
function analyzeSearchQuery(context: ChartContext): ChartDecision {
  const query = context.queryText?.toLowerCase() || '';
  
  // Keywords für verschiedene Chart-Typen
  if (query.includes('entwicklung') || query.includes('verlauf') || query.includes('jahre')) {
    return {
      type: 'timeline',
      subtype: 'trend',
      config: {
        showProjection: query.includes('prognose') || query.includes('zukunft')
      }
    };
  }
  
  if (query.includes('günstigste') || query.includes('teuerste') || query.includes('top')) {
    return {
      type: 'ranking',
      subtype: query.includes('teuerste') ? 'flop' : 'top',
      config: {
        limit: 5
      }
    };
  }
  
  if (query.includes('kanton') && (query.includes('alle') || query.includes('vergleich'))) {
    return {
      type: 'canton-comparison',
      subtype: 'map-or-bars',
      config: {
        visualization: 'bars' // Später: 'map' für Schweizer Karte
      }
    };
  }
  
  if (query.includes('modell') || query.includes('hmo') || query.includes('telmed')) {
    return {
      type: 'model-comparison',
      subtype: 'grouped',
      config: {
        showSavings: true
      }
    };
  }
  
  if (query.includes('franchise')) {
    return {
      type: 'franchise-impact',
      subtype: 'stepped-line',
      config: {
        showBreakEven: true
      }
    };
  }
  
  // Default für normale Suche
  return {
    type: 'comparison',
    subtype: 'standard',
    config: {
      limit: 8,
      colorCoding: true
    }
  };
}

/**
 * Generiert den optimalen Chart basierend auf der Entscheidung
 */
export async function generateOptimalChart(context: ChartContext, decision: ChartDecision): Promise<string> {
  const { type, subtype, config } = decision;
  const { data } = context;
  
  switch (type) {
    case 'timeline':
      return await createTimelineChart(data);
    
    case 'comparison':
      return await createComparisonChart(data);
    
    case 'inflation':
      return await createInflationChart(data);
    
    case 'ranking':
      return await createRankingChart({
        ...data,
        type: subtype === 'flop' ? 'flop' : 'top',
        ...config
      });
    
    case 'canton-comparison':
      return await createCantonComparisonChart(data);
    
    case 'model-comparison':
      return await createModelComparisonChart(data);
    
    case 'franchise-impact':
      return await createFranchiseImpactChart(data);
    
    default:
      // Fallback zu Standard-Comparison
      return await createComparisonChart(data);
  }
}

/**
 * Erstellt einen kombinierten Dashboard-Chart mit mehreren Metriken
 */
export function createDashboardChart(data: any): string {
  const chart = new QuickChart();
  // Standard QuickChart.io Host verwenden (nicht unsere Domain!)
  chart.setWidth(CHART_SIZES.mobile.width);
  chart.setHeight(CHART_SIZES.mobile.height * 1.5); // Größer für Dashboard
  chart.setBackgroundColor('#ffffff');
  
  // Dashboard mit mehreren Mini-Charts (Sparklines)
  const config = {
    type: 'bar',
    data: {
      labels: ['Günstigste', 'Durchschnitt', 'Teuerste'],
      datasets: [{
        label: data.canton || 'Schweiz',
        data: [data.min_price, data.avg_price, data.max_price],
        backgroundColor: [
          COLOR_SCHEMES.comparison.gradient[0], // Grün
          COLOR_SCHEMES.comparison.gradient[4], // Gelb
          COLOR_SCHEMES.comparison.gradient[7]  // Rot
        ]
      }]
    },
    options: {
      title: {
        display: true,
        text: `Marktübersicht ${data.year}`,
        fontSize: CHART_SIZES.mobile.fontSize.title
      },
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: false,
            fontSize: CHART_SIZES.mobile.fontSize.tick
          }
        }]
      },
      plugins: {
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'top',
          font: {
            size: CHART_SIZES.mobile.fontSize.label,
            weight: 'bold'
          }
        }
      }
    }
  };
  
  delete (config.options.plugins.datalabels as any).formatter;
  
  chart.setConfig(config);
  return chart.getUrl();
}

// Type Definitions
export interface ChartDecision {
  type: 'timeline' | 'comparison' | 'inflation' | 'ranking' | 
        'canton-comparison' | 'model-comparison' | 'franchise-impact' | 'dashboard';
  subtype: string;
  config: any;
}

export default {
  analyzeChartContext,
  generateOptimalChart,
  createDashboardChart
};