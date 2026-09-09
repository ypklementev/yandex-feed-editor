import React, { useState, useMemo, useRef, useCallback } from "react";
import { Upload, Download, AlertTriangle, CheckCircle2, Building2, Stethoscope, ListChecks, FileWarning, Tags, Receipt, LayoutGrid, Copy, RotateCcw } from "lucide-react";
import { emptyShop, emptyDoctor, emptyClinic, emptyService, emptyOffer } from "./data/feedData";
import { parseFeedXML, buildXML } from "./lib/feedXml";
import { suggestNextId } from "./lib/feedHelpers";
import { validateFeed } from "./lib/validation";
import { Field, Text } from "./components/FormControls";
import { EditorDrawer, EntityTable, ValidationPanel } from "./components/FeedComponents";

export default function App() {
  const [shop, setShop] = useState(emptyShop());
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [services, setServices] = useState([]);
  const [offers, setOffers] = useState([]);

  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState({ doctors: "", clinics: "", services: "", offers: "" });
  const [editing, setEditing] = useState(null); // { type, isNew, originalId, data }
  const [importWarnings, setImportWarnings] = useState([]);
  const [importSummary, setImportSummary] = useState(null);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const showToast = useCallback((msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(t => (t && t.msg === msg ? null : t)), 3200);
  }, []);

  const validation = useMemo(() => validateFeed({ shop, doctors, clinics, services, offers }),
    [shop, doctors, clinics, services, offers]);

  const errorsByEntity = useMemo(() => {
    const m = new Map();
    const add = (arr, sev) => arr.forEach(e => {
      const key = `${e.section}::${e.entityId}`;
      if (!m.has(key)) m.set(key, { errors: 0, warnings: 0 });
      m.get(key)[sev]++;
    });
    add(validation.errors, "errors");
    add(validation.warnings, "warnings");
    return m;
  }, [validation]);
  const issueCountFor = (section, id) => errorsByEntity.get(`${section}::${id}`) || { errors: 0, warnings: 0 };

  /* ---------- import / export ---------- */
  const handleImportFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = parseFeedXML(String(ev.target.result));
        setShop(parsed.shop);
        setDoctors(parsed.doctors);
        setClinics(parsed.clinics);
        setServices(parsed.services);
        setOffers(parsed.offers);
        setImportWarnings(parsed.unknown);
        setImportSummary({
          doctors: parsed.doctors.length, clinics: parsed.clinics.length,
          services: parsed.services.length, offers: parsed.offers.length,
          unknown: parsed.unknown.length
        });
        showToast(`Фид загружен: ${parsed.doctors.length} врачей, ${parsed.clinics.length} клиник, ${parsed.services.length} услуг, ${parsed.offers.length} предложений`);
        setTab("overview");
      } catch (err) {
        showToast(err.message || "Не удалось загрузить файл", "error");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const exportXML = useMemo(() => buildXML(shop, doctors, clinics, services, offers), [shop, doctors, clinics, services, offers]);

  const downloadXML = () => {
    const blob = new Blob([exportXML], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (shop.name || "yandex-doctors-feed").replace(/[^\wа-яА-ЯёЁ-]+/g, "_");
    a.href = url; a.download = `${safeName}.xml`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Файл фида сохранён на диск");
  };
  const copyXML = async () => {
    try { await navigator.clipboard.writeText(exportXML); showToast("XML скопирован в буфер обмена"); }
    catch { showToast("Не удалось скопировать", "error"); }
  };
  const resetAll = () => {
    if (!window.confirm("Очистить все текущие данные фида? Действие необратимо.")) return;
    setShop(emptyShop()); setDoctors([]); setClinics([]); setServices([]); setOffers([]);
    setImportWarnings([]); setImportSummary(null);
    showToast("Фид очищен");
  };

  /* ---------- entity CRUD ---------- */
  const listFor = type => ({ doctor: doctors, clinic: clinics, service: services, offer: offers }[type]);
  const setterFor = type => ({ doctor: setDoctors, clinic: setClinics, service: setServices, offer: setOffers }[type]);
  const factoryFor = type => ({ doctor: emptyDoctor, clinic: emptyClinic, service: emptyService, offer: emptyOffer }[type]);
  const prefixFor = type => ({ doctor: "doctor", clinic: "clinic", service: "service", offer: "offer" }[type]);

  const openNew = type => {
    const data = factoryFor(type)();
    data.id = suggestNextId(prefixFor(type), listFor(type));
    setEditing({ type, isNew: true, originalId: null, originalIndex: -1, data });
  };
  const openEdit = (type, item) => {
    const idx = listFor(type).indexOf(item);
    setEditing({ type, isNew: false, originalId: item.id, originalIndex: idx, data: JSON.parse(JSON.stringify(item)) });
  };
  const closeEditor = () => setEditing(null);

  const saveEditing = () => {
    if (!editing) return;
    const { type, isNew, originalIndex, data } = editing;
    const trimmedId = (data.id || "").trim();
    if (!trimmedId) { showToast("Укажите id перед сохранением", "error"); return; }

    const list = listFor(type);
    const isDuplicate = list.some((x, i) => x.id === trimmedId && (isNew || i !== originalIndex));
    if (isDuplicate) {
      showToast(`Id "${trimmedId}" уже используется другой записью — выберите другой id `, "error");
      return;
    }

    const finalData = { ...data, id: trimmedId };
    const setter = setterFor(type);
    setter(prev => {
      if (isNew) return [...prev, finalData];
      return prev.map((x, i) => (i === originalIndex ? finalData : x));
    });
    showToast(isNew ? "Запись добавлена" : "Изменения сохранены");
    setEditing(null);
  };
  const duplicateItem = (type, item) => {
    const copy = JSON.parse(JSON.stringify(item));
    copy.id = suggestNextId(prefixFor(type), listFor(type), item.id);
    setterFor(type)(prev => [...prev, copy]);
    showToast("Запись продублирована");
  };
  const deleteItem = (type, id) => {
    if (!window.confirm("Удалить запись безвозвратно?")) return;
    setterFor(type)(prev => prev.filter(x => x.id !== id));
    if (editing && editing.originalId === id) setEditing(null);
    showToast("Запись удалена");
  };

  const jumpTo = (section, entityId) => {
    const map = { "Врачи": "doctors", "Клиники": "clinics", "Услуги": "services", "Предложения": "offers", "Фид": "overview" };
    const t = map[section] || "overview";
    setTab(t);
    if (t !== "overview") {
      const item = listFor(t.slice(0, -1)).find(x => x.id === entityId);
      if (item) openEdit(t.slice(0, -1), item);
    }
  };

  const nameOfDoctor = id => doctors.find(d => d.id === id)?.name || "";
  const nameOfClinic = id => clinics.find(c => c.id === id)?.name || "";
  const nameOfService = id => services.find(s => s.id === id)?.name || "";

  const filtered = (list, keys, q) => {
    if (!q) return list;
    const lq = q.toLowerCase();
    return list.filter(item => keys.some(k => String(item[k] || "").toLowerCase().includes(lq)));
  };

  const NAV = [
    { key: "overview", label: "Обзор", icon: LayoutGrid, count: null },
    { key: "doctors", label: "Врачи", icon: Stethoscope, count: doctors.length },
    { key: "clinics", label: "Клиники", icon: Building2, count: clinics.length },
    { key: "services", label: "Услуги", icon: Tags, count: services.length },
    { key: "offers", label: "Предложения", icon: Receipt, count: offers.length },
    { key: "validation", label: "Проверка", icon: ListChecks, count: validation.errors.length + validation.warnings.length }
  ];

  return (
    <div className="app">

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sticky">
          <div className="brand">Реестр врачей<small>Yandex YML · v2.0</small></div>
          {NAV.map(n => {
            const Icon = n.icon;
            const hasIssues = n.key === "validation" && (validation.errors.length > 0);
            return (
              <button key={n.key} className={"navitem" + (tab === n.key ? " active" : "") + (hasIssues ? " has-issues" : "")}
                onClick={() => setTab(n.key)}>
                <Icon size={15} /> {n.label}
                {n.count !== null && <span className="navcount">{n.count}</span>}
              </button>
            );
          })}
        </div>
        <div className="sidebar-foot">
          Данные хранятся только в этой сессии — не забудьте скачать XML перед закрытием вкладки.
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        <div className="topbar">
          <h1>{shop.name || "Фид ещё не заполнен"}</h1>
          <input ref={fileRef} type="file" accept=".xml" style={{ display: "none" }} onChange={handleImportFile} />
          <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Загрузить фид</button>
          <button className="btn btn-accent" onClick={downloadXML}><Download size={15} /> Скачать XML</button>
        </div>

        <div className="content">

          {importWarnings.length > 0 && tab === "overview" && (
            <div className="import-banner">
              <FileWarning size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>При импорте найдено {importWarnings.length} незнакомых тегов.</strong> Они были проигнорированы и не попадут в выгрузку.
                <ul>{importWarnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}</ul>
                {importWarnings.length > 8 && <div>…и ещё {importWarnings.length - 8}.</div>}
              </div>
            </div>
          )}

          {tab === "overview" && (
            <>
              <div className="stat-grid">
                <div className="stat-card"><div className="stat-num">{doctors.length}</div><div className="stat-label">Врачей</div></div>
                <div className="stat-card"><div className="stat-num">{clinics.length}</div><div className="stat-label">Клиник</div></div>
                <div className="stat-card"><div className="stat-num">{services.length}</div><div className="stat-label">Услуг</div></div>
                <div className="stat-card"><div className="stat-num">{offers.length}</div><div className="stat-label">Предложений</div></div>
                <div className={"stat-card " + (validation.errors.length ? "error" : "ok")}>
                  <div className="stat-num">{validation.errors.length}</div><div className="stat-label">Ошибок</div>
                </div>
                <div className={"stat-card " + (validation.warnings.length ? "warn" : "ok")}>
                  <div className="stat-num">{validation.warnings.length}</div><div className="stat-label">Предупреждений</div>
                </div>
              </div>

              <div className="card">
                <h2>Данные площадки</h2>
                <p className="card-sub">Общая информация о фиде — обязательна для всех врачей и клиник ниже.</p>
                <div className="form-grid">
                  <Field label="Название площадки" required hint="До 30 символов, показывается в карточке">
                    <Text value={shop.name} onChange={v => setShop({ ...shop, name: v })} placeholder="Яндекс.Здоровье" />
                  </Field>
                  <Field label="Организация" required>
                    <Text value={shop.company} onChange={v => setShop({ ...shop, company: v })} placeholder="ООО МираКлиник" />
                  </Field>
                  <Field label="URL сайта" required>
                    <Text value={shop.url} onChange={v => setShop({ ...shop, url: v })} placeholder="https://example.ru/" />
                  </Field>
                  <Field label="Логотип" required hint="URL изображения ≥100×100, на вашем домене">
                    <Text value={shop.picture} onChange={v => setShop({ ...shop, picture: v })} placeholder="https://example.ru/logo.png" />
                  </Field>
                  <Field label="Email">
                    <Text value={shop.email} onChange={v => setShop({ ...shop, email: v })} placeholder="info@example.ru" />
                  </Field>
                  <Field label="Дата обновления" required hint="ISO 8601, например 2026-08-26 12:00">
                    <Text mono value={shop.date} onChange={v => setShop({ ...shop, date: v })} />
                  </Field>
                  <Field label="Версия" required>
                    <Text mono value={shop.version} onChange={v => setShop({ ...shop, version: v })} />
                  </Field>
                </div>
              </div>

              <div className="card">
                <h2>XML фида</h2>
                <p className="card-sub">Собирается автоматически из всех разделов слева.</p>
                <div className="toolbar">
                  <button className="btn" onClick={copyXML}><Copy size={14} /> Копировать</button>
                  <button className="btn btn-accent" onClick={downloadXML}><Download size={14} /> Скачать .xml</button>
                  <button className="btn btn-danger" onClick={resetAll}><RotateCcw size={14} /> Очистить всё</button>
                </div>
                <div className="xml-preview">{exportXML}</div>
              </div>
            </>
          )}

          {tab === "doctors" && (
            <EntityTable
              title="Врачи" type="doctor" items={filtered(doctors, ["name", "id", "url"], search.doctors)}
              onSearch={v => setSearch({ ...search, doctors: v })} searchValue={search.doctors}
              onAdd={() => openNew("doctor")} onEdit={item => openEdit("doctor", item)}
              onDuplicate={item => duplicateItem("doctor", item)} onDelete={id => deleteItem("doctor", id)}
              issueCountFor={id => issueCountFor("Врачи", id)}
              columns={[
                {
                  header: "Врач", render: d => <>
                    <div className="cell-title">{d.name || "— без имени —"}</div>
                    <div className="cell-sub">{d.category ? `Категория: ${d.category}` : ""} {d.experience_years ? `· стаж ${d.experience_years} лет` : ""}</div>
                  </>
                },
                { header: "ID", render: d => <span className="idpill mono">{d.id}</span> },
              ]}
              emptyIcon={Stethoscope} emptyTitle="Пока нет ни одного врача"
              emptyText="Добавьте первого врача вручную или загрузите готовый фид."
            />
          )}

          {tab === "clinics" && (
            <EntityTable
              title="Клиники" type="clinic" items={filtered(clinics, ["name", "id", "city", "url"], search.clinics)}
              onSearch={v => setSearch({ ...search, clinics: v })} searchValue={search.clinics}
              onAdd={() => openNew("clinic")} onEdit={item => openEdit("clinic", item)}
              onDuplicate={item => duplicateItem("clinic", item)} onDelete={id => deleteItem("clinic", id)}
              issueCountFor={id => issueCountFor("Клиники", id)}
              columns={[
                {
                  header: "Клиника", render: c => <>
                    <div className="cell-title">{c.name || "— без названия —"}</div>
                    <div className="cell-sub">{c.city}{c.city && c.address ? ", " : ""}{c.address}</div>
                  </>
                },
                { header: "ID", render: c => <span className="idpill mono">{c.id}</span> },
              ]}
              emptyIcon={Building2} emptyTitle="Пока нет ни одной клиники"
              emptyText="Клиники нужны, чтобы привязывать к ним врачей и предложения."
            />
          )}

          {tab === "services" && (
            <EntityTable
              title="Услуги" type="service" items={filtered(services, ["name", "id", "gov_id", "url"], search.services)}
              onSearch={v => setSearch({ ...search, services: v })} searchValue={search.services}
              onAdd={() => openNew("service")} onEdit={item => openEdit("service", item)}
              onDuplicate={item => duplicateItem("service", item)} onDelete={id => deleteItem("service", id)}
              issueCountFor={id => issueCountFor("Услуги", id)}
              columns={[
                {
                  header: "Услуга", render: s => <>
                    <div className="cell-title">{s.name || "— без названия —"}</div>
                    <div className="cell-sub">{s.gov_id ? `Код Минздрава: ${s.gov_id}` : ""}</div>
                  </>
                },
                { header: "ID", render: s => <span className="idpill mono">{s.id}</span> },
              ]}
              emptyIcon={Tags} emptyTitle="Пока нет ни одной услуги"
              emptyText="Услуги используются в предложениях (offers) для связки врач + клиника + цена."
            />
          )}

          {tab === "offers" && (
            <EntityTable
              title="Предложения" type="offer" items={filtered(offers, ["id", "speciality", "url"], search.offers)}
              onSearch={v => setSearch({ ...search, offers: v })} searchValue={search.offers}
              onAdd={() => openNew("offer")} onEdit={item => openEdit("offer", item)}
              onDuplicate={item => duplicateItem("offer", item)} onDelete={id => deleteItem("offer", id)}
              issueCountFor={id => issueCountFor("Предложения", id)}
              columns={[
                {
                  header: "Предложение", render: o => <>
                    <div className="cell-title">{nameOfDoctor(o.doctor_id) || "врач не выбран"} — {nameOfService(o.service_id) || "услуга не выбрана"} — {o.speciality}</div>
                    <div className="cell-sub">{o.url || "— без URL —"}</div>
                    <div className="cell-sub">{nameOfClinic(o.clinic_id) || "клиника не выбрана"} {o.price?.base_price ? `· ${o.price.base_price} ${o.price.currency}` : ""}</div>
                  </>
                },
                { header: "ID", render: o => <span className="idpill mono">{o.id}</span> },
              ]}
              emptyIcon={Receipt} emptyTitle="Пока нет ни одного предложения"
              emptyText="Предложение связывает врача, клинику и услугу в одну карточку с ценой."
            />
          )}

          {tab === "validation" && (
            <ValidationPanel validation={validation} onJump={jumpTo} />
          )}
        </div>
      </div>

      {editing && (
        <EditorDrawer
          editing={editing} setEditing={setEditing} onClose={closeEditor} onSave={saveEditing}
          services={services} clinics={clinics} doctors={doctors}
        />
      )}

      {toast && (
        <div className={"toast" + (toast.kind === "error" ? " error" : "")}>
          {toast.kind === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />} {toast.msg}
        </div>
      )}
    </div>
  );
}

