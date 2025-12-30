/**
 * Chart Utilities & Smart Configuration
 * Mobile-First, Best-in-Class Chart Generation
 */

import QuickChart from 'quickchart-js';

// ============================================
// MOBILE-FIRST RESPONSIVE DESIGN
// ============================================
export const CHART_SIZES = {
  mobile: {
    width: 380,    // Optimiert für iPhone
    height: 280,   // 16:9 ähnlich
    fontSize: {
      title: 14,
      label: 10,
      tick: 9
    }
  },
  tablet: {
    width: 600,
    height: 400,
    fontSize: {
      title: 16,
      label: 12,
      tick: 11
    }
  },
  desktop: {
    width: 800,
    height: 500,
    fontSize: {
      title: 18,
      label: 14,
      tick: 12
    }
  }
};

// ============================================
// PROFESSIONAL COLOR PALETTES
// ============================================
export const COLOR_SCHEMES = {
  // Neutrales Blaugrau-Schema (Best Practice: IBM Carbon, Material Design)
  primary: {
    blue: '#4A5568',       // Slate-600 (Hauptfarbe)
    lightBlue: '#64748B',  // Slate-500
    skyBlue: '#94A3B8',    // Slate-400
    paleBlue: '#CBD5E1'    // Slate-300
  },
  
  // Vergleichsfarben: EINHEITLICH (keine Wertung!)
  // Best Practice: Eine Farbe für alle Balken
  comparison: {
    gradient: [
      '#64748B', // Slate-500 (für alle Balken gleich)
      '#64748B',
      '#64748B',
      '#64748B',
      '#64748B',
      '#64748B',
      '#64748B',
      '#64748B'
    ]
  },
  
  // Inflation: Neutrale Abstufungen (kein Grün/Rot!)
  inflation: {
    positive: '#475569',  // Slate-600 (dunkel)
    neutral: '#64748B',   // Slate-500 (mittel)
    warning: '#94A3B8',   // Slate-400 (hell)
    danger: '#4A5568'     // Slate-600 (dunkel)
  },
  
  // Regionen: Abstufungen in Blaugrau (unterscheidbar aber neutral)
  regions: [
    '#334155', // Slate-700 (dunkelste)
    '#475569', // Slate-600
    '#64748B', // Slate-500
    '#94A3B8'  // Slate-400 (hellste)
  ]
};

// ============================================
// INTELLIGENTE CHART-TYP AUSWAHL
// ============================================
export function detectOptimalChartType(queryData: any): ChartTypeConfig {
  // Analysiere Query-Intent
  if (queryData.comparing_insurers) {
    return {
      type: 'vertical_bar',
      config: {
        sort: 'ascending',
        showAverage: true,
        showDataLabels: true,
        colorScheme: 'comparison'
      }
    };
  }
  
  if (queryData.timeline && queryData.regions?.length > 1) {
    return {
      type: 'multi_line',
      config: {
        showLegend: true,
        fillArea: true,
        showTrend: true,
        colorScheme: 'regions'
      }
    };
  }
  
  if (queryData.nationwide_comparison) {
    return {
      type: 'grouped_bar',
      config: {
        groupBy: 'canton',
        showMinMax: true,
        colorScheme: 'primary'
      }
    };
  }
  
  // Default
  return {
    type: 'line',
    config: {
      showPoints: true,
      fillArea: false,
      colorScheme: 'primary'
    }
  };
}

// ============================================
// REGION NAME NORMALISIERUNG
// ============================================
export function normalizeRegionName(regionCode: string): string {
  // Bereinige Region-Code
  const cleaned = regionCode.trim().toUpperCase();
  
  // Entferne "PR-REG " Prefix falls vorhanden
  const withoutPrefix = cleaned.replace(/^PR-REG\s+/, '');
  
  // Vereinheitliche verschiedene Schreibweisen zu einem Format
  const mappings: {[key: string]: string} = {
    // Verschiedene Schreibweisen für Region 0
    'CH0': 'Region 1',
    'CH00': 'Region 1',
    'CH01': 'Region 1',  // Deduplizierung!
    '0': 'Region 1',
    'REGION 0': 'Region 1',
    
    // Verschiedene Schreibweisen für Region 1
    'CH1': 'Region 2',
    'CH10': 'Region 2',
    'CH11': 'Region 2',  // Deduplizierung!
    '1': 'Region 2',
    'REGION 1': 'Region 2',
    
    // Verschiedene Schreibweisen für Region 2
    'CH2': 'Region 3',
    'CH20': 'Region 3',
    'CH21': 'Region 3',  // Deduplizierung!
    '2': 'Region 3',
    'REGION 2': 'Region 3',
    
    // Verschiedene Schreibweisen für Region 3
    'CH3': 'Region 4',
    'CH30': 'Region 4',
    'CH31': 'Region 4',  // Deduplizierung!
    '3': 'Region 4',
    'REGION 3': 'Region 4'
  };
  
  // Versuche direktes Mapping
  if (mappings[withoutPrefix]) {
    return mappings[withoutPrefix];
  }
  
  // Falls schon im richtigen Format
  if (withoutPrefix.startsWith('REGION ')) {
    return withoutPrefix.charAt(0) + withoutPrefix.slice(1).toLowerCase();
  }
  
  // Fallback: Originale Region beibehalten
  return withoutPrefix;
}

// ============================================
// CHART FORMATIERUNG HELPERS
// ============================================
export function formatCHF(value: number): string {
  return `CHF ${value.toLocaleString('de-CH')}`;
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function getColorForValue(value: number, min: number, max: number, scheme: 'comparison' | 'inflation' = 'comparison'): string {
  if (scheme === 'inflation') {
    // Neutrale Abstufung ohne Wertung
    const inflationColors = COLOR_SCHEMES.inflation;
    const absValue = Math.abs(value);
    if (absValue < 1) return inflationColors.neutral;
    if (absValue < 3) return inflationColors.warning;
    return inflationColors.danger;
  }
  
  // Für comparison: EINHEITLICHE FARBE (keine Wertung!)
  // Best Practice: Alle Balken gleiche Farbe
  return COLOR_SCHEMES.primary.blue; // Slate-600 für alle
}

// ============================================
// ERWEITERTE CHART-TYPEN
// ============================================

export interface ChartTypeConfig {
  type: string;
  config: any;
}

export interface SmartChartData {
  queryType?: string;
  comparing_insurers?: boolean;
  timeline?: boolean;
  regions?: string[];
  nationwide_comparison?: boolean;
  data: any;
}

/**
 * Erstellt einen Rankings-Chart (Top/Flop)
 */
export function createRankingChart(data: any): string {
  const chart = new QuickChart();
  // Standard QuickChart.io Host verwenden (nicht unsere Domain!)
  chart.setWidth(CHART_SIZES.mobile.width);
  chart.setHeight(CHART_SIZES.mobile.height);
  chart.setBackgroundColor('#ffffff');
  
  const items = data.items || [];
  const isTop = data.type === 'top';
  
  const config = {
    type: 'horizontalBar',
    data: {
      labels: items.map((item: any) => item.name),
      datasets: [{
        label: isTop ? 'Günstigste' : 'Teuerste',
        data: items.map((item: any) => item.price),
        backgroundColor: items.map((item: any, index: number) => {
          const colors = isTop 
            ? COLOR_SCHEMES.comparison.gradient
            : COLOR_SCHEMES.comparison.gradient.slice().reverse();
          return colors[Math.min(index, colors.length - 1)];
        })
      }]
    },
    options: {
      title: {
        display: true,
        text: `${isTop ? 'Top 5 Günstigste' : 'Top 5 Teuerste'} - ${data.canton} ${data.year}`,
        fontSize: CHART_SIZES.mobile.fontSize.title
      },
      legend: {
        display: false
      },
      scales: {
        xAxes: [{
          ticks: {
            beginAtZero: true,
            fontSize: CHART_SIZES.mobile.fontSize.tick
          }
        }],
        yAxes: [{
          ticks: {
            fontSize: CHART_SIZES.mobile.fontSize.label
          }
        }]
      },
      plugins: {
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'right',
          font: {
            size: CHART_SIZES.mobile.fontSize.label
          }
        }
      }
    }
  };
  
  chart.setConfig(config);
  return chart.getUrl();
}

/**
 * Erstellt einen Kantonsvergleich-Chart
 */
export function createCantonComparisonChart(data: any): string {
  const chart = new QuickChart();
  // Standard QuickChart.io Host verwenden (nicht unsere Domain!)
  chart.setWidth(CHART_SIZES.mobile.width);
  chart.setHeight(CHART_SIZES.mobile.height + 50); // Etwas höher für Kantone
  chart.setBackgroundColor('#ffffff');
  
  const cantons = data.cantons || [];
  
  // Sortiere nach Preis
  cantons.sort((a: any, b: any) => a.price - b.price);
  
  // Berechne Min/Max für Farbgebung
  const prices = cantons.map((c: any) => c.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
  
  const config = {
    type: 'bar',
    data: {
      labels: cantons.map((c: any) => c.canton),
      datasets: [{
        label: 'Monatsprämie',
        data: prices,
        backgroundColor: prices.map((price: number) => 
          getColorForValue(price, minPrice, maxPrice, 'comparison')
        )
      }]
    },
    options: {
      title: {
        display: true,
        text: `Kantonsvergleich: ${data.insurer} ${data.year}`,
        fontSize: CHART_SIZES.mobile.fontSize.title
      },
      legend: {
        display: false
      },
      scales: {
        xAxes: [{
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45,
            fontSize: CHART_SIZES.mobile.fontSize.tick
          }
        }],
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
            size: 8
          }
        }
      },
      // Durchschnittslinie
      annotation: {
        annotations: [{
          type: 'line',
          mode: 'horizontal',
          scaleID: 'y-axis-0',
          value: avgPrice,
          borderColor: 'rgba(0, 0, 0, 0.5)',
          borderWidth: 1,
          borderDash: [5, 5],
          label: {
            enabled: true,
            content: `Ø ${formatCHF(avgPrice)}`,
            position: 'right'
          }
        }]
      }
    }
  };
  
  chart.setConfig(config);
  return chart.getUrl();
}

/**
 * Erstellt einen Modell-Vergleichs-Chart (HMO vs Standard vs Telmed)
 */
export function createModelComparisonChart(data: any): string {
  const chart = new QuickChart();
  // Standard QuickChart.io Host verwenden (nicht unsere Domain!)
  chart.setWidth(CHART_SIZES.mobile.width);
  chart.setHeight(CHART_SIZES.mobile.height);
  chart.setBackgroundColor('#ffffff');
  
  const models = data.models || [];
  const standardPrice = models.find((m: any) => m.type === 'standard')?.price || 0;
  
  const config = {
    type: 'bar',
    data: {
      labels: models.map((m: any) => m.type.toUpperCase()),
      datasets: [{
        label: 'Monatsprämie',
        data: models.map((m: any) => m.price),
        backgroundColor: [
          COLOR_SCHEMES.primary.blue,      // Standard
          COLOR_SCHEMES.primary.lightBlue, // HMO
          COLOR_SCHEMES.primary.skyBlue,   // Telmed
          COLOR_SCHEMES.primary.paleBlue   // Andere
        ]
      }]
    },
    options: {
      title: {
        display: true,
        text: `Modell-Vergleich: ${data.insurer} ${data.canton}`,
        fontSize: CHART_SIZES.mobile.fontSize.title
      },
      legend: {
        display: false
      },
      scales: {
        xAxes: [{
          ticks: {
            fontSize: CHART_SIZES.mobile.fontSize.label
          }
        }],
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
          },
          formatter: (value: number) => {
            const savings = standardPrice - value;
            if (savings > 0) {
              return `${formatCHF(value)}\n-${formatCHF(savings)}`;
            }
            return formatCHF(value);
          }
        }
      }
    }
  };
  
  chart.setConfig(config);
  return chart.getUrl();
}

/**
 * Erstellt einen Franchise-Impact-Chart
 */
export function createFranchiseImpactChart(data: any): string {
  const chart = new QuickChart();
  // Standard QuickChart.io Host verwenden (nicht unsere Domain!)
  chart.setWidth(CHART_SIZES.mobile.width);
  chart.setHeight(CHART_SIZES.mobile.height);
  chart.setBackgroundColor('#ffffff');
  
  const franchises = data.franchises || [];
  
  const config = {
    type: 'line',
    data: {
      labels: franchises.map((f: any) => `CHF ${f.franchise}`),
      datasets: [{
        label: 'Jahresprämie',
        data: franchises.map((f: any) => f.yearly_premium),
        borderColor: COLOR_SCHEMES.primary.blue,
        backgroundColor: COLOR_SCHEMES.primary.blue + '20',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: COLOR_SCHEMES.primary.blue,
        pointBorderWidth: 2,
        fill: true,
        lineTension: 0.2
      }]
    },
    options: {
      title: {
        display: true,
        text: `Franchise-Auswirkung: ${data.insurer}`,
        fontSize: CHART_SIZES.mobile.fontSize.title
      },
      legend: {
        display: false
      },
      scales: {
        xAxes: [{
          ticks: {
            fontSize: CHART_SIZES.mobile.fontSize.tick
          }
        }],
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
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: COLOR_SCHEMES.primary.blue,
          borderRadius: 3,
          borderWidth: 1,
          font: {
            size: 9
          }
        }
      }
    }
  };
  
  chart.setConfig(config);
  return chart.getUrl();
}

export default {
  CHART_SIZES,
  COLOR_SCHEMES,
  detectOptimalChartType,
  normalizeRegionName,
  formatCHF,
  formatPercent,
  getColorForValue,
  createRankingChart,
  createCantonComparisonChart,
  createModelComparisonChart,
  createFranchiseImpactChart
};