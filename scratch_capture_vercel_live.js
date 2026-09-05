import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\7666cfa7-fcf2-4bcc-a75b-8743e7340acf';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : (fs.existsSync(EDGE_PATH) ? EDGE_PATH : null);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Launching browser to verify live Vercel production deployment (https://lumieredemo.vercel.app)...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 950 }
  });
  const page = await browser.newPage();

  const snap = async (filename) => {
    const p = path.join(ARTIFACT_DIR, `${filename}.png`);
    await page.screenshot({ path: p, fullPage: true });
    console.log(`[VERCEL LIVE SNAP] Saved ${filename}.png`);
    return p;
  };

  const updateStore = async (updaterFn) => {
    await page.evaluate((fnStr) => {
      const raw = localStorage.getItem('lumiere_store_v1');
      let stateObj = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      const updater = new Function('state', fnStr);
      updater(stateObj.state);
      localStorage.setItem('lumiere_store_v1', JSON.stringify(stateObj));
    }, updaterFn.toString().slice(updaterFn.toString().indexOf('{') + 1, updaterFn.toString().lastIndexOf('}')));
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(500);
  };

  try {
    console.log('Navigating to https://lumieredemo.vercel.app ...');
    await page.goto('https://lumieredemo.vercel.app', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await snap('vercel_live_1_homepage');

    // 1. Live Production: Executive Read-only View on /damage
    console.log('Testing live Vercel /damage as Executive...');
    await updateStore((state) => {
      state.currentUser = {
        id: 'usr-exec-1',
        name: 'Victoria Vance',
        role: 'Executive',
        email: 'vance@lumiere.com'
      };
    });
    await page.goto('https://lumieredemo.vercel.app/damage', { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap('vercel_live_2_executive_damage_readonly');

    // 2. Live Production: WOM Evaluation View on /damage
    console.log('Testing live Vercel /damage as WOM...');
    await updateStore((state) => {
      state.currentUser = {
        id: 'usr-wom-1',
        name: 'Marcus Brody',
        role: 'Warehouse Manager',
        subRole: 'Warehouse Manager',
        email: 'marcus@lumiere.com',
        allowSelfValidation: true
      };
    });
    await page.goto('https://lumieredemo.vercel.app/damage', { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap('vercel_live_3_wom_damage_interactive');

    // 3. Live Production: Event Settlement Enforcement on /events
    console.log('Testing live Vercel /events settlement enforcement...');
    await page.goto('https://lumieredemo.vercel.app/events', { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap('vercel_live_4_event_settlement_blocked');

    console.log('Live Vercel verification completed successfully!');
  } catch (err) {
    console.error('Error during live Vercel production check:', err);
  } finally {
    await browser.close();
  }
}

run();
