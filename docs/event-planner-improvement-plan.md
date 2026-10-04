# Event Planner Improvement Plan — Revised Information Architecture

## Scope

This plan modifies only the Event Planner experience. Do not modify WOM, Admin,
Executive, Project Manager, Ground Crew, or other role interfaces. Event
Planners receive events through the API; they do not create or administer them.

## Final sidebar

Use the Admin/Executive-style shell consistently across every Event Planner
surface. Its sidebar contains exactly four destinations:

1. Dashboard
2. Design Projects
3. Mood Boards
4. Asset Catalog

The bottom area contains the user card, light/dark-mode control, and sign out.

### Authorization boundary

Remove `/registry` and `/damage` from Event Planner authorization. They must be
denied on direct navigation and redirect to Dashboard, not simply be hidden.
Event details remain viewable only through an assigned project.

All API responses that list events, projects, availability, or project context
must be server-scoped to the authenticated planner's assignments. Do not rely
on browser-side filtering; unassigned and test events must not leak through
direct URLs, caches, or broad responses.

## Shared shell

The top bar has only the current date/time, notification bell, and profile
control. Remove the global search, extra options, and "Lumière Creatives" from
the current planner home top bar. Use the Admin/Executive visual system:
serif page titles, muted one-line subtitles, dark sidebar, matching card/page
backgrounds, type scale, active state, spacing, and button treatment.

## 1. Dashboard

Dashboard is the planner landing page, with the standard serif **Dashboard**
heading and a concise muted subtitle.

### Calendar and Upcoming Events

The top row uses two matching-height standard cards:

- Calendar on the left, roughly 60% width
- Upcoming Events on the right

Upcoming Events retains month grouping, its status filter, and status labels.
Both areas show only events assigned to the current planner.

Calendar cells show event code plus a status-colored dot. Do not truncate a
status to text such as "Initia..." or "Active"; show the full event and status
on hover/focus. Keep the existing gold highlight for today.

Clicking a calendar event or Upcoming Events row opens that event's Design
Project. It must not open a WOM operational summary.

### Recents

Place Recents directly beneath the top row. Keep Designer, Type, and Sort
filters plus the grid/list toggle. Expose full truncated titles on hover/focus.
A Recents card opens the event canvas directly.

## 2. Design Projects

Design Projects is the full view of every canvas assigned to the planner. It
uses the Recents card model plus search and an event-status filter.

Each API-assigned event automatically appears as a project card. Derive the
card from the event; do not persist an empty canvas just because it synced.
Create/persist a design only when the planner begins work. This prevents
seeded/non-canonical IDs such as `pe-1` from being used in canvas requests.

A project page exposes its read-only event context: client, venue, dates,
ingress/egress, and status. Opening the canvas goes to Canvas Workspace.

## 3. Mood Boards

Mood boards may be event-linked or standalone. The data model has nullable
`event_id`: populated means linked; empty means standalone.

The page contains an All / Linked to an event / Standalone filter and a gold
**+ Mood Board** button at top right. Its creation dialog has an optional
**Link to event** dropdown restricted to the planner's assigned events.

Cards show their linked event name or an **Unlinked** badge. Each card supports
Attach to event and Detach. Project pages include a Mood Boards section showing
boards linked to that event.

## 4. Asset Catalog

Asset Catalog is a read-only, date-aware view of WOM-registered assets. It has
a visual category grid, search, and a **New** badge for recently registered
assets. Do not show costs, suppliers, condition/damage history, reservation
owners, or edit actions.

At the top, **Check availability for** offers an assigned event selector and
custom date range. It defaults to the source event when opened from a project.
For the selected dates, each asset shows only:

- Available
- Limited, for example "3 of 10 left"
- Fully reserved

Availability must be server-derived for the selected date window and described
as current verified checkpoint-based state, not real-time streaming.

Canvas Workspace uses this same catalog with its event dates applied
automatically. Fully reserved assets may be placed only as visibly greyed,
unallocated at-risk placeholders; approval/routing is blocked until replaced
or availability changes.

## Canvas defects and improvements

### Asset catalog and persistence

Fix the production "Failed to load asset catalog from server" failure before
testing placement/allocation. Production evidence shows absent Supabase client
environment variables and an unexpected canonical-assets response shape.
Follow the approved API/data contract; do not add vision-vendor credentials or
unrelated client secrets to the SPA.

Fix canvas layout load and auto-save HTTP 400 responses by using canonical
backend event IDs for assigned synced events. Verify loading and saving without
creating test events or changing existing production records.

### Canvas Workspace toolbar

The toolbar is currently compressed. Group controls as follows:

- Left: Home and design name
- Center: undo/redo, layout mode, zoom
- Right: share, present, comments, approval/routing

Use consistent minimum height, padding, gaps, and responsive overflow. Move
secondary controls to Settings/overflow rather than shrinking all controls.

## Data correctness

Read-only event context must never show a creation-conflict alert against the
event itself. If edit validation is later introduced, it must exclude the
current event ID.

Do not present seeded/mock fallback records as current production data while an
authoritative request is pending. Use loading/error states or clear provenance.
Replace wording such as "Live field sync" with "Current verified state" and/or
a last-verified timestamp; Lumière sync is checkpoint-based polling and
focus-triggered refetch, not real-time streaming.

## Out of scope

Do not change WOM layout, calendar, routing, data, or permissions; any other
role UI; production records; event creation; allocation commitments; approvals;
or deletions during verification. API/data-contract support for planner
assignment filtering, mood-board persistence, date-aware availability, and
canonical canvas IDs may be required, but it must support only this planner
experience and not alter other role interfaces.

## Verification requirements

Before closing an implementation prompt:

1. Show the git diff for every changed file.
2. Run relevant build/lint checks.
3. Run a real browser test with the Event Planner account and capture a
   screenshot of each changed planner screen.
4. Verify live production API behavior when the change depends on API data;
   never expose credentials, tokens, or secrets.
5. Verify direct Event Planner navigation to `/registry` and `/damage` is
   denied.
6. Never claim a feature works based only on build/deploy success.

