#!/usr/bin/env python3
"""Build the public, read-only GitHub Pages site (docs/) from the built dashboards and data/ snapshots.

  python3 tools/build_pages.py      # build the dashboards first
  python3 tools/snapshot.py <export_dir>   # refresh data/ from the live databases
  python3 tools/build_public.py     # write docs/

Each public page is the same dashboard code with a read-only data shim in place of the live
claude.ai database: same layout, views and PDF report; no editing. Brooke's hub is never published.
"""
import json, pathlib, datetime, html
ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
PAGES = {
    "amazon": {"src": "amazon/ont-pilot-amazon-status.html", "data": ["tasks", "activity", "meta"], "live": "https://claude.ai/artifact/FVQgNvfAAnkuC6uZiwc668", "title": "ONT Pilot · Amazon View"},
    "team":   {"src": "pilot/ont42-pilot-launch.html", "data": ["readiness", "updates"], "dir": "pilot", "live": "https://claude.ai/artifact/57pZLpxJVW2gb8xTgxj77H", "title": "ONT Pilot · SVT Team"},
}
SHIM = r"""<script>
window.__SNAPSHOT = __SNAP__;
(function(){
  var D = window.__SNAPSHOT.data, ro = function(){ return Promise.reject({code:"invalid_argument", message:"This is a read-only snapshot."}); };
  function rows(c){ return (D[c]||[]).map(function(r){ var o = Object.assign({}, r); var id = o.id; delete o.id; return {id:id, exists:true, data:function(){ return o; }}; }); }
  function snap(c){ var d = rows(c); return {docs:d, size:d.length, empty:!d.length, metadata:{fromCache:false, hasPendingWrites:false}, docChanges:function(){ return []; }}; }
  function col(c){ return {onSnapshot:function(n){ setTimeout(function(){ n(snap(c)); }, 0); return function(){}; }, get:function(){ return Promise.resolve(snap(c)); }, doc:function(id){ return {id:id||"x", get:function(){ return Promise.resolve({exists:false, data:function(){}}); }, set:ro, update:ro, delete:ro}; }, add:ro}; }
  window.claude = {use: function(n){
    if (n === "db") return Promise.resolve({collection:col, doc:function(p){ var a = p.split("/"), r = (D[a[0]]||[]).find(function(x){ return x.id === a[1]; }); return {get:function(){ return Promise.resolve({exists:!!r, data:function(){ return r; }}); }, set:ro, update:ro, delete:ro}; }});
    if (n === "user") return Promise.resolve({can:function(){ return Promise.resolve(false); }, me:function(){ return Promise.resolve({name:""}); }, id:function(){ return Promise.resolve(null); }, profiles:function(){ return Promise.resolve({}); }});
    return Promise.resolve(null);
  }};
  document.addEventListener("DOMContentLoaded", function(){
    var c = document.querySelector(".content"); if (!c) return;
    var t = new Date(window.__SNAPSHOT.at).toLocaleString([], {month:"short", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit"});
    c.insertAdjacentHTML("afterbegin", '<div class="alert" style="margin-top:0"><b>Read-only snapshot</b><p>Updated ' + t + '. Refreshed automatically each weekday. To make changes, use the live dashboard (Claude account needed): <a href="' + window.__SNAPSHOT.live + '" target="_blank" rel="noopener">open live version</a>.</p></div>');
  });
})();
</script>
"""
def main():
    at = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    DOCS.mkdir(exist_ok=True)
    (DOCS / ".nojekyll").write_text("")
    for slug, cfg in PAGES.items():
        dash = cfg.get("dir", slug)
        data = {c: json.loads((ROOT / "data" / dash / f"{c}.json").read_text()) for c in cfg["data"] if (ROOT / "data" / dash / f"{c}.json").exists()}
        snap = json.dumps({"at": at, "live": cfg["live"], "data": data}, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        page = (ROOT / cfg["src"]).read_text()
        out = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
               '<meta name="robots" content="noindex,nofollow">' + SHIM.replace("__SNAP__", snap) + '</head><body>' + page + '</body></html>')
        (DOCS / slug).mkdir(exist_ok=True)
        (DOCS / slug / "index.html").write_text(out)
        print("wrote", f"docs/{slug}/index.html", len(out))
    links = "".join(f'<a class="card" href="{s}/"><b>{html.escape(c["title"])}</b><span>Read-only snapshot · open</span></a>' for s, c in PAGES.items())
    (DOCS / "index.html").write_text(f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SVT × Amazon Middle Mile Pilot</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@600;700&family=Source+Sans+3:wght@400;600&display=swap">
<style>body{{margin:0;font-family:'Source Sans 3',Arial,sans-serif;background:#f4f6f9;color:#1c365e}}header{{background:#1c365e;color:#fff;border-bottom:3px solid #e01e2e;padding:28px 24px}}h1{{font-family:'Barlow Semi Condensed',Arial,sans-serif;font-weight:600;margin:0;font-size:30px}}p{{color:#d6dee8;margin:6px 0 0}}main{{max-width:900px;margin:28px auto;padding:0 16px;display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}}.card{{background:#fff;border:1px solid #e0e6ec;border-radius:8px;padding:20px;text-decoration:none;color:#1c365e;display:grid;gap:6px}}.card:hover{{border-color:#5b6b7f}}.card b{{font-family:'Barlow Semi Condensed',Arial,sans-serif;font-size:22px}}.card span{{color:#5b6b7f;font-size:14px}}footer{{text-align:center;color:#5b6b7f;font-size:13px;padding:20px}}</style></head>
<body><header><h1>SVT Fleet Solutions × Amazon Middle Mile</h1><p>ONT42 / ONT43 pilot dashboards · read-only snapshots, updated {datetime.datetime.now().strftime('%b %d, %Y')}</p></header><main>{links}</main><footer>Prepared by SVT Fleet Solutions. Snapshots refresh each weekday.</footer></body></html>""")
    print("wrote docs/index.html")
if __name__ == "__main__":
    main()
