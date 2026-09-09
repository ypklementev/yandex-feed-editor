/* ============================================================
   HELPERS
   ============================================================ */
function suggestNextId(prefix, list, seedId) {
    const idsSet = new Set(list.map(x => x.id).filter(Boolean));
    const seed = seedId || (list.length ? list[list.length - 1].id : "");
    const m = String(seed || "").match(/^(.*?)(\d+)$/);
    if (m) {
        const base = m[1];
        const digits = m[2].length;
        let num = parseInt(m[2], 10) + 1;
        let candidate = base + String(num).padStart(digits, "0");
        while (idsSet.has(candidate)) {
            num++;
            candidate = base + String(num).padStart(digits, "0");
        }
        return candidate;
    }
    return nextId(prefix, list.map(x => x.id));
}
function nextId(prefix, existing) {
    const set = new Set(existing);
    let n = 1;
    while (set.has(`${prefix}_${n}`)) n++;
    return `${prefix}_${n}`;
}
function dupeMap(list) {
    const m = new Map();
    list.forEach(item => { if (item.id) m.set(item.id, (m.get(item.id) || 0) + 1); });
    return m;
}


export { suggestNextId, dupeMap };
