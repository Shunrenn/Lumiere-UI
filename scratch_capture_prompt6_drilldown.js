import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\7666cfa7-fcf2-4bcc-a75b-8743e7340acf';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : (fs.existsSync(EDGE_PATH) ? EDGE_PATH : null);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Launching browser to test ReplenishmentModule drilldown...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 950 }
  });
  const page = await browser.newPage();

  const snap = async (filename) => {
    const p = path.join(ARTIFACT_DIR, `${filename}.png`);
    await page.screenshot({ path: p, fullPage: true });
    console.log(`[PROMPT 6 DRILLDOWN SNAP] Saved ${filename}.png`);
    return p;
  };

  try {
    await page.goto('http://localhost:5173/inventory', { waitUntil: 'networkidle2' });
    await sleep(800);

    // Set active user as Warehouse Manager and trigger drilldown to 'replenishment'
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
    await sleep(800);

    // Click on Critical Deficits stat card to open replenishment module drilldown
    const statCards = await page.$$('div, button');
    for (const card of statCards) {
      const txt = await page.evaluate(el => el.textContent, card);
      if (txt && txt.includes('Critical Deficits')) {
        await card.click();
        console.log('Clicked Critical Deficits stat card...');
        break;
      }
    }
    await sleep(1000);
    await snap('prompt6_drilldown_module_opened');

    // Extract exact numbers from the rendered event cards in ReplenishmentModule
    const cardData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.overflow-hidden.rounded-xl.border'));
      return cards.map(c => {
        const title = c.querySelector('h2')?.textContent || '';
        const statLine = c.querySelector('p.uppercase')?.textContent || '';
        const activeTotal = c.querySelector('.text-lg.font-semibold')?.textContent || '';
        const rows = Array.from(c.querySelectorAll('tbody tr')).map(tr => tr.textContent);
        return { title, statLine, activeTotal, rowCount: rows.length };
      }).filter(c => c.title);
    });
    console.log('--- Rendered Event Cards Data ---', JSON.stringify(cardData, null, 2));

    // Click "+ Add Item" on the first event card inside the module
    const moduleButtons = await page.$$('button');
    for (const b of moduleButtons) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && txt.includes('+ Add Item')) {
        await b.click();
        console.log('Clicked per-event + Add Item button...');
        break;
      }
    }
    await sleep(600);
    await snap('prompt6_modal_prebound_to_event');

    // Extract modal header & subtitle text
    const modalDetails = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return null;
      return {
        title: dialog.querySelector('h2')?.textContent,
        sub: dialog.querySelector('p')?.textContent
      };
    });
    console.log('--- Pre-Bound Modal Details ---', JSON.stringify(modalDetails, null, 2));

    // Close modal
    for (const b of await page.$$('button')) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && txt.includes('Cancel')) {
        await b.click();
        break;
      }
    }
    await sleep(400);

    // Click "Export Report" on the first event card inside the module
    for (const b of await page.$$('button')) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && txt.includes('Export Report')) {
        await b.click();
        console.log('Clicked per-event Export Report...');
        break;
      }
    }
    await sleep(600);
    await snap('prompt6_per_event_pdf_export_triggered');

  } catch (err) {
    console.error('Error during drilldown test:', err);
  } finally {
    await browser.close();
  }
}

run();
