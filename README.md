# SVT Amazon Business Development

Dashboards for two SVT Fleet Solutions initiatives with Amazon:

1. **Amazon Vendor Approval**: SVT FLEET LLC approved as an active, registered Amazon vendor in its own name.
2. **Amazon Station Conversions**: Middle Mile first (ONT42 / ONT43 pilot, then EWR40, the PHL corridor and BOS42), with Last Mile at Amazon's level.

DSP outreach, DSP leads and routing workflows are out of scope for this repo.

## The three dashboards

| Dashboard | Who it's for | Live page | Source code | Snapshot |
|---|---|---|---|---|
| **Amazon BD Hub · Internal Only** | Brooke only (includes Exhibit A) | [Open](https://claude.ai/artifact/KNGV7Q89vw2EJNrFfwq3uo) | [`hub/`](hub/exhibit-a-priority-hub.html) | [`status/hub.md`](status/hub.md) |
| **ONT Pilot · SVT Team** | SVT and VVG team (Mike, Lon, Mark, VVG IT). Not for Amazon or Reach | [Open](https://claude.ai/artifact/57pZLpxJVW2gb8xTgxj77H) | [`pilot/`](pilot/ont42-pilot-launch.html) | [`status/pilot.md`](status/pilot.md) |
| **ONT Pilot · Amazon View** | Shared SVT and Amazon workspace (Evan Christodoulides and the Middle Mile team) | [Open](https://claude.ai/artifact/FVQgNvfAAnkuC6uZiwc668) | [`amazon/`](amazon/ont-pilot-amazon-status.html) | [`status/amazon.md`](status/amazon.md) |

The live pages are claude.ai artifacts. Each keeps its data in its own database, and the links open only for people the page has been shared with (Share menu on the page).

## How data flows

```
Email, meetings, Reach, Amazon replies
        │  (morning check 8:52 AM CT, close-out 4:20 PM CT, weekdays)
        ▼
ONT Pilot · SVT Team  ── master launch checklist (rd01 to rd33) and team updates
   │                          │
   │ copy of every item       │ status only, for Amazon View actions linked to checklist items
   ▼                          ▼ (4:20 PM close-out; never overwrites edits made on the Amazon View)
Hub (readiness mirror)     ONT Pilot · Amazon View  ── shared actions, comments and updates
```

- **ONT Pilot · Amazon View** matches the SVT x Amazon Middle Mile Pilot site layout: Overview, Action board, Sites & readiness, Weekly standup and Updates.
  - It holds 29 actions. Each one's `src` field lists the SVT Team checklist items it follows. Actions with no link (pilot scope, end-to-end validation, ONT42 sign-off, ONT43 timing) are updated by hand.
  - Anyone with edit access can add or update actions, post updates and set dependencies. Comments and status changes made there are reported in the close-out as evidence.
  - Never add owners' notes, fees, contract terms, internal approvals, gate codes or Exhibit A content.
- **Change SVT-side launch status on the SVT Team page.** The hub mirrors it, and the Amazon View follows at the 4:20 PM close-out.
- Site work demand (ONT42 108 records / 49 vehicles, ONT43 17 / 12) comes from Amazon's DTNA WR data and the Oct 29 ATS inventory. It is historical, not current backlog.

## Working in this repo

All three dashboards share one design system (the SVT sidebar layout from the ChatGPT pilot template) and one report engine.

- **Edit the sources, not the built pages.**
  - Page code lives in `src/amazon.html`, `src/pilot.html` and `src/hub.html`.
  - Shared pieces live in `shared/`: `shell.css` for the layout and palette, `report.css` and `report.js` for the one-page report, plus `work-demand.json` and `svt-logo.png`.
  - Run `python3 tools/build_pages.py` to regenerate `amazon/`, `pilot/` and `hub/`. Then republish each page to its existing link.
- **Progress report.** Each dashboard has a *Progress report* item in its sidebar. It renders a one-page US Letter report from the live records:
  - Timeline / Gantt at the top
  - Key numbers and a summary
  - Progress by area
  - Risks & blockers (generated from status, due dates and owners)
  - Next actions
  - *Download PDF* saves it. *Print* uses the browser's print dialog.
  - Each report carries its own audience label: Prepared for Amazon / Internal SVT and VVG / Confidential, Brooke only.
- **Data changes** (status, tasks, notes): make them on the live page, not in `data/` or `status/`. Those folders are read-only snapshots for review and history.
- **Refreshing snapshots**: export the databases with ArtifactData `list` + `out_dir` into `<dir>/hub`, `<dir>/pilot` and `<dir>/amazon`, then run:

```bash
python3 tools/snapshot.py <dir>
```

## Confidentiality

This repo is private. `data/hub/` and `status/hub.md` contain Exhibit A and internal strategy, so add only people who may see the hub. The Amazon page is the only view meant for Amazon.

## Layout

```
src/       Page sources (edit these)
shared/    Shared layout, report engine, logo and Amazon work-demand data
hub/       Built: Amazon BD Hub · Internal Only (Brooke)
pilot/     Built: ONT Pilot · SVT Team
amazon/    Built: ONT Pilot · Amazon View
data/      JSON snapshots of each dashboard's database
status/    Readable Markdown snapshots generated from data/
tools/     build_pages.py (src + shared -> built pages), snapshot.py (data/ and status/)
```
