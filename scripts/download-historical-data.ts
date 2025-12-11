#!/usr/bin/env tsx
/**
 * Download Historical BAG Premium Data (2011-2025)
 * 
 * Lädt alle verfügbaren Archiv-Dateien von opendata.swiss herunter
 * und speichert sie im data/historical Verzeichnis
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verfügbare Jahre und ihre Download-URLs (von opendata.swiss)
const ARCHIVE_URLS: Record<number, string> = {
  2025: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/33585696/master',
  2024: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/30907244/master',
  2023: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/27485478/master',
  2022: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/23469383/master',
  2021: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/19364433/master',
  2020: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/14389100/master',
  2019: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/9906083/master',
  2018: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/6126300/master',
  2017: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/3522270/master',
  2016: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/1181966/master',
  2015: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/39795/master',
  2014: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/275414/master',
  2013: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/235673/master',
  2012: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/189078/master',
  2011: 'https://dam-api.bfs.admin.ch/hub/api/dam/assets/145323/master'
};

const DATA_DIR = path.join(__dirname, '../data/historical');

// Farben für Console Output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Download eine Datei mit Progress-Anzeige
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let downloadedSize = 0;

    https.get(url, { 
      headers: { 'User-Agent': 'SwissHealth-API/1.0' }
    }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(response.headers.location!, destPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        file.write(chunk);
        
        if (totalSize > 0) {
          const percent = Math.round((downloadedSize / totalSize) * 100);
          process.stdout.write(`\r   Downloading: ${percent}% (${formatBytes(downloadedSize)} / ${formatBytes(totalSize)})`);
        }
      });

      response.on('end', () => {
        file.end();
        process.stdout.write('\n');
        resolve();
      });

      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Format Bytes für lesbare Ausgabe
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Extract ZIP file
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  await execAsync(`unzip -q -o "${zipPath}" -d "${destDir}"`);
}

/**
 * Download und Extract für ein Jahr
 */
async function processYear(year: number): Promise<void> {
  const url = ARCHIVE_URLS[year];
  if (!url) {
    console.log(`${colors.yellow}⚠ Keine URL für Jahr ${year}${colors.reset}`);
    return;
  }

  const yearDir = path.join(DATA_DIR, year.toString());
  const zipPath = path.join(DATA_DIR, `Archiv_Praemien_${year}.zip`);

  // Check if already processed
  if (fs.existsSync(yearDir) && fs.readdirSync(yearDir).length > 0) {
    console.log(`${colors.cyan}✓ Jahr ${year} bereits vorhanden, überspringe...${colors.reset}`);
    return;
  }

  console.log(`${colors.blue}📅 Verarbeite Jahr ${year}...${colors.reset}`);

  try {
    // Download ZIP
    console.log(`   ${colors.yellow}⬇ Downloading...${colors.reset}`);
    await downloadFile(url, zipPath);
    
    // Extract ZIP
    console.log(`   ${colors.yellow}📦 Extrahiere...${colors.reset}`);
    fs.mkdirSync(yearDir, { recursive: true });
    await extractZip(zipPath, yearDir);
    
    // Clean up ZIP
    fs.unlinkSync(zipPath);
    
    // List extracted files
    const files = fs.readdirSync(yearDir);
    console.log(`   ${colors.green}✅ ${files.length} Dateien extrahiert${colors.reset}`);
    
    // Find main premium file
    const premiumFile = files.find(f => 
      f.includes('Prämien_CH') || 
      f.includes('praemien') || 
      f.includes('Premium') ||
      f.includes('KK-Praemien')
    );
    
    if (premiumFile) {
      console.log(`   ${colors.green}📊 Hauptdatei: ${premiumFile}${colors.reset}`);
    } else {
      console.log(`   ${colors.yellow}⚠ Keine eindeutige Prämien-Datei gefunden${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Fehler bei Jahr ${year}: ${error}${colors.reset}`);
    throw error;
  }
}

/**
 * Main Download Process
 */
async function main() {
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}🏥 BAG HISTORISCHE DATEN DOWNLOAD${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  // Erstelle data/historical Verzeichnis
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const years = Object.keys(ARCHIVE_URLS)
    .map(y => parseInt(y))
    .sort((a, b) => b - a); // Neueste zuerst

  console.log(`${colors.blue}📊 Verfügbare Jahre: ${years.join(', ')}${colors.reset}\n`);

  // Download in Batches (3 parallel)
  const batchSize = 3;
  for (let i = 0; i < years.length; i += batchSize) {
    const batch = years.slice(i, i + batchSize);
    console.log(`${colors.cyan}\n🔄 Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(years.length/batchSize)}: Jahre ${batch.join(', ')}${colors.reset}\n`);
    
    await Promise.all(batch.map(year => processYear(year)));
  }

  // Summary
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✅ DOWNLOAD ABGESCHLOSSEN${colors.reset}`);
  
  // Statistik
  const downloadedYears = fs.readdirSync(DATA_DIR)
    .filter(d => /^\d{4}$/.test(d))
    .sort();
  
  console.log(`${colors.green}📁 ${downloadedYears.length} Jahre heruntergeladen${colors.reset}`);
  console.log(`${colors.green}📍 Speicherort: ${DATA_DIR}${colors.reset}`);
  
  // Check total size
  const totalSize = downloadedYears.reduce((acc, year) => {
    const yearDir = path.join(DATA_DIR, year);
    const files = fs.readdirSync(yearDir);
    return acc + files.reduce((sum, file) => {
      const stats = fs.statSync(path.join(yearDir, file));
      return sum + stats.size;
    }, 0);
  }, 0);
  
  console.log(`${colors.green}💾 Gesamtgröße: ${formatBytes(totalSize)}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  console.log(`${colors.blue}ℹ Nächster Schritt: npm run transform:historical${colors.reset}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { processYear, ARCHIVE_URLS };
