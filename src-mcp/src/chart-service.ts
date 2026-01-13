/**
 * Chart Service for MCP Server
 * Generates QuickChart URLs for visualizations
 */

import QuickChart from 'quickchart-js';
import { getInsurerName } from './insurer-names.js';

// Chart sizes optimized for chat interfaces
const CHART_SIZES = {
  width: 600,
  height: 400,
  fontSize: {
    title: 14,
    label: 11,
    tick: 10
  }
};

// Color schemes
const COLOR_SCHEMES = {
  primary: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'],
  regions: ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b']
};

/**
 * Get color based on value position in range
 */
function getColorForValue(value: number, min: number, max: number): string {
  const range = max - min;
  if (range === 0) return COLOR_SCHEMES.primary[0];
  
  const position = (value - min) / range;
  const index = Math.min(Math.floor(position * COLOR_SCHEMES.primary.length), COLOR_SCHEMES.primary.length - 1);
  return COLOR_SCHEMES.primary[index];
}

/**
 * Creates a comparison bar chart for premium quotes
 */
export async function createComparisonChart(data: Array<{
  insurer_name?: string;
  insurer_id?: string;
  monthly_premium_chf: number;
  title?: string;
}>): Promise<string> {
  // @ts-expect-error - QuickChart constructor
  const chart = new QuickChart();
  chart.setWidth(CHART_SIZES.width);
  chart.setHeight(CHART_SIZES.height);
  chart.setBackgroundColor('#ffffff');
  
  // Sort by price
  const sortedData = [...data].sort((a, b) => a.monthly_premium_chf - b.monthly_premium_chf);
  const topData = sortedData.slice(0, 8);
  
  // Calculate colors
  const prices = topData.map(d => d.monthly_premium_chf);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  const config = {
    type: 'bar',
    data: {
      labels: topData.map(d => {
        let name = d.insurer_name;
        if (!name && d.insurer_id) {
          name = getInsurerName(d.insurer_id);
        }
        if (!name) name = 'Unbekannt';
        return name.length > 12 ? name.substring(0, 10) + '..' : name;
      }),
      datasets: [{
        label: 'CHF/Monat',
        data: prices,
        backgroundColor: prices.map(price => getColorForValue(price, minPrice, maxPrice)),
        borderRadius: 4,
        barPercentage: 0.8
      }]
    },
    options: {
      title: {
        display: true,
        text: data[0]?.title || `Top ${topData.length} Günstigste`,
        fontSize: CHART_SIZES.fontSize.title
      },
      legend: { display: false },
      scales: {
        yAxes: [{
          ticks: { beginAtZero: false, fontSize: CHART_SIZES.fontSize.tick },
          gridLines: { color: '#e5e7eb' }
        }],
        xAxes: [{
          ticks: { 
            autoSkip: false, 
            maxRotation: 45, 
            minRotation: 45,
            fontSize: CHART_SIZES.fontSize.tick - 1
          },
          gridLines: { display: false }
        }]
      },
      plugins: {
        datalabels: {
          display: true,
          align: 'end',
          anchor: 'end',
          color: '#1f2937',
          font: { weight: 'bold', size: 9 }
        }
      }
    }
  };
  
  chart.setConfig(config);
  
  try {
    return await chart.getShortUrl();
  } catch {
    return chart.getUrl();
  }
}

/**
 * Creates a timeline line chart for price development
 */
export async function createTimelineChart(data: {
  insurer?: { name?: string };
  timeline: Array<{
    region: string;
    data: Array<{ year: number; monthly_premium_chf: number }>;
  }>;
}): Promise<string> {
  // @ts-expect-error - QuickChart constructor
  const chart = new QuickChart();
  chart.setWidth(CHART_SIZES.width);
  chart.setHeight(CHART_SIZES.height);
  chart.setBackgroundColor('#ffffff');
  
  const timelineData = data.timeline || [];
  const insurerName = data.insurer?.name || 'Versicherer';
  
  // Create datasets
  const datasets = timelineData.map((regionData, index) => ({
    label: timelineData.length === 1 ? '' : regionData.region,
    data: regionData.data.map(d => d.monthly_premium_chf),
    borderColor: COLOR_SCHEMES.regions[index % COLOR_SCHEMES.regions.length],
    backgroundColor: COLOR_SCHEMES.regions[index % COLOR_SCHEMES.regions.length] + '15',
    borderWidth: 2,
    pointRadius: 3,
    pointBackgroundColor: '#ffffff',
    pointBorderWidth: 2,
    fill: true,
    lineTension: 0.2
  }));
  
  const labels = timelineData.length > 0 
    ? timelineData[0].data.map(d => d.year.toString()) 
    : [];
  
  const config = {
    type: 'line',
    data: { labels, datasets },
    options: {
      title: {
        display: true,
        text: `Preisentwicklung: ${insurerName}`,
        fontSize: CHART_SIZES.fontSize.title
      },
      legend: {
        display: timelineData.length > 1,
        position: 'bottom',
        labels: { fontSize: 10, boxWidth: 10 }
      },
      scales: {
        yAxes: [{ ticks: { beginAtZero: false }, gridLines: { color: '#f0f0f0' } }],
        xAxes: [{ gridLines: { display: false } }]
      }
    }
  };
  
  chart.setConfig(config);
  
  try {
    return await chart.getShortUrl();
  } catch {
    return chart.getUrl();
  }
}

/**
 * Creates an inflation chart with bars and cumulative line
 */
export async function createInflationChart(data: {
  canton: string;
  statistics: { avg_yearly_inflation: number; total_inflation: number };
  yearly_data: Array<{
    year: number;
    inflation_rate: number | null;
    cumulative_inflation: number;
  }>;
}): Promise<string> {
  // @ts-expect-error - QuickChart constructor
  const chart = new QuickChart();
  chart.setWidth(CHART_SIZES.width);
  chart.setHeight(CHART_SIZES.height);
  chart.setBackgroundColor('#ffffff');
  
  const yearlyData = data.yearly_data || [];
  
  const config = {
    type: 'bar',
    data: {
      labels: yearlyData.map(d => d.year.toString()),
      datasets: [
        {
          type: 'line',
          label: 'Kumulativ (%)',
          data: yearlyData.map(d => d.cumulative_inflation || 0),
          borderColor: '#dc2626',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y2',
          pointRadius: 0
        },
        {
          type: 'bar',
          label: 'Jährliche Inflation (%)',
          data: yearlyData.map(d => d.inflation_rate || 0),
          backgroundColor: '#3b82f6',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      title: {
        display: true,
        text: `Prämien-Inflation ${data.canton}`,
        fontSize: CHART_SIZES.fontSize.title
      },
      legend: { display: true, position: 'bottom' },
      scales: {
        yAxes: [
          {
            id: 'y1',
            type: 'linear',
            position: 'left',
            scaleLabel: { display: true, labelString: 'Jährlich %' },
            gridLines: { display: false }
          },
          {
            id: 'y2',
            type: 'linear',
            position: 'right',
            scaleLabel: { display: true, labelString: 'Kumulativ %' },
            gridLines: { display: false }
          }
        ],
        xAxes: [{ gridLines: { display: false } }]
      }
    }
  };
  
  chart.setConfig(config);
  
  try {
    return await chart.getShortUrl();
  } catch {
    return chart.getUrl();
  }
}
