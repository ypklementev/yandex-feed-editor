import React from "react";
import { Plus, Trash2 } from "lucide-react";

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */
function Field({ label, required, hint, children, error }) {
    return (
        <label className="field">
            <span className="field-label">
                {label}{required && <span className="req">*</span>}
            </span>
            {children}
            {hint && <span className="field-hint">{hint}</span>}
            {error && <span className="field-error">{error}</span>}
        </label>
    );
}
function Text({ value, onChange, placeholder, mono }) {
    return <input className={"ipt" + (mono ? " ipt-mono" : "")} value={value ?? ""} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />;
}
function Area({ value, onChange, placeholder, rows = 3 }) {
    return <textarea className="ipt ipt-area" rows={rows} value={value ?? ""} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />;
}
function Toggle({ label, checked, onChange }) {
    return (
        <label className="toggle">
            <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
            <span className="toggle-track"><span className="toggle-thumb" /></span>
            <span className="toggle-label">{label}</span>
        </label>
    );
}
function Select({ value, onChange, options, placeholder }) {
    return (
        <select className="ipt" value={value ?? ""} onChange={e => onChange(e.target.value)}>
            <option value="">{placeholder || "— выбрать —"}</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}
function Badge({ kind, children }) {
    return <span className={"badge badge-" + kind}>{children}</span>;
}
function RowNo({ n }) { return <span className="rowno">{String(n).padStart(2, "0")}</span>; }

function RepeatEditor({ title, items, onChange, fields, empty }) {
    const update = (i, key, val) => {
        const next = items.slice();
        next[i] = { ...next[i], [key]: val };
        onChange(next);
    };
    const add = () => onChange([...items, empty()]);
    const remove = i => onChange(items.filter((_, idx) => idx !== i));
    return (
        <div className="repeat">
            <div className="repeat-head">
                <span>{title}</span>
                <button type="button" className="btn btn-ghost btn-xs" onClick={add}><Plus size={14} /> добавить</button>
            </div>
            {items.length === 0 && <div className="repeat-empty">Пока ничего не добавлено</div>}
            {items.map((it, i) => (
                <div className="repeat-row" key={i}>
                    <div className="repeat-grid">
                        {fields.map(f => (
                            <div key={f.key} className="repeat-cell">
                                <span className="repeat-cell-label">{f.label}</span>
                                {f.type === "area"
                                    ? <Area value={it[f.key]} onChange={v => update(i, f.key, v)} rows={2} />
                                    : f.type === "checkbox"
                                        ? <input type="checkbox" checked={!!it[f.key]} onChange={e => update(i, f.key, e.target.checked)} />
                                        : <Text value={it[f.key]} onChange={v => update(i, f.key, v)} />}
                            </div>
                        ))}
                    </div>
                    <button type="button" className="icon-btn danger" onClick={() => remove(i)} title="Удалить строку">
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}


export { Field, Text, Area, Toggle, Select, Badge, RowNo, RepeatEditor };
