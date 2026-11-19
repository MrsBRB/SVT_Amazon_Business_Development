#!/usr/bin/env python3
"""Assemble the three published dashboards from src/ plus the shared design system.

  python3 tools/build_pages.py

Markers replaced in each src/*.html:
  /*@SHELL_CSS*/   shared/shell.css      (sidebar layout, SVT palette)
  /*@REPORT_CSS*/  shared/report.css     (one-page progress report)
  /*@REPORT_JS*/   shared/report.js      (timeline, insights, PDF download)
  /*@LIVE_JS*/     shared/live.js        (live sync indicator, conflict-safe saves)
  /*@DEMAND*/null  shared/work-demand.json (Amazon-provided ONT42/ONT43 WR mix)
  /*@INVENTORY*/null shared/asset-inventory.json (Amazon ATS tractor inventory, ONT42/ONT43)
  __LOGO__         shared/svt-logo.png as base64
"""
import base64, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
SH = ROOT / "shared"
OUT = {"amazon.html": "amazon/ont-pilot-amazon-status.html",
       "pilot.html": "pilot/ont42-pilot-launch.html",
       "hub.html": "hub/exhibit-a-priority-hub.html"}
parts = {
    "/*@SHELL_CSS*/": (SH / "shell.css").read_text(),
    "/*@REPORT_CSS*/": (SH / "report.css").read_text(),
    "/*@REPORT_JS*/": (SH / "report.js").read_text(),
    "/*@LIVE_JS*/": (SH / "live.js").read_text(),
    "/*@INVENTORY*/null": (SH / "asset-inventory.json").read_text(),
    "/*@DEMAND*/null": json.dumps(json.loads((SH / "work-demand.json").read_text()), separators=(",", ":")),
    "__LOGO__": base64.b64encode((SH / "svt-logo.png").read_bytes()).decode(),
}
for src, dst in OUT.items():
    p = ROOT / "src" / src
    if not p.exists():
        continue
    s = p.read_text()
    for k, v in parts.items():
        s = s.replace(k, v)
    (ROOT / dst).write_text(s)
    print("built", dst, len(s))
