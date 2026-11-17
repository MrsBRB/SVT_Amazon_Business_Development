#!/usr/bin/env python3
"""Turn an ArtifactData export into repo snapshots and readable status pages.

Usage:
  python3 tools/snapshot.py <export_dir> [--date YYYY-MM-DD]

<export_dir> holds one folder per dashboard (hub, pilot, amazon), each with one
folder per collection of <doc_id>.json files, the layout ArtifactData's
`out_dir` produces. Writes data/<dashboard>/<collection>.json (sorted, stable
diffs) and status/*.md. The live dashboards stay the source of truth; these
files are snapshots for review and history.
"""
import json, sys, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA, STATUS = ROOT / "data", ROOT / "status"
LINKS = {
    "hub": "https://claude.ai/artifact/KNGV7Q89vw2EJNrFfwq3uo",
    "pilot": "https://claude.ai/artifact/57pZLpxJVW2gb8xTgxj77H",
    "amazon": "https://claude.ai/artifact/FVQgNvfAAnkuC6uZiwc668",
}

def load_export(src):
    out = {}
    for dash in sorted(p for p in src.iterdir() if p.is_dir()):
        for col in sorted(p for p in dash.iterdir() if p.is_dir()):
            rows = []
            for f in sorted(col.glob("*.json")):
                d = json.loads(f.read_text())
                d = d.get("data", d) if isinstance(d, dict) and set(d) <= {"data", "version", "id"} else d
                rows.append({"id": f.stem, **d})
            out.setdefault(dash.name, {})[col.name] = rows
    return out

def write_data(snap):
    for dash, cols in snap.items():
        (DATA / dash).mkdir(parents=True, exist_ok=True)
        for col, rows in cols.items():
            (DATA / dash / f"{col}.json").write_text(json.dumps(rows, indent=2, ensure_ascii=False, sort_keys=True) + "\n")

def read_data():
    snap = {}
    for dash in sorted(p for p in DATA.iterdir() if p.is_dir()):
        for f in sorted(dash.glob("*.json")):
            snap.setdefault(dash.name, {})[f.stem] = json.loads(f.read_text())
    return snap

def cell(v):
    return str(v if v is not None else "").replace("|", "/").replace("\n", " ").strip()

def table(rows, cols):
    head = "| " + " | ".join(c[1] for c in cols) + " |\n|" + "---|" * len(cols) + "\n"
    return head + "".join("| " + " | ".join(cell(r.get(c[0], "")) for c in cols) + " |\n" for r in rows)

def order(r):
    try: return float(r.get("order", 99))
    except (TypeError, ValueError): return 99

def build_status(snap, date):
    STATUS.mkdir(exist_ok=True)
    note = f"_Snapshot {date}. Live version: {{link}}. Edit the live page, not this file._\n\n"
    hub = snap.get("hub", {})
    if hub:
        md = "# Amazon Business Development Hub\n\n" + note.format(link=LINKS["hub"])
        tasks = [t for t in hub.get("tasks", []) if t.get("status") != "Done"]
        rank = {"Doing": 0, "Next": 1, "Waiting": 2}
        tasks.sort(key=lambda t: (rank.get(t.get("status"), 3), t.get("obj", ""), t.get("due") or "9999"))
        md += "## Open actions\n\n" + table(tasks, [("status","Status"),("obj","Initiative"),("title","Action"),("owner","Owner"),("due","Due"),("site","Site")])
        md += "\n## Vendor Approval path\n\n" + table(sorted(hub.get("regsteps", []), key=order), [("order","#"),("title","Step"),("status","Status"),("owner","Owner"),("date","Date"),("evidence","Evidence")])
        md += "\n## Sites\n\n" + table(sorted(hub.get("sites", []), key=lambda s: (s.get("track",""), order({"order": s.get("priority", 99)}))), [("code","Site"),("track","Track"),("stage","Stage"),("next","Next step"),("due","Due"),("gate","What must happen")])
        log = sorted(hub.get("log", []), key=lambda l: l.get("date", ""), reverse=True)
        md += "\n## Decisions and evidence\n\n" + table(log, [("date","Date"),("obj","Initiative"),("kind","Type"),("text","Entry")])
        md += "\n## Documents\n\n" + table(hub.get("docs", []), [("name","File"),("obj","Initiative"),("category","Category"),("uploadedAt","Added")])
        md += "\n## Scheduled tasks\n\n" + table(sorted(hub.get("schedules", []), key=lambda s: s.get("name","")), [("name","Task"),("schedule","When"),("enabled","On?"),("tags","Tags"),("recommendation","Recommendation")])
        (STATUS / "hub.md").write_text(md)
    pilot = snap.get("pilot", {})
    if pilot:
        rd = sorted(pilot.get("readiness", []), key=order)
        gates = [r for r in rd if r.get("gate") != "Nice to have"]
        md = "# ONT42 / ONT43 Pilot Launch (internal)\n\n" + note.format(link=LINKS["pilot"])
        md += f"**Gates ready:** {sum(r.get('status')=='Ready' for r in gates)} of {len(gates)}\n\n"
        md += "## Launch checklist\n\n" + table(rd, [("order","#"),("area","Area"),("item","Item"),("status","Status"),("gate","Gate"),("owner","Owner"),("due","Due"),("amazon","Amazon page"),("evidence","Evidence")])
        ups = sorted(pilot.get("updates", []), key=lambda u: u.get("at", ""), reverse=True)
        md += "\n## Updates\n\n" + table(ups, [("date","Date"),("byName","By"),("text","Update"),("amazon","Shared with Amazon")])
        (STATUS / "pilot.md").write_text(md)
    amz = snap.get("amazon", {})
    if amz:
        ms = sorted(amz.get("milestones", []), key=order)
        meta = next((m for m in amz.get("meta", []) if m.get("id") == "status"), {})
        md = "# ONT42 / ONT43 Repair Pilot: Amazon status page\n\n" + note.format(link=LINKS["amazon"])
        md += f"**Go-live target:** {meta.get('goLive','')} ({meta.get('goLiveNote','')})  \n**Last synced:** {meta.get('syncedAt','')}\n\n"
        md += "## Milestones Amazon sees\n\n" + table(ms, [("group","Area"),("label","Milestone"),("status","Status"),("party","Who"),("site","Site")])
        md += "\n## Updates Amazon sees\n\n" + table(amz.get("updates", []), [("date","Date"),("text","Update")])
        (STATUS / "amazon.md").write_text(md)

if __name__ == "__main__":
    args = sys.argv[1:]
    date = datetime.date.today().isoformat()
    if "--date" in args:
        i = args.index("--date"); date = args[i+1]; del args[i:i+2]
    if args:
        write_data(load_export(pathlib.Path(args[0])))
    build_status(read_data(), date)
    print("snapshot written:", DATA, STATUS)
