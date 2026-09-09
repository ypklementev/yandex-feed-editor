import React, { useState, useMemo, useRef, useCallback } from "react";
import { Upload, Download, AlertTriangle, CheckCircle2, Building2, Stethoscope, ListChecks, FileWarning, Tags, Receipt, LayoutGrid, Copy, RotateCcw } from "lucide-react";
import { emptyShop, emptyDoctor, emptyClinic, emptyService, emptyOffer } from "./data/feedData";
import { parseFeedXML, buildXML } from "./lib/feedXml";
import { suggestNextId } from "./lib/feedHelpers";
import { validateFeed } from "./lib/validation";
import { Field, Text } from "./components/FormControls";
import { BulkEditorDrawer, EditorDrawer, EntityTable, ValidationPanel, ConfirmModal } from "./components/FeedComponents";

/* Колонки, которые не зависят от пропсов компонента — выносим на уровень модуля,
   чтобы не пересоздавать массив на каждый рендер App */
const DOCTOR_COLUMNS = [
  {
    header: "Врач", render: d => <>
      <div className="cell-title">{d.name || "— без имени —"}</div>
      <div className="cell-sub">{d.category ? `Категория: ${d.category}` : ""} {d.experience_years ? `· стаж ${d.experience_years} лет` : ""}</div>
    </>
  },
  { header: "ID", render: d => <span className="idpill mono">{d.id}</span> },
];
const CLINIC_COLUMNS = [
  {
    header: "Клиника", render: c => <>
      <div className="cell-title">{c.name || "— без названия —"}</div>
      <div className="cell-sub">{c.city}{c.city && c.address ? ", " : ""}{c.address}</div>
    </>
  },
  { header: "ID", render: c => <span className="idpill mono">{c.id}</span> },
];
const SERVICE_COLUMNS = [
  {
    header: "Услуга", render: s => <>
      <div className="cell-title">{s.name || "— без названия —"}</div>
      <div className="cell-sub">{s.gov_id ? `Код Минздрава: ${s.gov_id}` : ""}</div>
    </>
  },
  { header: "ID", render: s => <span className="idpill mono">{s.id}</span> },
];

export default function App() {
  const [shop, setShop] = useState(emptyShop());
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [services, setServices] = useState([]);
  const [offers, setOffers] = useState([]);

  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState({ doctors: "", clinics: "", services: "", offers: "" });
  const [selectedIds, setSelectedIds] = useState({ service: [], offer: [] });
  const [bulkEditing, setBulkEditing] = useState(null);
  const [editing, setEditing] = useState(null); // { type, isNew, originalId, data }
  const [importWarnings, setImportWarnings] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const requestConfirm = ({ title, message, confirmText = "Удалить", onConfirm }) => {
    setConfirmModal({
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  const closeConfirm = () => {
    setConfirmModal(null);
  };

  const handleConfirm = () => {
    if (!confirmModal) return;

    const action = confirmModal.onConfirm;
    setConfirmModal(null);
    action();
  };

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

  const doctorIssueCountFor = useCallback(id => errorsByEntity.get(`Врачи::${id}`) || { errors: 0, warnings: 0 }, [errorsByEntity]);
  const clinicIssueCountFor = useCallback(id => errorsByEntity.get(`Клиники::${id}`) || { errors: 0, warnings: 0 }, [errorsByEntity]);
  const serviceIssueCountFor = useCallback(id => errorsByEntity.get(`Услуги::${id}`) || { errors: 0, warnings: 0 }, [errorsByEntity]);
  const offerIssueCountFor = useCallback(id => errorsByEntity.get(`Предложения::${id}`) || { errors: 0, warnings: 0 }, [errorsByEntity]);

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
        setSelectedIds({ service: [], offer: [] });
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
    requestConfirm({
      title: "Очистить весь фид?",
      message: "Все врачи, клиники, услуги и предложения будут удалены. Это действие нельзя отменить.",
      confirmText: "Очистить всё",

      onConfirm: () => {
        setShop(emptyShop());
        setDoctors([]);
        setClinics([]);
        setServices([]);
        setOffers([]);
        setSelectedIds({ service: [], offer: [] });
        setImportWarnings([]);
        setImportSummary(null);

        showToast("Фид очищен");
      }
    });
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

  const saveEditing = (data) => {
    if (!editing) return;
    const { type, isNew, originalIndex } = editing;
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
    const titles = {
      doctor: "врача",
      clinic: "клинику",
      service: "услугу",
      offer: "предложение",
    };

    requestConfirm({
      title: "Удалить запись?",
      message: `Вы действительно хотите удалить ${titles[type] || "запись"} «${id}»? Это действие нельзя отменить.`,
      confirmText: "Удалить",

      onConfirm: () => {
        setterFor(type)(prev => prev.filter(x => x.id !== id));

        if (type === "service" || type === "offer") {
          setSelectedIds(prev => ({
            ...prev,
            [type]: prev[type].filter(selectedId => selectedId !== id)
          }));
        }

        if (editing && editing.originalId === id) {
          setEditing(null);
        }

        showToast("Запись удалена");
      }
    });
  };

  const toggleSelected = (type, id) => {
    setSelectedIds(prev => {
      const ids = prev[type] || [];
      return { ...prev, [type]: ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id] };
    });
  };
  const selectItems = (type, ids) => setSelectedIds(prev => ({ ...prev, [type]: ids }));
  const applyBulkPatch = (item, patch) => ({
    ...item,
    ...patch,
    ...(patch.price ? { price: { ...(item.price || {}), ...patch.price } } : {})
  });
  const duplicateSelected = (type, patch = {}) => {
    const ids = selectedIds[type] || [];
    const originals = listFor(type).filter(item => ids.includes(item.id));
    if (!originals.length) return;
    const currentList = [...listFor(type)];
    const copies = originals.map(item => {
      const copy = applyBulkPatch(JSON.parse(JSON.stringify(item)), patch);
      copy.id = suggestNextId(prefixFor(type), currentList, item.id);
      currentList.push(copy);
      return copy;
    });
    setterFor(type)(prev => [...prev, ...copies]);
    selectItems(type, copies.map(item => item.id));
    showToast(`Создано копий: ${copies.length}`);
  };
  const deleteSelected = type => {
    const ids = selectedIds[type] || [];
    if (!ids.length) return;

    requestConfirm({
      title: "Удалить выбранные записи?",
      message: `Будет удалено записей: ${ids.length}. Это действие нельзя отменить.`,
      confirmText: `Удалить (${ids.length})`,

      onConfirm: () => {
        setterFor(type)(prev =>
          prev.filter(item => !ids.includes(item.id))
        );

        if (editing && ids.includes(editing.originalId)) {
          setEditing(null);
        }

        selectItems(type, []);
        showToast(`Удалено записей: ${ids.length}`);
      }
    });
  };
  const openBulkEditor = (type, mode) => setBulkEditing({ type, mode });
  const saveBulkChanges = patch => {
    if (!bulkEditing) return;
    if (Object.keys(patch).length === 0) {
      showToast("Выберите хотя бы одно поле для изменения", "error");
      return;
    }
    const { type, mode } = bulkEditing;
    const ids = selectedIds[type] || [];
    if (mode === "duplicate") duplicateSelected(type, patch);
    else {
      setterFor(type)(prev => prev.map(item => ids.includes(item.id) ? applyBulkPatch(item, patch) : item));
      showToast(`Обновлено записей: ${ids.length}`);
    }
    setBulkEditing(null);
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

  /* Map вместо .find() — O(1) на строку вместо O(n) */
  const doctorNameById = useMemo(() => new Map(doctors.map(d => [d.id, d.name])), [doctors]);
  const clinicNameById = useMemo(() => new Map(clinics.map(c => [c.id, c.name])), [clinics]);
  const serviceNameById = useMemo(() => new Map(services.map(s => [s.id, s.name])), [services]);
  const nameOfDoctor = id => doctorNameById.get(id) || "";
  const nameOfClinic = id => clinicNameById.get(id) || "";
  const nameOfService = id => serviceNameById.get(id) || "";

  const filtered = (list, keys, q) => {
    if (!q) return list;
    const lq = q.toLowerCase();
    return list.filter(item => keys.some(k => String(item[k] || "").toLowerCase().includes(lq)));
  };
  const filteredOffers = q => {
    if (!q) return offers;
    const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return offers.filter(offer => {
      const searchable = [offer.id, offer.speciality, offer.url, nameOfDoctor(offer.doctor_id)]
        .map(value => String(value || "").toLowerCase())
        .join(" ");
      return terms.every(term => searchable.includes(term));
    });
  };

  /* Мемоизированные списки — пересчитываются только когда реально меняются данные/поиск */
  const filteredDoctors = useMemo(() => filtered(doctors, ["name", "id", "url"], search.doctors), [doctors, search.doctors]);
  const filteredClinics = useMemo(() => filtered(clinics, ["name", "id", "city", "url"], search.clinics), [clinics, search.clinics]);
  const filteredServices = useMemo(() => filtered(services, ["name", "id", "gov_id", "url"], search.services), [services, search.services]);
  const filteredOffersList = useMemo(() => filteredOffers(search.offers), [offers, search.offers, doctorNameById]);

  const offerColumns = useMemo(() => [
    {
      header: "Предложение", render: o => <>
        <div className="cell-title">{nameOfDoctor(o.doctor_id) || "врач не выбран"} — {nameOfService(o.service_id) || "услуга не выбрана"} — {o.speciality}</div>
        <div className="cell-sub">{o.url || "— без URL —"}</div>
        <div className="cell-sub">{nameOfClinic(o.clinic_id) || "клиника не выбрана"} {o.price?.base_price ? `· ${o.price.base_price} ${o.price.currency}` : ""}</div>
      </>
    },
    { header: "ID", render: o => <span className="idpill mono">{o.id}</span> },
  ], [doctorNameById, clinicNameById, serviceNameById]);

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
          <br></br>
          <span className="sidebar-foot-link">
            <a className="sidebar-foot-link" href="https://ypklementev.ru" target="_blank" rel="noopener noreferrer">
              Powered by ypklementev.ru
            </a>
          </span>
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
              title="Врачи" type="doctor" items={filteredDoctors}
              onSearch={v => setSearch({ ...search, doctors: v })} searchValue={search.doctors}
              onAdd={() => openNew("doctor")} onEdit={item => openEdit("doctor", item)}
              onDuplicate={item => duplicateItem("doctor", item)} onDelete={id => deleteItem("doctor", id)}
              issueCountFor={doctorIssueCountFor}
              columns={DOCTOR_COLUMNS}
              emptyIcon={Stethoscope} emptyTitle="Пока нет ни одного врача"
              emptyText="Добавьте первого врача вручную или загрузите готовый фид."
            />
          )}

          {tab === "clinics" && (
            <EntityTable
              title="Клиники" type="clinic" items={filteredClinics}
              onSearch={v => setSearch({ ...search, clinics: v })} searchValue={search.clinics}
              onAdd={() => openNew("clinic")} onEdit={item => openEdit("clinic", item)}
              onDuplicate={item => duplicateItem("clinic", item)} onDelete={id => deleteItem("clinic", id)}
              issueCountFor={clinicIssueCountFor}
              columns={CLINIC_COLUMNS}
              emptyIcon={Building2} emptyTitle="Пока нет ни одной клиники"
              emptyText="Клиники нужны, чтобы привязывать к ним врачей и предложения."
            />
          )}

          {tab === "services" && (
            <EntityTable
              title="Услуги" type="service" items={filteredServices}
              onSearch={v => setSearch({ ...search, services: v })} searchValue={search.services}
              onAdd={() => openNew("service")} onEdit={item => openEdit("service", item)}
              onDuplicate={item => duplicateItem("service", item)} onDelete={id => deleteItem("service", id)}
              selectedIds={selectedIds.service} onToggleSelection={id => toggleSelected("service", id)}
              onSelectItems={ids => selectItems("service", ids)}
              onDuplicateSelected={() => duplicateSelected("service")} onDeleteSelected={() => deleteSelected("service")}
              onBulkEdit={() => openBulkEditor("service", "edit")} onDuplicateWithChanges={() => openBulkEditor("service", "duplicate")}
              issueCountFor={serviceIssueCountFor}
              columns={SERVICE_COLUMNS}
              emptyIcon={Tags} emptyTitle="Пока нет ни одной услуги"
              emptyText="Услуги используются в предложениях (offers) для связки врач + клиника + цена."
            />
          )}

          {tab === "offers" && (
            <EntityTable
              title="Предложения" type="offer" items={filteredOffersList}
              onSearch={v => setSearch({ ...search, offers: v })} searchValue={search.offers}
              onAdd={() => openNew("offer")} onEdit={item => openEdit("offer", item)}
              onDuplicate={item => duplicateItem("offer", item)} onDelete={id => deleteItem("offer", id)}
              selectedIds={selectedIds.offer} onToggleSelection={id => toggleSelected("offer", id)}
              onSelectItems={ids => selectItems("offer", ids)}
              onDuplicateSelected={() => duplicateSelected("offer")} onDeleteSelected={() => deleteSelected("offer")}
              onBulkEdit={() => openBulkEditor("offer", "edit")} onDuplicateWithChanges={() => openBulkEditor("offer", "duplicate")}
              issueCountFor={offerIssueCountFor}
              columns={offerColumns}
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
          key={`${editing.type}-${editing.originalId ?? "new"}`}
          editing={editing} onClose={closeEditor} onSave={saveEditing}
          services={services} clinics={clinics} doctors={doctors}
        />
      )}

      {bulkEditing && (
        <BulkEditorDrawer
          bulkEditing={bulkEditing} onClose={() => setBulkEditing(null)} onSave={saveBulkChanges}
          services={services} clinics={clinics} doctors={doctors}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          onConfirm={handleConfirm}
          onCancel={closeConfirm}
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