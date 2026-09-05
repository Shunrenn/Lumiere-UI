import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\7666cfa7-fcf2-4bcc-a75b-8743e7340acf';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : (fs.existsSync(EDGE_PATH) ? EDGE_PATH : null);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Launching browser for detailed verification screenshots...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 950 }
  });
  const page = await browser.newPage();

  const snap = async (filename) => {
    const p = path.join(ARTIFACT_DIR, `${filename}.png`);
    await page.screenshot({ path: p, fullPage: true });
    console.log(`[SNAP] Saved ${filename}.png`);
    return p;
  };

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await sleep(500);

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

    // Helper to find element by text content
    const clickElementWithText = async (selector, textMatch) => {
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

    // -------------------------------------------------------------
    // SCENARIO 1: Executive read-only view (/damage & View Report modal)
    // -------------------------------------------------------------
    console.log('Capture Scenario 1: Exec /damage read-only & modal');
    await updateStore((state) => {
      state.currentUser = {
        id: 'exec-user',
        name: 'Victoria Vance',
        role: 'Executive',
        email: 'vance@lumiere.com'
      };
      state.damageRecords = [
        {
          id: 'dmg-101',
          eventId: 'evt-201',
          eventName: 'Gala Night 2026',
          assetId: 'ast-1',
          assetName: 'Crystal Chandelier 500W',
          serialNumber: 'LUM-CH-001',
          reportedBy: 'Staff Member',
          reportDate: '2026-09-01T10:00:00Z',
          severity: 'major',
          description: 'Shattered crystal element during disassembly.',
          status: 'pending',
          custodyMode: 'genuine-dual-custody'
        },
        {
          id: 'dmg-102',
          eventId: 'evt-201',
          eventName: 'Gala Night 2026',
          assetId: 'ast-2',
          assetName: 'Velvet Lounge Chair',
          serialNumber: 'LUM-VC-004',
          reportedBy: 'Warehouse Tech',
          reportDate: '2026-09-02T14:30:00Z',
          severity: 'minor',
          description: 'Fabric torn on left armrest.',
          status: 'resolved',
          verdict: 'Repair',
          verdictNotes: 'Approved for restoration.',
          verdictBy: 'Marcus Brody',
          verdictDate: '2026-09-03T09:15:00Z',
          custodyMode: 'genuine-dual-custody',
          signOffs: [
            { id: 'so-1', userId: 'usr-wom-1', userName: 'Marcus Brody', userRole: 'Warehouse Manager', userSubRole: 'Warehouse Manager', timestamp: '2026-09-03T09:10:00Z', verdict: 'Repair', notes: 'First verification complete' },
            { id: 'so-2', userId: 'usr-wom-2', userName: 'Sarah Jenkins', userRole: 'Warehouse Manager', userSubRole: 'Inventory Officer', timestamp: '2026-09-03T09:15:00Z', verdict: 'Repair', notes: 'Second verification complete' }
          ]
        }
      ];
    });

    await page.goto('http://localhost:5173/damage', { waitUntil: 'networkidle2' });
    await sleep(600);
    await snap('1a_executive_damage_readonly');

    // Click "View Report" on resolved record
    const clickedReport = await clickElementWithText('button', 'View Report');
    if (clickedReport) {
      await sleep(500);
      await snap('1b_executive_view_report_modal');
      await clickElementWithText('button', 'Close');
    }

    // -------------------------------------------------------------
    // SCENARIO 2: Executive Dashboard notify-only components
    // -------------------------------------------------------------
    console.log('Capture Scenario 2: Executive Dashboard components');
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap('2_executive_dashboard_notify_only');

    // -------------------------------------------------------------
    // SCENARIO 3: WOM active sign-off + side effects
    // -------------------------------------------------------------
    console.log('Capture Scenario 3: WOM active sign-off & inventory status');
    await updateStore((state) => {
      state.currentUser = {
        id: 'usr-wom-1',
        name: 'Marcus Brody',
        role: 'Warehouse Manager',
        subRole: 'Warehouse Manager',
        email: 'marcus@lumiere.com',
        allowSelfValidation: true,
        selfValidationPin: '1234'
      };
      state.users = [
        { id: 'usr-wom-1', name: 'Marcus Brody', role: 'Warehouse Manager', subRole: 'Warehouse Manager', allowSelfValidation: true },
        { id: 'usr-wom-2', name: 'Sarah Jenkins', role: 'Warehouse Manager', subRole: 'Inventory Officer', allowSelfValidation: false }
      ];
      state.catalogAssets = [
        {
          id: 'ast-10',
          sku: 'AST-REPAIR-01',
          name: 'LED Spotlight Array 1000W',
          category: 'Lighting',
          status: 'In Maintenance',
          totalQuantity: 5,
          availableQuantity: 4,
          maintenanceQuantity: 1,
          location: 'Bay 3'
        },
        {
          id: 'ast-11',
          sku: 'AST-WRITEOFF-01',
          name: 'Vintage Glass Vase Set',
          category: 'Decor',
          status: 'Depleted',
          totalQuantity: 0,
          availableQuantity: 0,
          maintenanceQuantity: 0,
          location: 'Shelf B2'
        }
      ];
    });

    await page.goto('http://localhost:5173/damage', { waitUntil: 'networkidle2' });
    await sleep(600);
    await snap('3a_wom_damage_interactive');

    const clickedSignoff = await clickElementWithText('button', 'Process Sign-off');
    if (clickedSignoff) {
      await sleep(500);
      await snap('3b_wom_damage_verdict_modal');
      await clickElementWithText('button', 'Cancel');
    }

    await page.goto('http://localhost:5173/inventory', { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap('3c_inventory_stock_maintenance_and_depleted');

    // -------------------------------------------------------------
    // SCENARIO 4: Complete Maintenance flow (WOM vs Exec/Planner)
    // -------------------------------------------------------------
    console.log('Capture Scenario 4: Complete Maintenance flow');
    await page.goto('http://localhost:5173/inventory', { waitUntil: 'networkidle2' });
    await sleep(600);

    const clickedMaintAsset = await clickElementWithText('tr, div', 'LED Spotlight Array 1000W');
    if (clickedMaintAsset) {
      await sleep(600);
      await snap('4a_wom_complete_maintenance_action');

      const clickedCompleteBtn = await clickElementWithText('button', 'Complete Maintenance');
      if (clickedCompleteBtn) {
        await sleep(500);
        await snap('4b_wom_complete_maintenance_confirm_modal');
        await clickElementWithText('button', 'Cancel');
      }
      await clickElementWithText('button', 'Close');
    }

    // Switch to Executive to confirm read-only badge (no action button)
    await updateStore((state) => {
      state.currentUser = { id: 'exec-1', name: 'Victoria Vance', role: 'Executive' };
    });
    await page.goto('http://localhost:5173/inventory', { waitUntil: 'networkidle2' });
    await sleep(600);

    const clickedMaintExec = await clickElementWithText('tr, div', 'LED Spotlight Array 1000W');
    if (clickedMaintExec) {
      await sleep(600);
      await snap('4c_executive_asset_detail_readonly_badge_only');
      await clickElementWithText('button', 'Close');
    }

    // -------------------------------------------------------------
    // SCENARIO 5: Strict Block Banner
    // -------------------------------------------------------------
    console.log('Capture Scenario 5: Strict block banner understaffed warning');
    await updateStore((state) => {
      state.currentUser = {
        id: 'usr-wom-1',
        name: 'Marcus Brody',
        role: 'Warehouse Manager',
        subRole: 'Warehouse Manager',
        allowSelfValidation: false
      };
      state.users = [
        { id: 'usr-wom-1', name: 'Marcus Brody', role: 'Warehouse Manager', subRole: 'Warehouse Manager', allowSelfValidation: false }
      ];
    });
    await page.goto('http://localhost:5173/damage', { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap('5_strict_block_understaffed_warning_banner');

    // -------------------------------------------------------------
    // SCENARIO 6: Admin Emergency Unblock - Modal, Option A, Option B
    // -------------------------------------------------------------
    console.log('Capture Scenario 6: Admin Emergency Unblock options');
    await updateStore((state) => {
      state.currentUser = { id: 'usr-admin-1', name: 'System Admin', role: 'Admin' };
      state.users = [
        { id: 'usr-wom-1', name: 'Marcus Brody', role: 'Warehouse Manager', subRole: 'Warehouse Manager', allowSelfValidation: false }
      ];
    });
    await page.goto('http://localhost:5173/admin/roles', { waitUntil: 'networkidle2' });
    await sleep(600);
    await snap('6a_admin_roles_page_governance');

    const clickedToggle = await clickElementWithText('button, div', 'Override');
    if (!clickedToggle) {
      // Try finding button inside role card
      const switches = await page.$$('button[role="switch"]');
      if (switches.length > 0) {
        await switches[0].click();
      }
    }
    await sleep(500);
    await snap('6b_admin_emergency_unblock_modal');

    // Select Option B radio/button inside modal
    const clickedOptB = await clickElementWithText('label, div, button', 'Option B');
    if (clickedOptB) {
      await sleep(500);
      await snap('6c_admin_emergency_option_b_high_friction_warning');
    }

    await clickElementWithText('button', 'Cancel');

    // -------------------------------------------------------------
    // SCENARIO 7: Damage Custody Verification Card (3 states)
    // -------------------------------------------------------------
    console.log('Capture Scenario 7: Damage Custody Verification Cards');
    await updateStore((state) => {
      state.currentUser = { id: 'exec-1', name: 'Victoria Vance', role: 'Executive' };
      state.damageRecords = [
        {
          id: 'dmg-c1',
          eventId: 'evt-1',
          eventName: 'Met Gala 2026',
          assetId: 'ast-1',
          assetName: 'Stage Lighting Rig',
          serialNumber: 'RIG-001',
          severity: 'critical',
          description: 'Dual sign-off completed by 2 distinct WOMs',
          status: 'resolved',
          verdict: 'Repair',
          custodyMode: 'genuine-dual-custody',
          signOffs: [
            { id: 's1', userId: 'wom-1', userName: 'Marcus Brody', userRole: 'Warehouse Manager', userSubRole: 'Warehouse Manager', timestamp: '2026-09-01T10:00:00Z', verdict: 'Repair', notes: 'First WOM verification' },
            { id: 's2', userId: 'wom-2', userName: 'Sarah Jenkins', userRole: 'Warehouse Manager', userSubRole: 'Inventory Officer', timestamp: '2026-09-01T10:15:00Z', verdict: 'Repair', notes: 'Second WOM verification' }
          ]
        },
        {
          id: 'dmg-c2',
          eventId: 'evt-1',
          eventName: 'Met Gala 2026',
          assetId: 'ast-2',
          assetName: 'Pro Audio Subwoofer',
          serialNumber: 'SUB-99',
          severity: 'major',
          description: 'Self-validated with PIN + justification',
          status: 'resolved',
          verdict: 'Write-off',
          custodyMode: 'standing-self-validation',
          selfValidationRecord: {
            userId: 'wom-1',
            userName: 'Marcus Brody',
            timestamp: '2026-09-02T12:00:00Z',
            justification: 'Emergency single-operator night shift. Equipment damaged beyond repair during unloading.'
          }
        },
        {
          id: 'dmg-c3',
          eventId: 'evt-1',
          eventName: 'Met Gala 2026',
          assetId: 'ast-3',
          assetName: 'HD LED Display Panel',
          serialNumber: 'PANEL-7',
          severity: 'moderate',
          description: 'Resolved under Admin Emergency Override',
          status: 'resolved',
          verdict: 'Repair',
          custodyMode: 'admin-enabled-override',
          emergencyOverrideMetadata: {
            adminUserId: 'admin-1',
            adminUserName: 'System Admin',
            timestamp: '2026-09-03T15:00:00Z',
            optionChosen: 'one-time-instance',
            reason: 'Understaffed weekend outage unblocked by System Admin'
          }
        }
      ];
    });

    await page.goto('http://localhost:5173/damage', { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap('7_damage_custody_verification_all_3_states');

    // -------------------------------------------------------------
    // SCENARIO 8: Event Settlement block/unblock
    // -------------------------------------------------------------
    console.log('Capture Scenario 8: Event Settlement block and unblock');
    await updateStore((state) => {
      state.currentUser = { id: 'planner-1', name: 'Sarah Connor', role: 'Event Planner' };
      state.events = [
        {
          id: 'evt-settle-1',
          title: 'Summer Fashion Showcase 2026',
          client: 'Vogue Global',
          date: '2026-08-30',
          status: 'Completed',
          pendingDamageCount: 2
        }
      ];
    });

    await page.goto('http://localhost:5173/events', { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap('8a_event_settlement_disabled_pending_damage');

    // Now resolve all items and show enabled Settle Event button
    await updateStore((state) => {
      state.events = [
        {
          id: 'evt-settle-1',
          title: 'Summer Fashion Showcase 2026',
          client: 'Vogue Global',
          date: '2026-08-30',
          status: 'Completed',
          pendingDamageCount: 0
        }
      ];
    });
    await page.goto('http://localhost:5173/events', { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap('8b_event_settlement_enabled_all_resolved');

  } catch (err) {
    console.error('Error in detailed screenshot runner:', err);
  } finally {
    await browser.close();
    console.log('Detailed screenshot capture finished.');
  }
}

run();
