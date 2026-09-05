import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\7666cfa7-fcf2-4bcc-a75b-8743e7340acf';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : (fs.existsSync(EDGE_PATH) ? EDGE_PATH : null);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Launching browser for Prompt 6 live click-through verification...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 950 }
  });
  const page = await browser.newPage();

  const snap = async (filename) => {
    const p = path.join(ARTIFACT_DIR, `${filename}.png`);
    await page.screenshot({ path: p, fullPage: true });
    console.log(`[LIVE PROMPT 6 SNAP] Saved ${filename}.png`);
    return p;
  };

  try {
    // 1. Setup local storage state with mixed status lines for a specific event
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await sleep(500);

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

    // Open Warehouse Replenishment Module
    await page.goto('http://localhost:5173/inventory', { waitUntil: 'networkidle2' });
    await sleep(800);

    // Let's inspect the event grouped view text on /replenishment directly if accessible or click module
    await page.goto('http://localhost:5173/replenishment', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await snap('p6_1_grouped_view_overview');

    // Extract text from the first event header card to verify math and header stat line
    const eventHeaderInfo = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.overflow-hidden.rounded-xl.border'));
      for (const card of cards) {
        const titleEl = card.querySelector('h2');
        const statEl = card.querySelector('p.uppercase');
        const totalEl = card.querySelector('.text-lg.font-semibold');
        if (titleEl && statEl && totalEl) {
          return {
            title: titleEl.textContent,
            statLine: statEl.textContent,
            runningTotal: totalEl.textContent,
            fullText: card.textContent
          };
        }
      }
      return null;
    });
    console.log('--- Event Card Header Info ---', JSON.stringify(eventHeaderInfo, null, 2));

    // Click "+ Add Item" on the first event card
    const buttons = await page.$$('button');
    let clickedAdd = false;
    for (const b of buttons) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && txt.includes('+ Add Item')) {
        await b.click();
        clickedAdd = true;
        break;
      }
    }

    if (clickedAdd) {
      await sleep(600);
      await snap('p6_2_add_item_modal_bound_to_event');

      // Check modal title / subtitle for event pre-binding
      const modalInfo = await page.evaluate(() => {
        const modal = document.querySelector('div[role="dialog"]');
        if (!modal) return null;
        return {
          header: modal.querySelector('h2')?.textContent,
          subtitle: modal.querySelector('p')?.textContent
        };
      });
      console.log('--- Modal Event Pre-Binding Info ---', JSON.stringify(modalInfo, null, 2));

      // Close modal
      const cancelBtn = await page.$('button:has-text("Cancel"), button[aria-label="Close"]');
      const btns = await page.$$('button');
      for (const b of btns) {
        const t = await page.evaluate(el => el.textContent, b);
        if (t && t.includes('Cancel')) {
          await b.click();
          break;
        }
      }
      await sleep(400);
    }

    // Click "Export Report" on the first event card
    for (const b of buttons) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && txt.includes('Export Report')) {
        console.log('Clicking per-event Export Report...');
        await b.click();
        await sleep(600);
        await snap('p6_3_export_report_triggered');
        break;
      }
    }

    console.log('Live Prompt 6 click-through verification finished successfully!');
  } catch (err) {
    console.error('Error during Prompt 6 live click-through:', err);
  } finally {
    await browser.close();
  }
}

run();
