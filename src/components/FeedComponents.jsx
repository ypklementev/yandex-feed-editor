import React from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Copy, Info, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { SPECIALITIES } from "../data/feedData";
import { Area, Badge, Field, RepeatEditor, RowNo, Select, Text, Toggle } from "./FormControls";

/* ============================================================
   ENTITY TABLE
   ============================================================ */
function EntityTable({ title, type, items, onSearch, searchValue, onAdd, onEdit, onDuplicate, onDelete, columns, issueCountFor, emptyIcon: EmptyIcon, emptyTitle, emptyText, selectedIds, onToggleSelection, onSelectItems, onDuplicateSelected, onDeleteSelected, onBulkEdit, onDuplicateWithChanges }) {
    const isSelectable = Boolean(selectedIds);
    const selectedCount = selectedIds?.length || 0;
    const areAllSelected = items.length > 0 && items.every(item => selectedIds?.includes(item.id));
    const toggleAll = () => onSelectItems(areAllSelected ? [] : items.map(item => item.id));
    return (
        <div>
            <div className="toolbar">
                <div className="search-box">
                    <Search size={14} />
                    <input className="ipt" placeholder={`Поиск по ${title.toLowerCase()}…`} value={searchValue} onChange={e => onSearch(e.target.value)} />
                </div>
                {isSelectable && selectedCount > 0 && (
                    <>
                        <span className="table-selection-count">Выбрано: {selectedCount}</span>
                        <button className="btn" onClick={onBulkEdit}>Изменить поля</button>
                        <button className="btn" onClick={onDuplicateSelected}><Copy size={14} /> Дублировать</button>
                        <button className="btn" onClick={onDuplicateWithChanges}><Copy size={14} /> Дублировать с изменениями</button>
                        <button className="btn btn-danger" onClick={onDeleteSelected}><Trash2 size={14} /> Удалить</button>
                    </>
                )}
                <button className="btn btn-accent" style={{ marginLeft: "auto" }} onClick={onAdd}><Plus size={15} /> Добавить</button>
            </div>

            {items.length === 0 ? (
                <div className="table-wrap">
                    <div className="empty-state">
                        <EmptyIcon size={30} />
                        <h3>{emptyTitle}</h3>
                        <p>{emptyText}</p>
                        <button className="btn btn-accent" onClick={onAdd}><Plus size={15} /> Добавить</button>
                    </div>
                </div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                {isSelectable && <th style={{ width: 34 }}><input type="checkbox" aria-label="Выбрать все" checked={areAllSelected} onChange={toggleAll} /></th>}
                                <th style={{ width: 34 }}>№</th>
                                {columns.map((c, i) => <th key={i}>{c.header}</th>)}
                                <th style={{ width: 90 }}>Статус</th>
                                <th style={{ width: 110 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => {
                                const issues = issueCountFor(item.id);
                                return (
                                    <tr key={item.id || i}>
                                        {isSelectable && <td><input type="checkbox" aria-label={`Выбрать ${item.id || `строку ${i + 1}`}`} checked={selectedIds.includes(item.id)} onChange={() => onToggleSelection(item.id)} /></td>}
                                        <td><RowNo n={i + 1} /></td>
                                        {columns.map((c, ci) => <td key={ci}>{c.render(item)}</td>)}
                                        <td>
                                            {issues.errors > 0
                                                ? <Badge kind="error"><AlertTriangle size={11} /> {issues.errors}</Badge>
                                                : issues.warnings > 0
                                                    ? <Badge kind="warn"><AlertTriangle size={11} /> {issues.warnings}</Badge>
                                                    : <Badge kind="ok"><CheckCircle2 size={11} /> ок</Badge>}
                                        </td>
                                        <td>
                                            <div className="rowactions">
                                                <button className="icon-btn" title="Редактировать" onClick={() => onEdit(item)}><Pencil size={14} /></button>
                                                <button className="icon-btn" title="Дублировать" onClick={() => onDuplicate(item)}><Copy size={14} /></button>
                                                <button className="icon-btn danger" title="Удалить" onClick={() => onDelete(item.id)}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* ============================================================
   VALIDATION PANEL
   ============================================================ */
function ValidationPanel({ validation, onJump }) {
    const { errors, warnings } = validation;
    const groupBy = list => {
        const m = new Map();
        list.forEach(e => { if (!m.has(e.section)) m.set(e.section, []); m.get(e.section).push(e); });
        return m;
    };
    const errGroups = groupBy(errors);
    const warnGroups = groupBy(warnings);
    const sections = ["Фид", "Врачи", "Клиники", "Услуги", "Предложения"];

    if (errors.length === 0 && warnings.length === 0) {
        return (
            <div className="card">
                <div className="all-clear"><CheckCircle2 size={18} /> Ошибок и предупреждений не найдено — фид готов к выгрузке.</div>
            </div>
        );
    }

    return (
        <div className="card">
            <h2>Результаты проверки</h2>
            <p className="card-sub">{errors.length} ошибок блокируют корректную загрузку фида, {warnings.length} предупреждений стоит проверить вручную.</p>

            {sections.map(sec => {
                const errs = errGroups.get(sec) || [];
                const warns = warnGroups.get(sec) || [];
                if (errs.length === 0 && warns.length === 0) return null;
                return (
                    <div key={sec}>
                        <div className="validation-group-title">{sec}</div>
                        {errs.map((e, i) => (
                            <div className="ledger-item err" key={"e" + i}>
                                <span className="ledger-mark"><AlertTriangle size={14} /></span>
                                <div className="ledger-text"><span className="ledger-tag mono">{e.entityId}</span>{e.message}</div>
                                {sec !== "Фид" && <button className="ledger-go" onClick={() => onJump(sec, e.entityId)} title="Перейти к записи"><ChevronRight size={16} /></button>}
                            </div>
                        ))}
                        {warns.map((w, i) => (
                            <div className="ledger-item warn" key={"w" + i}>
                                <span className="ledger-mark"><Info size={14} /></span>
                                <div className="ledger-text"><span className="ledger-tag mono">{w.entityId}</span>{w.message}</div>
                                {sec !== "Фид" && <button className="ledger-go" onClick={() => onJump(sec, w.entityId)} title="Перейти к записи"><ChevronRight size={16} /></button>}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

/* ============================================================
   EDITOR DRAWER
   ---------------------------------------------------------
   ФИКС: data теперь живёт в локальном state этого компонента,
   а не в App. Раньше update() дёргал setEditing() в App —
   значит каждая буква в поле формы ре-рендерила весь App
   (включая таблицу под drawer'ом). Теперь App не трогается
   вообще, пока не нажат "Сохранить".
   ============================================================ */
function EditorDrawer({ editing, onClose, onSave, services, clinics, doctors }) {
    const { type, isNew } = editing;
    const [data, setData] = React.useState(editing.data);
    const update = patch => setData(prev => ({ ...prev, ...patch }));

    const titles = { doctor: "Врач", clinic: "Клиника", service: "Услуга", offer: "Предложение" };

    return (
        <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="drawer">
                <div className="drawer-head">
                    <h2>{isNew ? `Новая запись — ${titles[type]}` : `Редактирование — ${titles[type]}`}</h2>
                    <button className="icon-btn" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="drawer-body">
                    <Field label="ID" required hint="Уникальный идентификатор внутри своего раздела">
                        <Text mono value={data.id} onChange={v => update({ id: v })} />
                    </Field>

                    {type === "doctor" && <DoctorForm data={data} update={update} />}
                    {type === "clinic" && <ClinicForm data={data} update={update} />}
                    {type === "service" && <ServiceForm data={data} update={update} />}
                    {type === "offer" && <OfferForm data={data} update={update} services={services} clinics={clinics} doctors={doctors} />}
                </div>
                <div className="drawer-foot">
                    <button className="btn" onClick={onClose}>Отмена</button>
                    <button className="btn btn-accent" onClick={() => onSave(data)}><Save size={14} /> Сохранить</button>
                </div>
            </div>
        </div>
    );
}

function DoctorForm({ data, update }) {
    return (
        <>
            <div className="form-grid">
                <div className="field-full"><Field label="ФИО" required><Text value={data.name} onChange={v => update({ name: v })} placeholder="Иванова Мария Сергеевна" /></Field></div>
                <Field label="Имя"><Text value={data.first_name} onChange={v => update({ first_name: v })} /></Field>
                <Field label="Фамилия"><Text value={data.surname} onChange={v => update({ surname: v })} /></Field>
                <Field label="Отчество"><Text value={data.patronymic} onChange={v => update({ patronymic: v })} /></Field>
                <Field label="Стаж, лет"><Text value={data.experience_years} onChange={v => update({ experience_years: v })} /></Field>
                <Field label="Начало карьеры" hint="ISO 8601, напр. 2015-01-01"><Text mono value={data.career_start_date} onChange={v => update({ career_start_date: v })} /></Field>
                <Field label="Категория"><Select value={data.category} onChange={v => update({ category: v })}
                    options={[{ value: "Высшая", label: "Высшая" }, { value: "Первая", label: "Первая" }, { value: "Вторая", label: "Вторая" }]} /></Field>
                <Field label="Степень"><Text value={data.degree} onChange={v => update({ degree: v })} placeholder="кандидат наук" /></Field>
                <Field label="Звание"><Text value={data.rank} onChange={v => update({ rank: v })} placeholder="доцент" /></Field>
                <Field label="Отзывов всего"><Text value={data.reviews_total_count} onChange={v => update({ reviews_total_count: v })} /></Field>
                <div className="field-full"><Field label="Страница врача (URL)"><Text value={data.url} onChange={v => update({ url: v })} /></Field></div>
                <div className="field-full"><Field label="Фото врача (URL)" hint="≥210×210, вертикальное"><Text value={data.picture} onChange={v => update({ picture: v })} /></Field></div>
                <div className="field-full"><Field label="Описание"><Area value={data.description} onChange={v => update({ description: v })} /></Field></div>
                <div className="field-full"><Field label="Внутренний ID" hint="Нужен для онлайн-расписания"><Text mono value={data.internal_id} onChange={v => update({ internal_id: v })} /></Field></div>
            </div>

            <div className="section-label">Образование</div>
            <RepeatEditor title="" items={data.education} onChange={v => update({ education: v })}
                empty={() => ({ organization: "", finish_year: "", type: "", specialization: "" })}
                fields={[{ key: "organization", label: "Учреждение" }, { key: "finish_year", label: "Год окончания" }, { key: "type", label: "Уровень" }, { key: "specialization", label: "Специализация" }]} />

            <div className="section-label">Опыт работы</div>
            <RepeatEditor title="" items={data.job} onChange={v => update({ job: v })}
                empty={() => ({ organization: "", period_years: "", position: "" })}
                fields={[{ key: "organization", label: "Организация" }, { key: "period_years", label: "Период (2015-2019)" }, { key: "position", label: "Должность" }]} />

            <div className="section-label">Сертификаты</div>
            <RepeatEditor title="" items={data.certificate} onChange={v => update({ certificate: v })}
                empty={() => ({ organization: "", finish_year: "", name: "" })}
                fields={[{ key: "organization", label: "Выдал" }, { key: "finish_year", label: "Год" }, { key: "name", label: "Название" }]} />

            <div className="section-label">Отзывы</div>
            <RepeatEditor title="" items={data.review} onChange={v => update({ review: v })}
                empty={() => ({ date: "", checked: false, used_in_rating: false, author: "", author_id: "", author_picture: "", url: "", comment: "", grade: "", positive: "", negative: "", response: "" })}
                fields={[
                    { key: "author", label: "Автор" }, { key: "date", label: "Дата" }, { key: "grade", label: "Оценка" },
                    { key: "comment", label: "Комментарий", type: "area" }, { key: "positive", label: "Плюсы" }, { key: "negative", label: "Минусы" },
                    { key: "response", label: "Ответ клиники", type: "area" }, { key: "checked", label: "Подтверждён" }, { key: "used_in_rating", label: "В рейтинге" }
                ]} />
        </>
    );
}

function ClinicForm({ data, update }) {
    return (
        <div className="form-grid">
            <div className="field-full"><Field label="Название" required hint="Как в Яндекс Бизнесе"><Text value={data.name} onChange={v => update({ name: v })} /></Field></div>
            <Field label="Город" required><Text value={data.city} onChange={v => update({ city: v })} placeholder="г. Москва" /></Field>
            <Field label="Телефон"><Text value={data.phone} onChange={v => update({ phone: v })} placeholder="+7 999 999-99-99" /></Field>
            <div className="field-full"><Field label="Адрес" required hint="Как в Яндекс Бизнесе"><Text value={data.address} onChange={v => update({ address: v })} /></Field></div>
            <Field label="Email"><Text value={data.email} onChange={v => update({ email: v })} /></Field>
            <Field label="ID организации в Яндексе" hint="Из ссылки yandex.ru/profile/…"><Text mono value={data.company_id} onChange={v => update({ company_id: v })} /></Field>
            <div className="field-full"><Field label="Сайт клиники"><Text value={data.url} onChange={v => update({ url: v })} /></Field></div>
            <div className="field-full"><Field label="Логотип клиники" hint="≥100×100"><Text value={data.picture} onChange={v => update({ picture: v })} /></Field></div>
            <div className="field-full"><Field label="Внутренний ID" hint="Нужен для онлайн-расписания"><Text mono value={data.internal_id} onChange={v => update({ internal_id: v })} /></Field></div>
        </div>
    );
}

function ServiceForm({ data, update }) {
    return (
        <div className="form-grid">
            <div className="field-full"><Field label="Название услуги" required><Text value={data.name} onChange={v => update({ name: v })} placeholder="Первичный приём терапевта" /></Field></div>
            <Field label="Код Минздрава" hint="Например A01.07.001"><Text mono value={data.gov_id} onChange={v => update({ gov_id: v })} /></Field>
            <Field label="Внутренний ID" hint="Нужен для онлайн-расписания"><Text mono value={data.internal_id} onChange={v => update({ internal_id: v })} /></Field>
            <div className="field-full"><Field label="Описание"><Area value={data.description} onChange={v => update({ description: v })} /></Field></div>
        </div>
    );
}

function OfferForm({ data, update, services, clinics, doctors }) {
    const price = data.price || { base_price: "", currency: "RUB", discounts: [], free_appointment: "" };
    const updatePrice = patch => update({ price: { ...price, ...patch } });

    return (
        <>
            <div className="section-label">Связка</div>
            <div className="form-grid">
                <div className="field-full">
                    <Field label="Врач" required>
                        <Select value={data.doctor_id} onChange={v => update({ doctor_id: v })}
                            options={doctors.map(d => ({ value: d.id, label: `${d.name || "без имени"} (${d.id})` }))}
                            placeholder="— выбрать врача —" />
                    </Field>
                </div>
                <div className="field-full">
                    <Field label="Клиника" required>
                        <Select value={data.clinic_id} onChange={v => update({ clinic_id: v })}
                            options={clinics.map(c => ({ value: c.id, label: `${c.name || "без названия"} (${c.id})` }))}
                            placeholder="— выбрать клинику —" />
                    </Field>
                </div>
                <div className="field-full">
                    <Field label="Услуга" required>
                        <Select value={data.service_id} onChange={v => update({ service_id: v })}
                            options={services.map(s => ({ value: s.id, label: `${s.name || "без названия"} (${s.id})` }))}
                            placeholder="— выбрать услугу —" />
                    </Field>
                </div>
                <div className="field-full">
                    <Field label="Специальность" required hint="Начните печатать — подставятся варианты из справочника Яндекса">
                        <input className="ipt" list="specialities-list" value={data.speciality || ""} onChange={e => update({ speciality: e.target.value })} placeholder="стоматолог-хирург" />
                        <datalist id="specialities-list">{SPECIALITIES.map(s => <option value={s} key={s} />)}</datalist>
                    </Field>
                </div>
                <div className="field-full"><Field label="Ссылка на приём (URL)"><Text value={data.url} onChange={v => update({ url: v })} /></Field></div>
            </div>

            <div className="section-label">Цена</div>
            <div className="form-grid">
                <Field label="Базовая цена"><Text value={price.base_price} onChange={v => updatePrice({ base_price: v })} /></Field>
                <Field label="Валюта"><Text mono value={price.currency} onChange={v => updatePrice({ currency: v })} placeholder="RUB" /></Field>
                <div className="field-full"><Field label="Условие бесплатного приёма"><Text value={price.free_appointment} onChange={v => updatePrice({ free_appointment: v })} /></Field></div>
            </div>
            <RepeatEditor title="Скидки" items={price.discounts || []} onChange={v => updatePrice({ discounts: v })}
                empty={() => ({ name: "", value: "" })}
                fields={[{ key: "name", label: "Условие скидки" }, { key: "value", label: "Цена со скидкой" }]} />

            <div className="section-label">Возможности записи</div>
            <Toggle label="Приём по ОМС" checked={data.oms} onChange={v => update({ oms: v })} />
            <Toggle label="Запись через сайт-поставщик" checked={data.appointment} onChange={v => update({ appointment: v })} />
            <Toggle label="Есть онлайн-расписание" checked={data.online_schedule} onChange={v => update({ online_schedule: v })} />
            <Toggle label="Приём детей (до 18 лет)" checked={data.children_appointment} onChange={v => update({ children_appointment: v })} />
            <Toggle label="Приём взрослых" checked={data.adult_appointment} onChange={v => update({ adult_appointment: v })} />
            <Toggle label="Вызов на дом" checked={data.house_call} onChange={v => update({ house_call: v })} />
            <Toggle label="Телемедицина" checked={data.telemed} onChange={v => update({ telemed: v })} />
            <Toggle label="Базовая услуга для этой связки" checked={data.is_base_service} onChange={v => update({ is_base_service: v })} />
        </>
    );
}

function BulkField({ label, enabled, onEnabled, children }) {
    return (
        <div className="field-full">
            <label className="toggle">
                <input type="checkbox" checked={enabled} onChange={e => onEnabled(e.target.checked)} />
                <span className="toggle-track"><span className="toggle-thumb" /></span>
                <span className="toggle-label">Изменить: {label}</span>
            </label>
            {enabled && <div style={{ marginTop: 8 }}>{children}</div>}
        </div>
    );
}

function BulkEditorDrawer({ bulkEditing, onClose, onSave, services, clinics, doctors }) {
    const { type, mode } = bulkEditing;
    const [enabled, setEnabled] = React.useState({});
    const [values, setValues] = React.useState({});
    const setEnabledField = (key, isEnabled) => {
        setEnabled(prev => ({ ...prev, [key]: isEnabled }));
        if (!isEnabled) setValues(prev => { const next = { ...prev }; delete next[key]; return next; });
    };
    const setValue = (key, value) => setValues(prev => ({ ...prev, [key]: value }));
    const buildPatch = () => {
        const patch = {};
        Object.entries(values).forEach(([key, value]) => {
            if (key.startsWith("price.")) {
                patch.price = { ...(patch.price || {}), [key.slice(6)]: value };
            } else patch[key] = value;
        });
        return patch;
    };
    const submit = () => onSave(buildPatch());
    const title = mode === "duplicate" ? "Дублировать с изменениями" : "Изменить выбранные записи";
    const offerOptions = {
        doctors: doctors.map(d => ({ value: d.id, label: `${d.name || "без имени"} (${d.id})` })),
        clinics: clinics.map(c => ({ value: c.id, label: `${c.name || "без названия"} (${c.id})` })),
        services: services.map(s => ({ value: s.id, label: `${s.name || "без названия"} (${s.id})` }))
    };
    const booleanFields = [
        ["oms", "Приём по ОМС"], ["appointment", "Запись через сайт-поставщик"],
        ["online_schedule", "Есть онлайн-расписание"], ["children_appointment", "Приём детей"],
        ["adult_appointment", "Приём взрослых"], ["house_call", "Вызов на дом"],
        ["telemed", "Телемедицина"], ["is_base_service", "Базовая услуга"]
    ];
    const booleanInput = key => (
        <select className="ipt" value={values[key] === undefined ? "" : String(values[key])} onChange={e => setValue(key, e.target.value === "true")}>
            <option value="" disabled>— выбрать значение —</option><option value="true">Да</option><option value="false">Нет</option>
        </select>
    );
    return (
        <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="drawer">
                <div className="drawer-head">
                    <h2>{title}</h2>
                    <button className="icon-btn" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="drawer-body">
                    <p className="card-sub">Включите только те поля, которые нужно заменить. Остальные значения каждой записи сохранятся как есть.</p>
                    {type === "service" ? (
                        <div className="form-grid">
                            <BulkField label="Название услуги" enabled={enabled.name} onEnabled={v => setEnabledField("name", v)}><Text value={values.name} onChange={v => setValue("name", v)} /></BulkField>
                            <BulkField label="Код Минздрава" enabled={enabled.gov_id} onEnabled={v => setEnabledField("gov_id", v)}><Text value={values.gov_id} onChange={v => setValue("gov_id", v)} /></BulkField>
                            <BulkField label="Внутренний ID" enabled={enabled.internal_id} onEnabled={v => setEnabledField("internal_id", v)}><Text value={values.internal_id} onChange={v => setValue("internal_id", v)} /></BulkField>
                            <BulkField label="Описание" enabled={enabled.description} onEnabled={v => setEnabledField("description", v)}><Area value={values.description} onChange={v => setValue("description", v)} /></BulkField>
                        </div>
                    ) : (
                        <>
                            <div className="section-label">Связка и цена</div>
                            <div className="form-grid">
                                <BulkField label="Врач" enabled={enabled.doctor_id} onEnabled={v => setEnabledField("doctor_id", v)}><Select value={values.doctor_id} onChange={v => setValue("doctor_id", v)} options={offerOptions.doctors} /></BulkField>
                                <BulkField label="Клиника" enabled={enabled.clinic_id} onEnabled={v => setEnabledField("clinic_id", v)}><Select value={values.clinic_id} onChange={v => setValue("clinic_id", v)} options={offerOptions.clinics} /></BulkField>
                                <BulkField label="Услуга" enabled={enabled.service_id} onEnabled={v => setEnabledField("service_id", v)}><Select value={values.service_id} onChange={v => setValue("service_id", v)} options={offerOptions.services} /></BulkField>
                                <BulkField label="Специальность" enabled={enabled.speciality} onEnabled={v => setEnabledField("speciality", v)}><Text value={values.speciality} onChange={v => setValue("speciality", v)} /></BulkField>
                                <BulkField label="Ссылка на приём" enabled={enabled.url} onEnabled={v => setEnabledField("url", v)}><Text value={values.url} onChange={v => setValue("url", v)} /></BulkField>
                                <BulkField label="Базовая цена" enabled={enabled["price.base_price"]} onEnabled={v => setEnabledField("price.base_price", v)}><Text value={values["price.base_price"]} onChange={v => setValue("price.base_price", v)} /></BulkField>
                                <BulkField label="Валюта" enabled={enabled["price.currency"]} onEnabled={v => setEnabledField("price.currency", v)}><Text value={values["price.currency"]} onChange={v => setValue("price.currency", v)} /></BulkField>
                                <BulkField label="Условие бесплатного приёма" enabled={enabled["price.free_appointment"]} onEnabled={v => setEnabledField("price.free_appointment", v)}><Text value={values["price.free_appointment"]} onChange={v => setValue("price.free_appointment", v)} /></BulkField>
                                <BulkField label="Скидки" enabled={enabled["price.discounts"]} onEnabled={v => setEnabledField("price.discounts", v)}>
                                    <RepeatEditor title="" items={values["price.discounts"] || []} onChange={v => setValue("price.discounts", v)}
                                        empty={() => ({ name: "", value: "" })}
                                        fields={[{ key: "name", label: "Условие скидки" }, { key: "value", label: "Цена со скидкой" }]} />
                                </BulkField>
                            </div>
                            <div className="section-label">Возможности записи</div>
                            <div className="form-grid">
                                {booleanFields.map(([key, label]) => <BulkField key={key} label={label} enabled={enabled[key]} onEnabled={v => setEnabledField(key, v)}>{booleanInput(key)}</BulkField>)}
                            </div>
                        </>
                    )}
                </div>
                <div className="drawer-foot">
                    <button className="btn" onClick={onClose}>Отмена</button>
                    <button className="btn btn-accent" onClick={submit}><Save size={14} /> {mode === "duplicate" ? "Создать копии" : "Применить"}</button>
                </div>
            </div>
        </div>
    );
}


function ConfirmModal({
    title = "Подтвердите действие",
    message,
    confirmText = "Удалить",
    cancelText = "Отмена",
    onConfirm,
    onCancel,
}) {
    return (
        <div
            className="overlay"
            onMouseDown={e => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div className="confirm-modal">
                <div className="confirm-modal-icon">
                    <AlertTriangle size={22} />
                </div>

                <div className="confirm-modal-content">
                    <h2>{title}</h2>
                    <p>{message}</p>
                </div>

                <div className="confirm-modal-actions">
                    <button className="btn" onClick={onCancel}>
                        {cancelText}
                    </button>

                    <button className="btn btn-danger" onClick={onConfirm}>
                        <Trash2 size={14} />
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export { BulkEditorDrawer, EntityTable, ValidationPanel, EditorDrawer, ConfirmModal };