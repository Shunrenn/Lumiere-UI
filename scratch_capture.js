import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\7666cfa7-fcf2-4bcc-a75b-8743e7340acf';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : (fs.existsSync(EDGE_PATH) ? EDGE_PATH : null);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function captureScreenshots() {
  console.log('Launching browser with:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  const takeScreenshot = async (name) => {
    const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved screenshot: ${filePath}`);
    return filePath;
  };

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await sleep(1000);

    // ==========================================
    // 1. Executive Read-only View on /damage
    // ==========================================
    console.log('--- 1. Executive Read-only View on /damage ---');
    await page.evaluate(() => {
      const rawStore = localStorage.getItem('lumiere_store_v1');
      if (rawStore) {
        const store = JSON.parse(rawStore);
        if (store.state) {
          store.state.currentUser = {
            id: 'usr-exec-1',
            name: 'Eleanor Vance',
            role: 'Executive',
            email: 'eleanor@lumiere.com'
          };
          localStorage.setItem('lumiere_store_v1', JSON.stringify(store));
        }
      }
    });
    await page.goto('http://localhost:5173/damage', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot('1_exec_damage_readonly_view');

    // Click "View Report" modal as Executive
    const viewReportBtn = await page.$('button');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('View Report') || text.includes('View Audit'))) {
        await btn.click();
        await sleep(500);
        await takeScreenshot('1b_exec_damage_report_modal_readonly');
        // Close modal
        const closeBtn = await page.$('button[aria-label="Close"], svg.lucide-x, button:has-text("Close")');
        if (closeBtn) await closeBtn.click();
        break;
      }
    }

    // ==========================================
    // 2. Executive Dashboard Notify-Only Components
    // ==========================================
    console.log('--- 2. Executive Dashboard Notify-Only Components ---');
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot('2_exec_dashboard_components');

    // ==========================================
    // 3. WOM Active Sign-off & Asset Inventory Side Effects
    // ==========================================
    console.log('--- 3. WOM Active Sign-off & Asset Inventory Side Effects ---');
    // Switch to WOM user
    await page.evaluate(() => {
      const rawStore = localStorage.getItem('lumiere_store_v1');
      if (rawStore) {
        const store = JSON.parse(rawStore);
        if (store.state) {
          store.state.currentUser = {
            id: 'usr-wom-1',
            name: 'Marcus Brody',
            role: 'Warehouse Manager',
            subRole: 'Warehouse Manager',
            email: 'marcus@lumiere.com',
            allowSelfValidation: true,
            selfValidationPin: '1234'
          };
          localStorage.setItem('lumiere_store_v1', JSON.stringify(store));
        }
      }
    });
    await page.goto('http://localhost:5173/damage', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot('3a_wom_damage_interactive_signoff');

    // Open Repair modal for an item
    const womButtons = await page.$$('button');
    for (const btn of womButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Process Sign-off')) {
        await btn.click();
        await sleep(500);
        await takeScreenshot('3b_wom_signoff_modal');
        break;
      }
    }

    // Inventory Stock showing 'In Maintenance' and 'Depleted'
    await page.goto('http://localhost:5173/inventory', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot('3c_inventory_stock_in_maintenance');

    // ==========================================
    // 4. Complete Maintenance Flow
    // ==========================================
    console.log('--- 4. Complete Maintenance Flow ---');
    // As WOM, click an asset in Maintenance to show Complete Maintenance button
    const tableRows = await page.$$('tr, div[role="button"]');
    for (const row of tableRows) {
      const text = await page.evaluate(el => el.textContent, row);
      if (text && text.includes('In Maintenance')) {
        await row.click();
        await sleep(500);
        await takeScreenshot('4a_wom_complete_maintenance_button');
        // Click Return to Stock button if visible
        const completeBtn = await page.$('button:has-text("Complete Maintenance")');
        if (completeBtn) {
          await completeBtn.click();
          await sleep(500);
          await takeScreenshot('4b_wom_complete_maintenance_modal');
        }
        break;
      }
    }

    // Switch to Executive / Event Planner to confirm read-only status badge (no action button)
    await page.evaluate(() => {
      const rawStore = localStorage.getItem('lumiere_store_v1');
      if (rawStore) {
        const store = JSON.parse(rawStore);
        if (store.state) {
          store.state.currentUser = {
            id: 'usr-planner-1',
            name: 'Sarah Connor',
            role: 'Event Planner',
            email: 'sarah@lumiere.com'
          };
          localStorage.setItem('lumiere_store_v1', JSON.stringify(store));
        }
      }
    });
    await page.goto('http://localhost:5173/inventory', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot('4c_planner_inventory_readonly_badge');

    // ==========================================
    // 5. Strict Block Banner
    // ==========================================
    console.log('--- 5. Strict Block Banner ---');
    // Set allowSelfValidation: false and 1 WOM account only
    await page.evaluate(() => {
      const rawStore = localStorage.getItem('lumiere_store_v1');
      if (rawStore) {
        const store = JSON.parse(rawStore);
        if (store.state) {
          store.state.currentUser = {
            id: 'usr-wom-1',
            name: 'Marcus Brody',
            role: 'Warehouse Manager',
            subRole: 'Warehouse Manager',
            email: 'marcus@lumiere.com',
            allowSelfValidation: false
          };
          // Filter users to only 1 WOM account
          store.state.users = [
            {
              id: 'usr-wom-1',
              name: 'Marcus Brody',
              role: 'Warehouse Manager',
              subRole: 'Warehouse Manager',
              email: 'marcus@lumiere.com',
              allowSelfValidation: false
            }
          ];
          localStorage.setItem('lumiere_store_v1', JSON.stringify(store));
        }
      }
    });
    await page.goto('http://localhost:5173/damage', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot('5_strict_block_understaffed_banner');

    // ==========================================
    // 6. Admin Emergency Unblock - Option A & Option B
    // ==========================================
    console.log('--- 6. Admin Emergency Unblock ---');
    await page.evaluate(() => {
      const rawStore = localStorage.getItem('lumiere_store_v1');
      if (rawStore) {
        const store = JSON.parse(rawStore);
        if (store.state) {
          store.state.currentUser = {
            id: 'usr-admin-1',
            name: 'System Admin',
            role: 'Admin',
            email: 'admin@lumiere.com'
          };
          localStorage.setItem('lumiere_store_v1', JSON.stringify(store));
        }
      }
    });
    await page.goto('http://localhost:5173/admin/roles', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot('6a_admin_roles_page');

    // Click emergency toggle to open modal
    const toggles = await page.$$('button, input[type="checkbox"], div[role="switch"]');
    for (const toggle of toggles) {
      const text = await page.evaluate(el => el.textContent || el.outerHTML, toggle);
      if (text.includes('Override') || text.includes('Emergency') || text.includes('Self-Validation')) {
        await toggle.click();
        await sleep(500);
        await takeScreenshot('6b_admin_emergency_unblock_modal');
        break;
      }
    }

    // ==========================================
    // 7. Damage Custody Verification Card (3 states)
    // ==========================================
    console.log('--- 7. Damage Custody Verification Card ---');
    await page.goto('http://localhost:5173/damage', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot('7_damage_custody_verification_cards');

    // ==========================================
    // 8. Event Settlement Block / Unblock
    // ==========================================
    console.log('--- 8. Event Settlement Block / Unblock ---');
    await page.goto('http://localhost:5173/events', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot('8a_event_settlement_blocked');

  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
    console.log('Screenshot capture process finished.');
  }
}

captureScreenshots();
