# LUMIÈRE — Change Log

**IMPORTANT:** For upcoming changes, add new entries at the very top, above older ones (most recent first). Each entry is a date, followed by a plain-language "What's Changed" list — no need for technical detail, just what actually changed and why someone would notice it. If something was planned but not finished, it's fine to say so.

---

## Monday, September 7, 2026

### What's Changed

#### | - EXECUTIVE ACCOUNT - |

#### 1. Executive Dashboard
- **Live Alert Ticker:** Replaced the static action list with a 3-tab ticker (Urgent / Highlight / Soft Alert) that automatically jumps back to the Urgent tab when critical items arrive.
- **Summary Modals:** Added a "View Summary" popup to both Trend Analytics tabs, matching the detailed month-by-month breakdown on the Admin side.
- **Visual Fix:** Fixed a chart clipping issue where graphics were getting cut off at the bottom of the trend card.
- **Single Data Source:** Connected the live feed, audit log, and alert ticker to one shared source file (`operational-events.ts`) so all dashboard widgets display matching data.

#### 2. Event Operations
- **Split Layout:** Divided Event Operations into two distinct tabs: **Registry** (saved event details) and **Readiness** (real-time setup progress).

#### 3. Asset Inventory
- **Stock Oversight:** Added quick inventory tracking to Executive views so leaders can monitor physical stock levels, item availability, and low-stock alerts.
- **Real-Time Stock Updates:** Resolving a report to `Sent for Repair` or `Sent for Write-off` automatically updates physical warehouse inventory ledgers.

#### 4. Damage Validation
- **Cleaner Status System:** Replaced the old status list with a clean set of 6 states (`Pending Verdict`, `Dismissed`, `Pending Resolution`, `Sent for Repair`, `Sent for Write-off`, plus two escalation levels). This also fixed a white-screen crash caused by outdated status codes.
- **Two-Round Escalation:** Split reviews into two distinct steps: **Round 1** (checking if the damage report is valid) and **Round 2** (deciding whether to repair or write off). Warehouse Operations can escalate either step to Executives independently.
- **Smart Editing Rights:** Whoever makes the decision for a round (WOM or Executive) keeps the right to edit it later. Changing a Round 1 decision on an already-resolved report triggers a warning so completed actions aren't undone by mistake.
- **Persistent Status Icons:** Added small visual indicators on damage reports that stay visible even after a case is closed, showing if photographic evidence was missing or if the report passed Step 1 validation.
- **Single Executive Account:** Retired the unused `executive2@lumiere.com` demo account, as dual-Executive sign-off is no longer required under this single-account executive model.

#### 5. Operational Audit Logs
- **Centralized Tracking:** Unified system activity under a shared event format, making it easy to filter logs by status (`All`, `Success`, `Flagged`, `Approved`, `Pending`).
- **Clear Attribution:** Every logged action now consistently records the user's role and IP address for full accountability.

#### 6. Documentation
- **Updated Project State:** Refreshed `PROJECT_STATE.md` and `Lumiere_Progress_Report.md` to match current system logic.
- **Changelog Created:** Initialized `CHANGELOG.md` to track repository changes moving forward.

---

### Still To Do
- **WOM Damage Validation Screen:** Warehouse's dedicated screen to Evaluate/Escalate field reports still needs to be built before the escalation model is fully operational end-to-end.
- **Dashboard Pie Charts:** The Executive pie charts still display status data rather than category breakdowns (e.g., event type or Damaged vs. Missing).
- **Event Admin Role:** The proposed "Event Admin" Ground Crew role remains deferred until a Team Lead structure is added to the system.