import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\7666cfa7-fcf2-4bcc-a75b-8743e7340acf';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : (fs.existsSync(EDGE_PATH) ? EDGE_PATH : null);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Launching browser for Prompt 6 verification...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 950 }
  });
  const page = await browser.newPage();

  const snap = async (filename) => {
    const p = path.join(ARTIFACT_DIR, `${filename}.png`);
    await page.screenshot({ path: p, fullPage: true });
    console.log(`[PROMPT 6 SNAP] Saved ${filename}.png`);
    return p;
  };

  const clickText = async (selector, textMatch) => {
    const handles = await page.$$(selector);
    for (const h of handles) {
      const txt = await page.evaluate(el => el.textContent, h);
      if (txt && txt.includes(textMatch)) {
        await h.click();
        return true;
      }
    }
    return false;
  };

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await sleep(500);

    // Set active user as Warehouse Manager and navigate to /replenishment module or page
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

    await page.goto('http://localhost:5173/replenishment', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await snap('prompt6_1_replenishment_page_3_statuses');

    // Click per-event "+ Add Item" button on an event header card
    const clickedAddItem = await clickText('button', '+ Add Item');
    if (clickedAddItem) {
      await sleep(600);
      await snap('prompt6_2_per_event_add_item_modal_bound');
      await clickText('button', 'Cancel');
    }

  } catch (err) {
    console.error('Error during Prompt 6 verification:', err);
  } finally {
    await browser.close();
    console.log('Prompt 6 verification finished.');
  }
}

run();
