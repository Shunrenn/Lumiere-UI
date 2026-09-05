import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\7666cfa7-fcf2-4bcc-a75b-8743e7340acf';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : (fs.existsSync(EDGE_PATH) ? EDGE_PATH : null);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Launching browser to render ReplenishmentModule directly...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 950 }
  });
  const page = await browser.newPage();

  const snap = async (filename) => {
    const p = path.join(ARTIFACT_DIR, `${filename}.png`);
    await page.screenshot({ path: p, fullPage: true });
    console.log(`[DIRECT SNAP] Saved ${filename}.png`);
    return p;
  };

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await sleep(500);

    // Login as Warehouse Manager
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

    // Open inventory page
    await page.goto('http://localhost:5173/inventory', { waitUntil: 'networkidle2' });
    await sleep(800);

    // Click Critical Deficits stat card to trigger replenishment module drilldown
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div, button'));
      const target = buttons.find(b => b.textContent && b.textContent.includes('Critical Deficits'));
      if (target) target.click();
    });
    await sleep(800);
    await snap('prompt6_live_module_open');

    // Extract exact data from the event card header rendering
    const cardMetrics = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.overflow-hidden.rounded-xl.border'));
      return cards.map(card => {
        const title = card.querySelector('h2')?.textContent || '';
        const statLine = card.querySelector('p.uppercase')?.textContent || '';
        const activeTotal = card.querySelector('.text-lg.font-semibold')?.textContent || '';
        const rows = Array.from(card.querySelectorAll('tbody tr')).map(tr => tr.textContent || '');
        return { title, statLine, activeTotal, rows };
      }).filter(c => c.title);
    });

    console.log('--- LIVE EVENT CARD METRICS ---');
    console.log(JSON.stringify(cardMetrics, null, 2));

    // Find and click "+ Add Item" on the first event card
    const clickedAdd = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addBtn = btns.find(b => b.textContent && b.textContent.includes('+ Add Item'));
      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });

    if (clickedAdd) {
      await sleep(600);
      await snap('prompt6_live_add_item_modal_prefilled');

      const modalInfo = await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"]');
        if (!dialog) return null;
        return {
          title: dialog.querySelector('h2')?.textContent || '',
          subtitle: dialog.querySelector('p')?.textContent || ''
        };
      });
      console.log('--- PRE-FILLED MODAL DETAILS ---', JSON.stringify(modalInfo, null, 2));

      // Close modal
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const cancelBtn = btns.find(b => b.textContent && b.textContent.includes('Cancel'));
        if (cancelBtn) cancelBtn.click();
      });
      await sleep(400);
    }

    // Click "Export Report" on the event card
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const exportBtn = btns.find(b => b.textContent && b.textContent.includes('Export Report'));
      if (exportBtn) exportBtn.click();
    });
    await sleep(600);
    await snap('prompt6_live_per_event_pdf_exported');

  } catch (err) {
    console.error('Error during direct capture:', err);
  } finally {
    await browser.close();
  }
}

run();
