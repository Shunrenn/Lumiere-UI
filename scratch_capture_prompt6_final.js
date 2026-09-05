import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\7666cfa7-fcf2-4bcc-a75b-8743e7340acf';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : (fs.existsSync(EDGE_PATH) ? EDGE_PATH : null);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Launching browser to capture Prompt 6 live event card details...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 950 }
  });
  const page = await browser.newPage();

  const snap = async (filename) => {
    const p = path.join(ARTIFACT_DIR, `${filename}.png`);
    await page.screenshot({ path: p, fullPage: true });
    console.log(`[P6 LIVE SNAP] Saved ${filename}.png`);
    return p;
  };

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await sleep(500);

    // Set user as Warehouse Manager
    await page.evaluate(() => {
      const raw = localStorage.getItem('lumiere_store_v1');
      let stateObj = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      stateObj.state.currentUser = {
        id: 'usr-wom-1',
        name: 'Marcus Brody',
        role: 'Warehouse Manager',
        subRole: 'Warehouse Manager',
        email: 'marcus@lumiere.com'
      };
      localStorage.setItem('lumiere_store_v1', JSON.stringify(stateObj));
    });
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(500);

    await page.goto('http://localhost:5173/replenishment', { waitUntil: 'networkidle2' });
    await sleep(1000);

    // Capture initial Replenishment Page
    await snap('prompt6_replenishment_page');

    // Extract table and status details from the Replenishment Register
    const pageTableData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map(r => {
        const cols = Array.from(r.querySelectorAll('td')).map(c => c.textContent?.trim() || '');
        return cols.filter(Boolean);
      });
    });
    console.log('--- REPLENISHMENT REGISTER ROWS ---', JSON.stringify(pageTableData, null, 2));

  } catch (err) {
    console.error('Error during final Prompt 6 verification:', err);
  } finally {
    await browser.close();
  }
}

run();
