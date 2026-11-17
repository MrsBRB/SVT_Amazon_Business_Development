# SVT Amazon Business Development

Dashboards for two SVT Fleet Solutions initiatives with Amazon:

1. **Amazon Vendor Approval**: SVT FLEET LLC approved as an active, registered Amazon vendor in its own name.
2. **Amazon Station Conversions**: Middle Mile first (ONT42 / ONT43 pilot, then EWR40, the PHL corridor and BOS42), with Last Mile at Amazon's level.

DSP outreach, DSP leads and routing workflows are out of scope for this repo.

## The three dashboards

| Dashboard | Who it's for | Live page | Source code | Snapshot |
|---|---|---|---|---|
| Amazon Business Development Hub | Brooke (internal, includes Exhibit A) | [Open](https://claude.ai/artifact/KNGV7Q89vw2EJNrFfwq3uo) | [`hub/`](hub/exhibit-a-priority-hub.html) | [`status/hub.md`](status/hub.md) |
| ONT42 / ONT43 Pilot Launch | SVT and VVG team (Mike, Lon, Mark, VVG IT) | [Open](https://claude.ai/artifact/57pZLpxJVW2gb8xTgxj77H) | [`pilot/`](pilot/ont42-pilot-launch.html) | [`status/pilot.md`](status/pilot.md) |
| ONT42 / ONT43 Repair Pilot: status for Amazon | Evan Christodoulides and the Amazon Middle Mile team | [Open](https://claude.ai/artifact/FVQgNvfAAnkuC6uZiwc668) | [`amazon/`](amazon/ont-pilot-amazon-status.html) | [`status/amazon.md`](status/amazon.md) |

The live pages are claude.ai artifacts. Each keeps its data in its own database, and the links open only for people the page has been shared with (Share menu on the page).

## How data flows

```
Email, meetings, Reach, Amazon replies
        │  (morning check 8:52 AM CT, close-out 4:20 PM CT, weekdays)
        ▼
Pilot Launch page  ── master for the launch checklist and team updates
   │                        │
   │ copy of every item     │ only items marked "Show on Amazon page",
   ▼                        ▼ in Amazon-facing wording, no owners or evidence
Hub (readiness mirror)   Amazon status page (synced by the 4:20 PM close-out)
```

- **Change pilot status on the Pilot Launch page.** The hub and the Amazon page follow it.
- **Choosing what Amazon sees:** open a checklist item on the Pilot Launch page and set *Show on the Amazon page?*, *who's on it* and, optionally, the Amazon wording. For updates, tick *Also show on the Amazon page* or use *Share with Amazon* on an existing update.
- The Amazon page refreshes at the weekday close-out. It never shows owners, evidence notes, fees, internal approvals or anything from the hub.

## Working in this repo

- **Page changes** (layout, new fields, wording): edit the HTML under `hub/`, `pilot/` or `amazon/` on a branch and open a pull request. A merged change goes live once the page is republished to the same link.
- **Data changes** (status, tasks, notes): make them on the live page, not in `data/` or `status/`. Those folders are read-only snapshots, there so the team can review changes and history on GitHub.
- **Refreshing snapshots**: export the databases with ArtifactData `list` + `out_dir` into `<dir>/hub`, `<dir>/pilot` and `<dir>/amazon`, then run:

```bash
python3 tools/snapshot.py <dir>
```

## Confidentiality

This repo is private. `data/hub/` and `status/hub.md` contain Exhibit A and internal strategy, so add only people who may see the hub. The Amazon page is the only view meant for Amazon.

## Layout

```
hub/       Amazon Business Development Hub (internal)
pilot/     ONT42 / ONT43 Pilot Launch (SVT and VVG team)
amazon/    Pilot status page for Amazon
data/      JSON snapshots of each dashboard's database
status/    Readable Markdown snapshots generated from data/
tools/     snapshot.py: builds data/ and status/ from an export
```
