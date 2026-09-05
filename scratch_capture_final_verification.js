import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\7666cfa7-fcf2-4bcc-a75b-8743e7340acf';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : (fs.existsSync(EDGE_PATH) ? EDGE_PATH : null);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Launching browser for final post-build verification screenshots...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 950 }
  });
  const page = await browser.newPage();

  const snap = async (filename) => {
    const p = path.join(ARTIFACT_DIR, `${filename}.png`);
    await page.screenshot({ path: p, fullPage: true });
    console.log(`[VERIFIED SNAP] Saved ${filename}.png`);
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

    // -------------------------------------------------------------
    // 1. Executive Read-only View
    // -------------------------------------------------------------
    console.log('--- 1. Executive Read-only View ---');
    await updateStore((state) => {
      state.currentUser = {
        id: 'usr-exec-1',
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
        }
      ];
    });
    await page.goto('http://localhost:5173/damage', { waitUntil: 'networkidle2' });
    await sleep(600);
    await snap('verified_1_executive_damage_readonly');

    // -------------------------------------------------------------
    // 2. WOM Evaluation Flow
    // -------------------------------------------------------------
    console.log('--- 2. WOM Evaluation Flow ---');
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
        }
      ];
    });
    await page.goto('http://localhost:5173/damage', { waitUntil: 'networkidle2' });
    await sleep(600);
    await snap('verified_2a_wom_damage_evaluation');

    // Click Process Sign-off
    const clickedSignoff = await clickText('button', 'Process Sign-off');
    if (clickedSignoff) {
      await sleep(500);
      await snap('verified_2b_wom_verdict_modal');
      await clickText('button', 'Cancel');
    }

    // -------------------------------------------------------------
    // 3. Admin Emergency Unblock (One-time, Permanent Modal & Permanent Badge render)
    // -------------------------------------------------------------
    console.log('--- 3. Admin Emergency Unblock & Permanent Badge Render ---');
    await updateStore((state) => {
      state.currentUser = { id: 'usr-admin-1', name: 'System Admin', role: 'Admin', email: 'admin@lumiere.com' };
      state.subRoles = [
        {
          id: 'sub-wm',
          name: 'Warehouse Manager',
          parentRole: 'Warehouse Ops',
          allowSelfValidation: true,
          permanentlyEnabledViaEmergency: true,
          emergencyUnblockMetadata: {
            unblockedByAdminId: 'usr-admin-1',
            unblockedByAdminEmail: 'admin@lumiere.com',
            timestamp: '2026-09-05T12:00:00Z',
            reason: 'Permanent emergency override granted during critical staffing deficit'
          }
        }
      ];
    });

    await page.goto('http://localhost:5173/admin/roles', { waitUntil: 'networkidle2' });
    await sleep(600);
    // Expand subrole details
    await clickText('button, div', 'Warehouse Manager');
    await sleep(500);
    await snap('verified_3a_admin_roles_permanent_badge_audit_trace');

    // -------------------------------------------------------------
    // 4. Settlement Blocked Banner
    // -------------------------------------------------------------
    console.log('--- 4. Settlement Blocked Banner ---');
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
      state.damageExceptions = [
        {
          id: 'dmg-b1',
          logId: 'DMG-2026-089',
          boundEvent: 'Summer Fashion Showcase 2026',
          assetName: 'Stage Spotlight',
          status: 'Pending Verdict'
        }
      ];
    });

    await page.goto('http://localhost:5173/events', { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap('verified_4_event_settlement_blocked_banner');

  } catch (err) {
    console.error('Error during final screenshot run:', err);
  } finally {
    await browser.close();
    console.log('Final verification capture complete.');
  }
}

run();
