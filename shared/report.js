/* SVT one-page progress report: timeline/Gantt, KPIs, progress, risks and next steps.
   Each dashboard builds a cfg from its own data and calls SVTReport.render(el, cfg).
   Statuses are normalized to: done | prog | wait | blocked | todo. */
window.SVTReport = (() => {
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const D = s => { if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate()); const d = new Date(String(s).slice(0,10) + "T00:00:00"); return isNaN(d) ? null : d; };
  const today = () => D(new Date());
  const fmt = (d, o) => { d = D(d); return d ? d.toLocaleDateString("en-US", o || {month:"short", day:"numeric"}) : ""; };
  const days = (a, b) => Math.round((D(b) - D(a)) / 864e5);
  const addBiz = (d, n) => { d = D(d); const s = Math.sign(n); let k = Math.abs(n); while (k) { d.setDate(d.getDate() + s); const w = d.getDay(); if (w && w < 6) k--; } return d; };
  const LABEL = {done:"Complete", prog:"In progress", wait:"Waiting", blocked:"Blocked", todo:"Not started"};
  const COLOR = {done:"#1f7a4d", prog:"#1c365e", wait:"#c27a00", blocked:"#e01e2e", todo:"#9aa6b5", risk:"#e01e2e"};

  // A phase is done when every linked item is done, in progress when any has moved, else not started.
  function phaseStatus(items) {
    if (!items.length) return {st:"todo", pct:0};
    const done = items.filter(i => i.st === "done").length;
    const pct = Math.round(done / items.length * 100);
    if (done === items.length) return {st:"done", pct};
    if (items.some(i => i.st === "blocked")) return {st:"blocked", pct};
    if (items.some(i => i.st !== "todo")) return {st:"prog", pct};
    return {st:"todo", pct};
  }

  function gantt(cfg) {
    const W = 730, L = 172, R = 32, top = 30, rowH = 19, t0 = D(cfg.range[0]), t1 = D(cfg.range[1]);
    const span = days(t0, t1), x = d => L + Math.max(0, Math.min(span, days(t0, d))) / span * (W - L - R);
    const rows = cfg.phases, H = top + rows.length * rowH + 8, now = today();
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Source Sans 3, Arial, sans-serif" role="img" aria-label="Timeline">`;
    // week grid (Mondays)
    const d = D(t0); while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    const stepDays = span > 120 ? 14 : 7;
    for (; d <= t1; d.setDate(d.getDate() + stepDays)) {
      const xx = x(d).toFixed(1);
      s += `<line x1="${xx}" y1="${top - 6}" x2="${xx}" y2="${H - 6}" stroke="#e6e9ed"/>`;
      s += `<text x="${xx}" y="${top - 10}" font-size="8" fill="#5b6b7f" text-anchor="middle">${esc(fmt(d))}</text>`;
    }
    // month labels
    const m = new Date(t0.getFullYear(), t0.getMonth(), 1);
    for (; m <= t1; m.setMonth(m.getMonth() + 1)) {
      const mx = Math.max(L, x(m));
      s += `<text x="${(mx + 2).toFixed(1)}" y="9" font-size="8.5" font-weight="700" fill="#1c365e">${esc(m.toLocaleDateString("en-US", {month:"long", year:"numeric"}))}</text>`;
    }
    rows.forEach((p, i) => {
      const y = top + i * rowH, yb = y + 4, bh = rowH - 8;
      if (i % 2 === 0) s += `<rect x="0" y="${y}" width="${W}" height="${rowH}" fill="#f7f9fb"/>`;
      s += `<text x="4" y="${y + rowH / 2 + 3.2}" font-size="9" fill="#1c365e" font-weight="${p.milestone ? 700 : 600}">${esc(p.label)}</text>`;
      if (p.milestone) {
        const mx = x(p.date), c = p.st === "done" ? COLOR.done : p.risk ? COLOR.risk : "#1c365e";
        s += `<path d="M${mx} ${yb - 1} l6 ${bh / 2 + 1} l-6 ${bh / 2 + 1} l-6 -${bh / 2 + 1} z" fill="${c}"/>`;
        s += `<text x="${mx + 10}" y="${y + rowH / 2 + 3}" font-size="8" fill="#5b6b7f">${esc(p.note || fmt(p.date))}</text>`;
        return;
      }
      const xs = x(p.start), xe = Math.max(xs + 4, x(p.end)), w = xe - xs, late = p.end && D(p.end) < now && p.st !== "done";
      const c = p.st === "done" ? COLOR.done : (late || p.st === "blocked") ? COLOR.risk : p.st === "prog" ? COLOR.prog : COLOR.todo;
      s += `<rect x="${xs.toFixed(1)}" y="${yb}" width="${w.toFixed(1)}" height="${bh}" rx="2.5" fill="${c}" fill-opacity="0.22" ${late ? `stroke="${COLOR.risk}" stroke-width="1"` : ""}/>`;
      if (p.pct > 0) s += `<rect x="${xs.toFixed(1)}" y="${yb}" width="${(w * p.pct / 100).toFixed(1)}" height="${bh}" rx="2.5" fill="${c}"/>`;
      if (D(p.end) > t1) s += `<path d="M${W - R + 2} ${yb + bh / 2} l-5 -4 v8 z" fill="${c}"/>`;
      s += `<text x="${Math.min(xe + 4, W - R + 6).toFixed(1)}" y="${y + rowH / 2 + 3}" font-size="8" fill="#5b6b7f">${p.pct}%</text>`;
    });
    (cfg.lines || []).forEach(l => {
      if (D(l.date) < t0 || D(l.date) > t1) return;
      const lx = x(l.date).toFixed(1);
      s += `<line x1="${lx}" y1="${top - 4}" x2="${lx}" y2="${H - 4}" stroke="${l.color || "#1c365e"}" stroke-width="1.2" stroke-dasharray="3 2"/>`;
      const lw = Math.max(40, l.label.length * 4.6 + 8); s += `<rect x="${(+lx - lw / 2).toFixed(1)}" y="${H - 12}" width="${lw.toFixed(1)}" height="10" rx="2" fill="${l.color || "#1c365e"}"/><text x="${lx}" y="${H - 4.4}" font-size="7" fill="#fff" text-anchor="middle" font-weight="700">${esc(l.label)}</text>`;
    });
    if (now >= t0 && now <= t1) {
      const tx = x(now).toFixed(1);
      s += `<line x1="${tx}" y1="${top - 4}" x2="${tx}" y2="${H - 14}" stroke="#e01e2e" stroke-width="1.4"/><text x="${tx}" y="${top - 1}" font-size="7.5" fill="#e01e2e" text-anchor="middle" font-weight="700">TODAY</text>`;
    }
    return s + `</svg>`;
  }

  // Deterministic insights from items: [{title, st, gate, due, owner}]
  function insights(items, cfg) {
    const out = [], now = today(), open = items.filter(i => i.st !== "done");
    const short = t => { t = String(t || ""); const c = t.indexOf(" ("); if (c > 20) t = t.slice(0, c); return t.length > 58 ? t.slice(0, 55).trimEnd() + "…" : t; };
    const name = i => `“${short(i.title)}”`;
    const blocked = open.filter(i => i.st === "blocked");
    if (blocked.length) out.push({lv:"high", t:`${blocked.length} blocked: ${blocked.slice(0, 2).map(name).join(", ")}. Resolve before go-live.`});
    const over = open.filter(i => i.due && D(i.due) < now);
    if (over.length) out.push({lv:"high", t:`${over.length} past due, including ${over.slice(0, 2).map(i => `${name(i)} (${fmt(i.due)})`).join(", ")}.`});
    (cfg.extraRisks || []).forEach(r => out.push(r));
    if (cfg.goLive) {
      const left = days(now, cfg.goLive), notStarted = open.filter(i => i.gate && i.st === "todo");
      if (notStarted.length && left >= 0) out.push({lv: left <= 7 ? "high" : "med", t:`${notStarted.length} launch gates not started with ${left} days to the proposed ${fmt(cfg.goLive)} go-live${notStarted.length ? `, including ${notStarted.slice(0, 2).map(name).join(" and ")}` : ""}.`});
    }
    const wait = open.filter(i => i.st === "wait");
    if (wait.length) out.push({lv:"med", t:`${wait.length} waiting on others: ${wait.slice(0, 2).map(i => `${name(i)}${i.owner ? " · " + i.owner : ""}`).join(", ")}.`});
    const noOwner = open.filter(i => i.gate && (!i.owner || /^unassigned$/i.test(i.owner)));
    if (noOwner.length) out.push({lv:"med", t:`${noOwner.length} open gates have no named owner. Assign one person to each.`});
    const noDate = open.filter(i => i.gate && !i.due).length;
    if (noDate && open.length) out.push({lv:"low", t:`${noDate} of ${open.filter(i => i.gate).length} open gates have no committed date. Agree dates at the weekly standup.`});
    const rank = {high:0, med:1, low:2};
    return out.sort((a, b) => rank[a.lv] - rank[b.lv]).slice(0, cfg.maxRisks || 6);
  }

  function rag(items, risks) {
    if (risks.some(r => r.lv === "high")) return {k:"r", t:"AT RISK"};
    if (risks.some(r => r.lv === "med") || items.some(i => i.st === "wait")) return {k:"a", t:"WATCH"};
    return {k:"g", t:"ON TRACK"};
  }

  function render(el, cfg) {
    const items = cfg.items, gates = items.filter(i => i.gate), gDone = gates.filter(i => i.st === "done").length;
    cfg.phases.forEach(p => { if (!p.milestone) Object.assign(p, phaseStatus(items.filter(i => (p.ids || []).includes(i.id)))); });
    const risks = insights(items, cfg), r = cfg.rag || rag(items, risks), now = today();
    const pct = gates.length ? Math.round(gDone / gates.length * 100) : 0;
    const k = cfg.kpis || [
      {label:"Launch gates complete", v:`${gDone}/${gates.length}`, sub:`${pct}% of gates`, tone:"green"},
      {label:"Days to proposed go-live", v: cfg.goLive ? Math.max(0, days(now, cfg.goLive)) : "—", sub: cfg.goLive ? `${fmt(cfg.goLive, {month:"short", day:"numeric", year:"numeric"})} · ${cfg.goLiveConfirmed ? "confirmed" : "unconfirmed"}` : "", tone:""},
      {label:"In progress", v: items.filter(i => i.st === "prog").length, sub:"Active now", tone:""},
      {label:"Waiting on input", v: items.filter(i => i.st === "wait").length, sub:"Team and partners", tone:""},
      {label:"Blocked / past due", v: items.filter(i => i.st !== "done" && (i.st === "blocked" || (i.due && D(i.due) < now))).length, sub:"Need a decision", tone:"red"}];
    const groups = cfg.progress || [];
    const prog = groups.map(g => { const l = items.filter(g.match), d = l.filter(i => i.st === "done").length, p = l.filter(i => i.st === "prog" || i.st === "wait").length, pc = l.length ? Math.round(d / l.length * 100) : 0;
      return `<div><span>${esc(g.label)}</span><span class="tr"><i style="width:${l.length ? d / l.length * 100 : 0}%;background:#1f7a4d"></i><i style="width:${l.length ? p / l.length * 100 : 0}%;background:#9fb3cc"></i></span><b>${d}/${l.length}</b></div>`; }).join("");
    const next = (cfg.nextItems || items).filter(i => i.st !== "done").sort((a, b) => (a.due ? 0 : 1) - (b.due ? 0 : 1) || String(a.due).localeCompare(String(b.due)) || (b.gate - a.gate) || (({prog:0, wait:1, blocked:0, todo:2})[a.st] - ({prog:0, wait:1, blocked:0, todo:2})[b.st])).slice(0, cfg.maxNext || 8);
    const stc = s => ({done:"done", prog:"prog", wait:"wait", blocked:"blocked"})[s] || "";
    const summary = cfg.summary || `${gDone} of ${gates.length} launch gates are complete (${pct}%). ${items.filter(i => i.st === "prog").length} items are in progress and ${items.filter(i => i.st === "wait").length} are waiting on input.`;
    el.innerHTML = `<div class="rp" id="${esc(cfg.id || "rp")}">
      <div class="rp-head"><div class="rp-logo"><img src="${cfg.logo}" alt="SVT Fleet Solutions"></div>
        <div><div class="eb">${esc(cfg.eyebrow)}</div><h2>${esc(cfg.title)}</h2><div class="sub">${esc(cfg.subtitle || "")}</div></div>
        <div class="rp-rag"><b class="${r.k}">${r.t}</b><small>Report date ${esc(fmt(now, {month:"long", day:"numeric", year:"numeric"}))}</small></div></div>
      <div class="rp-body">
        <div class="rp-sec"><h3>Timeline<small>${esc(cfg.timelineNote || "Planned windows. Bars fill as linked items complete.")}</small></h3>
          <div class="rp-gantt">${gantt(cfg)}<div class="rp-legend"><span><i style="background:#1f7a4d"></i>Complete</span><span><i style="background:#1c365e"></i>In progress</span><span><i style="background:#9aa6b5"></i>Not started</span><span><i style="background:#e01e2e"></i>Late or blocked</span><span>◆ Milestone</span></div></div></div>
        <div class="rp-kpis">${k.map(x => `<div class="rp-kpi ${x.tone || ""}"><span>${esc(x.label)}</span><b class="rp-num">${esc(x.v)}</b><small>${esc(x.sub || "")}</small></div>`).join("")}</div>
        <div class="rp-summary"><b>Summary.</b> ${esc(summary)}</div>
        <div class="rp-cols">
          <div class="rp-sec"><h3>Progress by area<small>Complete · In progress or waiting</small></h3><div class="rp-prog">${prog || "<p>No items.</p>"}</div></div>
          <div class="rp-sec"><h3>Risks &amp; blockers<small>Generated from current status</small></h3><ul class="rp-risks">${risks.map(x => `<li class="${x.lv}"><span>${x.lv === "high" ? "HIGH" : x.lv === "med" ? "MEDIUM" : "NOTE"}</span><div>${esc(x.t)}</div></li>`).join("") || `<li class="low"><span>NOTE</span><div>No open risks recorded.</div></li>`}</ul></div>
        </div>
        <div class="rp-sec"><h3>${esc(cfg.nextTitle || "Next actions")}<small>Dated items first, then open launch gates</small></h3>
          <table class="rp-tbl"><colgroup><col class="a"><col class="o"><col class="s"><col class="d"></colgroup><thead><tr><th>Action</th><th>${esc(cfg.ownerLabel || "Owner")}</th><th>Status</th><th>Due</th></tr></thead><tbody>${next.map(i => `<tr><td>${i.gate ? "<b>Gate</b> · " : ""}${esc(i.title)}</td><td>${esc(i.owner || "—")}</td><td><span class="rp-st ${stc(i.st)}">${esc(i.label || LABEL[i.st])}</span></td><td>${i.due ? esc(fmt(i.due)) : "To confirm"}</td></tr>`).join("")}</tbody></table></div>
      </div>
      <div class="rp-foot"><span><b>${esc(cfg.confidential)}</b> · ${esc(cfg.footNote || "")}</span><span>${esc(cfg.source || "")}</span></div>
    </div>`;
    fit(el);
  }

  // Keep the report on one page: drop the last table rows, then risks, until the body fits.
  function fit(el) {
    const body = el.querySelector(".rp-body"); if (!body) return;
    const over = () => body.scrollHeight > body.clientHeight + 1;
    let rows = [...el.querySelectorAll(".rp-tbl tbody tr")];
    while (over() && rows.length > 3) rows.pop().remove();
    let rk = [...el.querySelectorAll(".rp-risks li")];
    while (over() && rk.length > 3) rk.pop().remove();
  }
  let lib = null;
  function loadLib() {
    if (window.html2pdf) return Promise.resolve();
    if (lib) return lib;
    lib = new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"; s.onload = ok; s.onerror = () => { lib = null; no(new Error("PDF library failed to load")); }; document.head.appendChild(s); });
    return lib;
  }
  async function download(el, filename, toast) {
    const node = el.querySelector(".rp");
    try {
      await loadLib();
      const sx = window.scrollX, sy = window.scrollY; window.scrollTo(0, 0);
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:0;top:0;width:816px;z-index:-1;pointer-events:none";
      const copy = node.cloneNode(true); copy.style.boxShadow = "none"; host.appendChild(copy); document.body.appendChild(host);
      let blob;
      try {
        blob = await window.html2pdf().set({margin:0, filename, image:{type:"jpeg", quality:0.96}, html2canvas:{scale:2, useCORS:true, backgroundColor:"#ffffff", scrollX:0, scrollY:0}, jsPDF:{unit:"px", format:[816, 1056], orientation:"portrait", hotfixes:["px_scaling"]}, pagebreak:{mode:[]}}).from(copy).outputPdf("blob");
      } finally { host.remove(); window.scrollTo(sx, sy); }
      const dl = await window.claude?.use?.("downloads");
      if (dl) { await dl.save({filename, data: blob}); toast && toast("Report saved"); return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {
      if (e && e.code === "declined") return;
      toast && toast("Couldn't build the PDF here. Opening print instead.");
      window.print();
    }
  }
  return {render, download, addBiz, fmt, D, days};
})();
