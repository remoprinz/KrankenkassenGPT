#!/usr/bin/env node

/**
 * Test Script für Chart Service
 * 
 * Usage: node scripts/test-charts.js
 */

const https = require('https');

// Konfiguration
const API_KEY = process.env.API_KEY || 'your-api-key-here';
const BASE_URL = process.env.FUNCTIONS_URL || 'https://krankenkassen.ragit.io';

console.log('🧪 Chart Service Test\n');
console.log('API URL:', BASE_URL);
console.log('API Key:', API_KEY ? '✅ Gesetzt' : '❌ Fehlt (setzen Sie API_KEY env)');
console.log('\n---\n');

// Test 1: Timeline mit Chart
async function testTimeline() {
  console.log('📊 Test 1: Timeline Chart');
  console.log('Endpoint: /premiums/timeline');
  
  return new Promise((resolve) => {
    const url = `${BASE_URL}/premiums/timeline?insurer_id=CSS&canton=ZH&profile=single_adult`;
    console.log('URL:', url);
    
    https.get(url, {
      headers: {
        'X-API-Key': API_KEY
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.chart_url) {
            console.log('✅ Chart URL generiert:', json.chart_url);
            console.log('   Timeline Datenpunkte:', json.timeline?.length || 0);
            console.log('   Änderung:', json.statistics?.percent_change + '%');
          } else if (json.error) {
            console.log('❌ API Error:', json.error.message);
          } else {
            console.log('⚠️  Keine chart_url in Response');
          }
        } catch (e) {
          console.log('❌ Parse Error:', e.message);
        }
        console.log('\n---\n');
        resolve();
      });
    }).on('error', (e) => {
      console.log('❌ Request Error:', e.message);
      console.log('\n---\n');
      resolve();
    });
  });
}

// Test 2: Quote mit Chart
async function testQuote() {
  console.log('📊 Test 2: Comparison Chart');
  console.log('Endpoint: /premiums/quote');
  
  return new Promise((resolve) => {
    const url = `${BASE_URL}/premiums/quote?canton=ZH&age_band=adult&franchise_chf=2500&accident_covered=false`;
    console.log('URL:', url);
    
    https.get(url, {
      headers: {
        'X-API-Key': API_KEY
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.chart_url) {
            console.log('✅ Chart URL generiert:', json.chart_url);
            console.log('   Anzahl Resultate:', json.count);
            console.log('   Günstigste:', 'CHF', json.statistics?.min);
            console.log('   Teuerste:', 'CHF', json.statistics?.max);
          } else if (json.error) {
            console.log('❌ API Error:', json.error.message);
          } else {
            console.log('⚠️  Keine chart_url in Response');
          }
        } catch (e) {
          console.log('❌ Parse Error:', e.message);
        }
        console.log('\n---\n');
        resolve();
      });
    }).on('error', (e) => {
      console.log('❌ Request Error:', e.message);
      console.log('\n---\n');
      resolve();
    });
  });
}

// Test 3: Inflation mit Chart
async function testInflation() {
  console.log('📊 Test 3: Inflation Chart');
  console.log('Endpoint: /premiums/inflation');
  
  return new Promise((resolve) => {
    const url = `${BASE_URL}/premiums/inflation?canton=ZH&start_year=2020&end_year=2025`;
    console.log('URL:', url);
    
    https.get(url, {
      headers: {
        'X-API-Key': API_KEY
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.chart_url) {
            console.log('✅ Chart URL generiert:', json.chart_url);
            console.log('   Jahre analysiert:', json.statistics?.years_analyzed);
            console.log('   Durchschnittliche Inflation:', json.statistics?.avg_yearly_inflation + '%');
            console.log('   Totale Inflation:', json.statistics?.total_inflation + '%');
          } else if (json.error) {
            console.log('❌ API Error:', json.error.message);
          } else {
            console.log('⚠️  Keine chart_url in Response');
          }
        } catch (e) {
          console.log('❌ Parse Error:', e.message);
        }
        console.log('\n---\n');
        resolve();
      });
    }).on('error', (e) => {
      console.log('❌ Request Error:', e.message);
      console.log('\n---\n');
      resolve();
    });
  });
}

// Test 4: Chart-URL direkt testen
async function testChartUrl(chartUrl) {
  console.log('🖼️  Test 4: Chart-Bild laden');
  console.log('URL:', chartUrl);
  
  return new Promise((resolve) => {
    https.get(chartUrl, (res) => {
      console.log('   Status:', res.statusCode);
      console.log('   Content-Type:', res.headers['content-type']);
      console.log('   Cache-Control:', res.headers['cache-control']);
      
      if (res.statusCode === 302 || res.statusCode === 301) {
        console.log('   Redirect zu:', res.headers.location);
        console.log('✅ Chart-Redirect funktioniert!');
      } else if (res.statusCode === 200) {
        console.log('✅ Chart direkt geladen!');
      } else {
        console.log('❌ Unerwarteter Status Code');
      }
      
      console.log('\n---\n');
      resolve();
    }).on('error', (e) => {
      console.log('❌ Request Error:', e.message);
      console.log('\n---\n');
      resolve();
    });
  });
}

// Haupt-Testfunktion
async function runTests() {
  console.log('🚀 Starte Tests...\n');
  
  // Test Timeline
  await testTimeline();
  
  // Test Quote
  await testQuote();
  
  // Test Inflation
  await testInflation();
  
  // Zusammenfassung
  console.log('📋 Test abgeschlossen!\n');
  console.log('Nächste Schritte:');
  console.log('1. Öffnen Sie eine der generierten chart_url im Browser');
  console.log('2. Testen Sie in ChatGPT mit: "Zeige mir die Preisentwicklung von CSS"');
  console.log('3. Prüfen Sie Firebase Logs: firebase functions:log');
  console.log('\n✨ Happy Charting!');
}

// Tests ausführen
runTests().catch(console.error);
