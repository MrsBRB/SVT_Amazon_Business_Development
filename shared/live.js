/* Live sync indicator + field-level save helper shared by all three dashboards.
   SVTLive.seen(snapshot) after every onSnapshot delivery; SVTLive.saving(promise) around writes.
   SVTLive.patch(db, path, before, after) writes only the fields this person changed, after
   checking nobody else saved the record since it was opened. */
window.SVTLive = (() => {
  let last = null, pending = 0, offline = false, el = null;
  const node = () => el || (el = document.getElementById("sync"));
  function paint() {
    const n = node(); if (!n) return;
    const t = last ? last.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) : "";
    if (window.__SNAPSHOT) { n.textContent = "Read-only snapshot · " + new Date(window.__SNAPSHOT.at).toLocaleString([], {month:"short", day:"numeric", hour:"numeric", minute:"2-digit"}); n.dataset.state = "live"; return; }
    n.textContent = pending ? "Saving…" : offline ? "Offline · changes sync when you reconnect" : last ? `Live · synced ${t}` : "Connecting…";
    n.dataset.state = pending ? "saving" : offline ? "offline" : "live";
  }
  function seen(snap) { const m = snap && snap.metadata; offline = !!(m && m.fromCache); last = new Date(); paint(); }
  function failed() { offline = true; paint(); }
  async function saving(p) { pending++; paint(); try { return await p; } finally { pending--; last = new Date(); paint(); } }
  const same = (a, b) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");
  // Returns {ok:true} or {conflict:true}. stamp = field that changes on every save (updatedAt or rev).
  async function patch(db, path, before, after, stamp) {
    const cur = await db.doc(path).get(), c = cur.exists ? cur.data() : null;
    if (c && !same(c[stamp], before[stamp])) return {conflict:true, current:c};
    const out = {};
    Object.keys(after).forEach(k => { if (k !== "id" && !same(after[k], before[k])) out[k] = after[k]; });
    if (!Object.keys(out).length) return {ok:true, nothing:true};
    await saving(c ? db.doc(path).update(out) : db.doc(path).set(after));
    return {ok:true};
  }
  setInterval(paint, 30000);
  addEventListener("online", () => { offline = false; paint(); });
  addEventListener("offline", () => { offline = true; paint(); });
  return {seen, failed, saving, patch};
})();
