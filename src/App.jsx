import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  Upload, Download, Plus, Pencil, Trash2, Search, AlertTriangle,
  CheckCircle2, X, Copy, ChevronRight, Building2, Stethoscope,
  ListChecks, FileWarning, Info, ClipboardList, Tags, Receipt,
  LayoutGrid, Save, RotateCcw
} from "lucide-react";

/* ============================================================
   REFERENCE DATA — specialities allowed by the Yandex catalog
   ============================================================ */
const SPECIALITIES = [
  "абдоминальный хирург", "акушер", "акушер-гинеколог", "аллерголог", "аллерголог-иммунолог", "андролог",
  "анестезиолог", "анестезиолог-реаниматолог", "аритмолог", "артролог", "бариатрический хирург", "вегетолог",
  "венеролог", "вертебролог", "вирусолог", "врач лабораторной диагностики", "врач лфк", "врач общей практики",
  "врач по медико-социальной экспертизе", "врач по паллиативной медицинской помощи", "врач по спортивной медицине",
  "врач по рентгенэндоваскулярным диагностике и лечению", "врач скорой помощи", "врач УЗИ",
  "врач функциональной диагностики", "врач эфферентной терапии", "гастроэнтеролог", "гематолог",
  "гемостазиолог", "генетик", "гепатолог", "гериатр (геронтолог)", "гинеколог", "гинеколог-эндокринолог",
  "гипнолог", "гирудотерапевт", "гнатолог", "гнойный хирург", "дезинфектолог", "дерматолог", "дерматовенеролог",
  "дефектолог", "диабетолог", "диетолог", "иммунолог", "инструктор лфк", "инфекционист", "кардиолог",
  "кардиохирург", "кинезиолог", "кистевой хирург", "клинический фармаколог", "колопроктолог (проктолог)",
  "косметолог", "лазерный хирург", "лимфолог", "логопед", "лор (отоларинголог)", "малоинвазивный хирург",
  "маммолог", "мануальный терапевт", "массажист", "миколог", "нарколог", "невролог", "нейропсихолог",
  "нейрофизиолог", "нейрохирург", "неонатолог", "нефролог", "нутрициолог", "ожоговый хирург (комбустиолог)",
  "онкогинеколог", "онкодерматолог", "онколог", "онколог-гематолог", "онкопроктолог", "онкоуролог",
  "оптометрист", "ортопед", "остеопат", "отоневролог", "офтальмолог (окулист)", "офтальмолог-протезист",
  "офтальмохирург", "паразитолог", "патологоанатом", "педиатр", "перинатолог", "пластический хирург",
  "подиатр", "подолог", "профпатолог", "психиатр", "психолог", "психотерапевт", "пульмонолог", "радиолог",
  "радиотерапевт", "реабилитолог", "реаниматолог", "ревматолог", "рентгенолог", "репродуктолог",
  "рефлексотерапевт", "сексолог", "семейный врач", "сердечно-сосудистый хирург", "сомнолог",
  "сосудистый хирург", "специалист по грудному вскармливанию", "спортивный врач", "стоматолог",
  "стоматолог-гигиенист", "стоматолог-имплантолог", "стоматолог-ортодонт", "стоматолог-ортопед",
  "стоматолог-пародонтолог", "стоматолог-терапевт", "стоматолог-хирург", "стоматолог-эндодонт",
  "судебно-медицинский эксперт", "сурдолог", "сурдолог-протезист", "терапевт", "токсиколог",
  "торакальный онколог", "торакальный хирург", "травматолог", "трансплантолог", "трансфузиолог",
  "трихолог", "уролог", "физиотерапевт", "фитотерапевт", "флеболог", "фониатр", "фтизиатр",
  "химиотерапевт", "хирург", "хирург-эндокринолог", "цитолог", "челюстно-лицевой хирург",
  "эмбриолог", "эндоваскулярный хирург", "эндокринолог", "эндоскопист", "эпидемиолог", "эпилептолог"
];

/* ============================================================
   FACTORY DEFAULTS
   ============================================================ */
const emptyShop = () => ({
  version: "2.0",
  date: new Date().toISOString().slice(0, 16).replace("T", " "),
  name: "", company: "", url: "", picture: "", email: ""
});
const emptyDoctor = () => ({
  id: "", name: "", url: "", description: "", internal_id: "",
  first_name: "", surname: "", patronymic: "", experience_years: "",
  picture: "", career_start_date: "", degree: "", rank: "", category: "",
  reviews_total_count: "", education: [], job: [], certificate: [], review: []
});
const emptyClinic = () => ({
  id: "", url: "", picture: "", name: "", address: "", city: "",
  email: "", phone: "", internal_id: "", company_id: ""
});
const emptyService = () => ({ id: "", name: "", gov_id: "", description: "", internal_id: "" });
const emptyOffer = () => ({
  id: "", url: "", online_schedule: false, oms: false, appointment: false,
  price: { base_price: "", currency: "RUB", discounts: [], free_appointment: "" },
  service_id: "", clinic_id: "", doctor_id: "", speciality: "",
  children_appointment: false, adult_appointment: true, house_call: false,
  telemed: false, is_base_service: false
});

/* ============================================================
   XML PARSE
   ============================================================ */
function parseFeedXML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const perr = doc.querySelector("parsererror");
  if (perr) throw new Error("Файл повреждён или не является корректным XML.");

  const root = doc.documentElement;
  const shopEl = root.tagName.toLowerCase() === "shop" ? root : root.querySelector("shop");
  if (!shopEl) throw new Error("В файле не найден элемент <shop>.");

  const child = (el, tag) => (el ? Array.from(el.children).find(c => c.tagName === tag) : null);
  const children = (el, tag) => (el ? Array.from(el.children).filter(c => c.tagName === tag) : []);
  const txt = el => (el ? (el.textContent || "").trim() : "");
  const ctxt = (el, tag) => txt(child(el, tag));
  const unknown = [];
  const checkKnown = (el, known, label) => {
    Array.from(el.children).forEach(c => {
      if (!known.includes(c.tagName)) unknown.push(`${label}: незнакомый тег <${c.tagName}>`);
    });
  };

  const shop = {
    version: shopEl.getAttribute("version") || "",
    date: shopEl.getAttribute("date") || "",
    name: ctxt(shopEl, "name"), company: ctxt(shopEl, "company"),
    url: ctxt(shopEl, "url"), picture: ctxt(shopEl, "picture"), email: ctxt(shopEl, "email")
  };
  checkKnown(shopEl, ["name", "company", "url", "picture", "email", "doctors", "clinics", "services", "offers"], "shop");

  const DOC_FIELDS = ["name", "url", "description", "internal_id", "first_name", "surname", "patronymic",
    "experience_years", "picture", "career_start_date", "degree", "rank", "category",
    "reviews_total_count", "education", "job", "certificate", "review"];
  const doctors = children(child(shopEl, "doctors"), "doctor").map(dEl => {
    const id = dEl.getAttribute("id") || "";
    checkKnown(dEl, DOC_FIELDS, `врач[${id || "?"}]`);
    return {
      id, name: ctxt(dEl, "name"), url: ctxt(dEl, "url"), description: ctxt(dEl, "description"),
      internal_id: ctxt(dEl, "internal_id"), first_name: ctxt(dEl, "first_name"), surname: ctxt(dEl, "surname"),
      patronymic: ctxt(dEl, "patronymic"), experience_years: ctxt(dEl, "experience_years"),
      picture: ctxt(dEl, "picture"), career_start_date: ctxt(dEl, "career_start_date"),
      degree: ctxt(dEl, "degree"), rank: ctxt(dEl, "rank"), category: ctxt(dEl, "category"),
      reviews_total_count: ctxt(dEl, "reviews_total_count"),
      education: children(dEl, "education").map(e => ({ organization: ctxt(e, "organization"), finish_year: ctxt(e, "finish_year"), type: ctxt(e, "type"), specialization: ctxt(e, "specialization") })),
      job: children(dEl, "job").map(j => ({ organization: ctxt(j, "organization"), period_years: ctxt(j, "period_years"), position: ctxt(j, "position") })),
      certificate: children(dEl, "certificate").map(c => ({ organization: ctxt(c, "organization"), finish_year: ctxt(c, "finish_year"), name: ctxt(c, "name") })),
      review: children(dEl, "review").map(r => ({
        date: ctxt(r, "date"), checked: ctxt(r, "checked") === "true", used_in_rating: ctxt(r, "used_in_rating") === "true",
        author: ctxt(r, "author"), author_id: ctxt(r, "author_id"), author_picture: ctxt(r, "author_picture"),
        url: ctxt(r, "url"), comment: ctxt(r, "comment"), grade: ctxt(r, "grade"), positive: ctxt(r, "positive"),
        negative: ctxt(r, "negative"), response: ctxt(r, "response")
      }))
    };
  });

  const CLINIC_FIELDS = ["url", "picture", "name", "address", "city", "email", "phone", "internal_id", "company_id"];
  const clinics = children(child(shopEl, "clinics"), "clinic").map(cEl => {
    const id = cEl.getAttribute("id") || "";
    checkKnown(cEl, CLINIC_FIELDS, `клиника[${id || "?"}]`);
    return {
      id, url: ctxt(cEl, "url"), picture: ctxt(cEl, "picture"), name: ctxt(cEl, "name"),
      address: ctxt(cEl, "address"), city: ctxt(cEl, "city"), email: ctxt(cEl, "email"),
      phone: ctxt(cEl, "phone"), internal_id: ctxt(cEl, "internal_id"), company_id: ctxt(cEl, "company_id")
    };
  });

  const SERVICE_FIELDS = ["name", "gov_id", "description", "internal_id"];
  const services = children(child(shopEl, "services"), "service").map(sEl => {
    const id = sEl.getAttribute("id") || "";
    checkKnown(sEl, SERVICE_FIELDS, `услуга[${id || "?"}]`);
    return { id, name: ctxt(sEl, "name"), gov_id: ctxt(sEl, "gov_id"), description: ctxt(sEl, "description"), internal_id: ctxt(sEl, "internal_id") };
  });

  const OFFER_FIELDS = ["url", "online_schedule", "oms", "appointment", "price", "service", "clinic"];
  const offers = children(child(shopEl, "offers"), "offer").map(oEl => {
    const id = oEl.getAttribute("id") || "";
    checkKnown(oEl, OFFER_FIELDS, `предложение[${id || "?"}]`);
    const priceEl = child(oEl, "price");
    const discounts = priceEl ? children(priceEl, "discount").map(dEl => ({ name: dEl.getAttribute("name") || "", value: txt(dEl) })) : [];
    const serviceEl = child(oEl, "service");
    const clinicEl = child(oEl, "clinic");
    const doctorEl = clinicEl ? child(clinicEl, "doctor") : null;
    return {
      id, url: ctxt(oEl, "url"),
      online_schedule: ctxt(oEl, "online_schedule") === "true",
      oms: ctxt(oEl, "oms") === "true",
      appointment: ctxt(oEl, "appointment") === "true",
      price: {
        base_price: ctxt(priceEl, "base_price"), currency: ctxt(priceEl, "currency") || "RUB",
        discounts, free_appointment: ctxt(priceEl, "free_appointment")
      },
      service_id: serviceEl ? (serviceEl.getAttribute("id") || "") : "",
      clinic_id: clinicEl ? (clinicEl.getAttribute("id") || "") : "",
      doctor_id: doctorEl ? (doctorEl.getAttribute("id") || "") : "",
      speciality: ctxt(doctorEl, "speciality"),
      children_appointment: ctxt(doctorEl, "children_appointment") === "true",
      adult_appointment: doctorEl && child(doctorEl, "adult_appointment") ? ctxt(doctorEl, "adult_appointment") === "true" : true,
      house_call: ctxt(doctorEl, "house_call") === "true",
      telemed: ctxt(doctorEl, "telemed") === "true",
      is_base_service: ctxt(doctorEl, "is_base_service") === "true"
    };
  });

  return { shop, doctors, clinics, services, offers, unknown };
}

/* ============================================================
   XML SERIALIZE
   ============================================================ */
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function tagLine(name, value, indent) {
  if (value === undefined || value === null || value === "") return "";
  return `${indent}<${name}>${esc(value)}</${name}>\n`;
}
// True if at least one of the given keys on obj has a non-empty value —
// used to skip emitting optional repeatable blocks (education/job/
// certificate/review) that a user added but never actually filled in.
function hasContent(obj, keys) {
  return keys.some(k => String(obj[k] ?? "").trim() !== "");
}
function buildXML(shop, doctors, clinics, services, offers) {
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n';
  x += `<shop version="${esc(shop.version || "2.0")}" date="${esc(shop.date)}">\n`;
  x += tagLine("name", shop.name, "\t");
  x += tagLine("company", shop.company, "\t");
  x += tagLine("url", shop.url, "\t");
  x += tagLine("picture", shop.picture, "\t");
  x += tagLine("email", shop.email, "\t");

  x += "\n\t<doctors>\n";
  doctors.forEach(d => {
    x += `\t\t<doctor id="${esc(d.id)}">\n`;
    x += tagLine("internal_id", d.internal_id, "\t\t\t");
    x += tagLine("name", d.name, "\t\t\t");
    x += tagLine("url", d.url, "\t\t\t");
    x += tagLine("description", d.description, "\t\t\t");
    x += tagLine("first_name", d.first_name, "\t\t\t");
    x += tagLine("surname", d.surname, "\t\t\t");
    x += tagLine("patronymic", d.patronymic, "\t\t\t");
    x += tagLine("experience_years", d.experience_years, "\t\t\t");
    x += tagLine("picture", d.picture, "\t\t\t");
    x += tagLine("career_start_date", d.career_start_date, "\t\t\t");
    x += tagLine("degree", d.degree, "\t\t\t");
    x += tagLine("rank", d.rank, "\t\t\t");
    x += tagLine("category", d.category, "\t\t\t");
    (d.education || []).forEach(e => {
      if (!hasContent(e, ["organization", "finish_year", "type", "specialization"])) return;
      x += "\t\t\t<education>\n";
      x += tagLine("organization", e.organization, "\t\t\t\t");
      x += tagLine("finish_year", e.finish_year, "\t\t\t\t");
      x += tagLine("type", e.type, "\t\t\t\t");
      x += tagLine("specialization", e.specialization, "\t\t\t\t");
      x += "\t\t\t</education>\n";
    });
    (d.job || []).forEach(j => {
      if (!hasContent(j, ["organization", "period_years", "position"])) return;
      x += "\t\t\t<job>\n";
      x += tagLine("organization", j.organization, "\t\t\t\t");
      x += tagLine("period_years", j.period_years, "\t\t\t\t");
      x += tagLine("position", j.position, "\t\t\t\t");
      x += "\t\t\t</job>\n";
    });
    (d.certificate || []).forEach(c => {
      if (!hasContent(c, ["organization", "finish_year", "name"])) return;
      x += "\t\t\t<certificate>\n";
      x += tagLine("organization", c.organization, "\t\t\t\t");
      x += tagLine("finish_year", c.finish_year, "\t\t\t\t");
      x += tagLine("name", c.name, "\t\t\t\t");
      x += "\t\t\t</certificate>\n";
    });
    x += tagLine("reviews_total_count", d.reviews_total_count, "\t\t\t");
    (d.review || []).forEach(r => {
      if (!hasContent(r, ["author", "comment", "positive", "negative", "response", "date", "grade", "author_id", "author_picture", "url"])) return;
      x += "\t\t\t<review>\n";
      x += tagLine("date", r.date, "\t\t\t\t");
      x += tagLine("checked", r.checked ? "true" : "false", "\t\t\t\t");
      x += tagLine("used_in_rating", r.used_in_rating ? "true" : "false", "\t\t\t\t");
      x += tagLine("author", r.author, "\t\t\t\t");
      x += tagLine("author_id", r.author_id, "\t\t\t\t");
      x += tagLine("author_picture", r.author_picture, "\t\t\t\t");
      x += tagLine("url", r.url, "\t\t\t\t");
      x += tagLine("comment", r.comment, "\t\t\t\t");
      x += tagLine("grade", r.grade, "\t\t\t\t");
      x += tagLine("positive", r.positive, "\t\t\t\t");
      x += tagLine("negative", r.negative, "\t\t\t\t");
      x += tagLine("response", r.response, "\t\t\t\t");
      x += "\t\t\t</review>\n";
    });
    x += "\t\t</doctor>\n";
  });
  x += "\t</doctors>\n";

  x += "\n\t<clinics>\n";
  clinics.forEach(c => {
    x += `\t\t<clinic id="${esc(c.id)}">\n`;
    x += tagLine("url", c.url, "\t\t\t");
    x += tagLine("picture", c.picture, "\t\t\t");
    x += tagLine("name", c.name, "\t\t\t");
    x += tagLine("city", c.city, "\t\t\t");
    x += tagLine("address", c.address, "\t\t\t");
    x += tagLine("email", c.email, "\t\t\t");
    x += tagLine("phone", c.phone, "\t\t\t");
    x += tagLine("internal_id", c.internal_id, "\t\t\t");
    x += tagLine("company_id", c.company_id, "\t\t\t");
    x += "\t\t</clinic>\n";
  });
  x += "\t</clinics>\n";

  x += "\n\t<services>\n";
  services.forEach(s => {
    x += `\t\t<service id="${esc(s.id)}">\n`;
    x += tagLine("name", s.name, "\t\t\t");
    x += tagLine("gov_id", s.gov_id, "\t\t\t");
    x += tagLine("description", s.description, "\t\t\t");
    x += tagLine("internal_id", s.internal_id, "\t\t\t");
    x += "\t\t</service>\n";
  });
  x += "\t</services>\n";

  x += "\n\t<offers>\n";
  offers.forEach(o => {
    x += `\t\t<offer id="${esc(o.id)}">\n`;
    x += tagLine("url", o.url, "\t\t\t");
    x += tagLine("oms", o.oms ? "true" : "false", "\t\t\t");
    x += tagLine("online_schedule", o.online_schedule ? "true" : "false", "\t\t\t");
    x += tagLine("appointment", o.appointment ? "true" : "false", "\t\t\t");
    // price as a whole is optional, but base_price + currency are both
    // required THE MOMENT you include <price> at all — so only emit the
    // block when base_price is actually filled in, never a half-empty one.
    const p = o.price || {};
    if (String(p.base_price || "").trim() !== "") {
      x += "\t\t\t<price>\n";
      x += tagLine("base_price", p.base_price, "\t\t\t\t");
      x += tagLine("currency", p.currency || "RUB", "\t\t\t\t");
      (p.discounts || []).forEach(d => {
        if (String(d.value || "").trim() !== "") x += `\t\t\t\t<discount name="${esc(d.name)}">${esc(d.value)}</discount>\n`;
      });
      x += tagLine("free_appointment", p.free_appointment, "\t\t\t\t");
      x += "\t\t\t</price>\n";
    }
    x += `\t\t\t<service id="${esc(o.service_id)}"/>\n`;
    x += `\t\t\t<clinic id="${esc(o.clinic_id)}">\n`;
    x += `\t\t\t\t<doctor id="${esc(o.doctor_id)}">\n`;
    x += tagLine("speciality", o.speciality, "\t\t\t\t\t");
    x += tagLine("children_appointment", o.children_appointment ? "true" : "false", "\t\t\t\t\t");
    x += tagLine("adult_appointment", o.adult_appointment ? "true" : "false", "\t\t\t\t\t");
    x += tagLine("house_call", o.house_call ? "true" : "false", "\t\t\t\t\t");
    x += tagLine("telemed", o.telemed ? "true" : "false", "\t\t\t\t\t");
    x += tagLine("is_base_service", o.is_base_service ? "true" : "false", "\t\t\t\t\t");
    x += "\t\t\t\t</doctor>\n";
    x += "\t\t\t</clinic>\n";
    x += "\t\t</offer>\n";
  });
  x += "\t</offers>\n</shop>\n";
  return x;
}

/* ============================================================
   HELPERS
   ============================================================ */
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

/* ============================================================
   VALIDATION
   ============================================================ */
function validateFeed({ shop, doctors, clinics, services, offers }) {
  const errors = [];
  const warnings = [];
  const err = (section, entityId, message) => errors.push({ section, entityId, message });
  const warn = (section, entityId, message) => warnings.push({ section, entityId, message });

  if (shop.version !== "2.0") err("Фид", "shop", 'версия должна быть "2.0"');
  if (!shop.date) err("Фид", "shop", "не указана дата обновления");
  if (!shop.name) err("Фид", "shop", "не указано название площадки");
  else if (shop.name.length > 30) err("Фид", "shop", `название площадки длиннее 30 символов (сейчас ${shop.name.length})`);
  if (!shop.company) err("Фид", "shop", "не указана организация");
  if (!shop.url) err("Фид", "shop", "не указан URL площадки");
  if (!shop.picture) err("Фид", "shop", "не указан логотип площадки");

  const docIds = dupeMap(doctors);
  doctors.forEach(d => {
    const label = d.name || d.id || "без имени";
    if (!d.id) err("Врачи", label, "не указан id");
    else if (docIds.get(d.id) > 1) err("Врачи", d.id, "повторяющийся id — встречается больше одного раза");
    if (!d.name) err("Врачи", d.id || label, "не указано ФИО");
  });

  const clinicIds = dupeMap(clinics);
  clinics.forEach(c => {
    const label = c.name || c.id || "без названия";
    if (!c.id) err("Клиники", label, "не указан id");
    else if (clinicIds.get(c.id) > 1) err("Клиники", c.id, "повторяющийся id — встречается больше одного раза");
    if (!c.name) err("Клиники", c.id || label, "не указано название");
    if (!c.address) err("Клиники", c.id || label, "не указан адрес");
    if (!c.city) err("Клиники", c.id || label, "не указан город");
  });

  const serviceIds = dupeMap(services);
  services.forEach(s => {
    const label = s.name || s.id || "без названия";
    if (!s.id) err("Услуги", label, "не указан id");
    else if (serviceIds.get(s.id) > 1) err("Услуги", s.id, "повторяющийся id — встречается больше одного раза");
    if (!s.name) err("Услуги", s.id || label, "не указано название услуги");
  });

  const doctorIdSet = new Set(doctors.map(d => d.id).filter(Boolean));
  const clinicIdSet = new Set(clinics.map(c => c.id).filter(Boolean));
  const serviceIdSet = new Set(services.map(s => s.id).filter(Boolean));
  const doctorById = new Map(doctors.map(d => [d.id, d]));
  const clinicById = new Map(clinics.map(c => [c.id, c]));
  const serviceById = new Map(services.map(s => [s.id, s]));

  const offerIds = dupeMap(offers);
  offers.forEach(o => {
    const label = o.id || "без id";
    if (!o.id) err("Предложения", label, "не указан id");
    else if (offerIds.get(o.id) > 1) err("Предложения", o.id, "повторяющийся id — встречается больше одного раза");

    if (!o.service_id) err("Предложения", label, "не выбрана услуга");
    else if (!serviceIdSet.has(o.service_id)) err("Предложения", label, `услуга "${o.service_id}" отсутствует в списке услуг`);

    if (!o.clinic_id) err("Предложения", label, "не выбрана клиника");
    else if (!clinicIdSet.has(o.clinic_id)) err("Предложения", label, `клиника "${o.clinic_id}" отсутствует в списке клиник`);

    if (!o.doctor_id) err("Предложения", label, "не выбран врач");
    else if (!doctorIdSet.has(o.doctor_id)) err("Предложения", label, `врач "${o.doctor_id}" отсутствует в списке врачей`);

    if (!o.speciality) err("Предложения", label, "не указана специальность");
    else if (!SPECIALITIES.includes(o.speciality)) warn("Предложения", label, `специальность "${o.speciality}" отсутствует в справочнике Яндекса`);

    const bp = parseFloat(o.price?.base_price);
    if (o.price?.base_price && !isNaN(bp)) {
      (o.price.discounts || []).forEach(dd => {
        const dv = parseFloat(dd.value);
        if (!isNaN(dv) && dv > bp) err("Предложения", label, `скидка "${dd.name || "без названия"}" больше базовой цены`);
      });
    } else if (o.price?.discounts?.length) {
      warn("Предложения", label, "указана скидка, но не указана базовая цена");
    }
    if (o.price?.base_price && !o.price?.currency) warn("Предложения", label, "указана цена без валюты");

    if (o.online_schedule) {
      const doc = doctorById.get(o.doctor_id), cl = clinicById.get(o.clinic_id), sv = serviceById.get(o.service_id);
      if (doc && !doc.internal_id) warn("Предложения", label, "включено online_schedule, но у врача не указан internal_id");
      if (cl && !cl.internal_id) warn("Предложения", label, "включено online_schedule, но у клиники не указан internal_id");
      if (sv && !sv.internal_id) warn("Предложения", label, "включено online_schedule, но у услуги не указан internal_id");
    }
  });

  // у каждого врача должна быть хотя бы одна базовая услуга —
  // строим карту по врачам, а не по офферам, чтобы ловить и тех,
  // у кого вообще нет ни одного предложения
  const doctorHasBaseService = new Map(doctors.map(d => [d.id, false]));
  offers.forEach(o => {
    if (o.doctor_id && o.is_base_service && doctorHasBaseService.has(o.doctor_id)) {
      doctorHasBaseService.set(o.doctor_id, true);
    }
  });
  doctors.forEach(d => {
    if (d.id && !doctorHasBaseService.get(d.id)) {
      const label = d.name || d.id;
      err("Врачи", d.id, "ни одно предложение врача не отмечено как базовая услуга (is_base_service)");
    }
  });

  return { errors, warnings };
}

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

/* ============================================================
   MAIN APP
   ============================================================ */
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
    data.id = nextId(prefixFor(type), listFor(type).map(x => x.id));
    setEditing({ type, isNew: true, originalId: null, data });
  };
  const openEdit = (type, item) => setEditing({ type, isNew: false, originalId: item.id, data: JSON.parse(JSON.stringify(item)) });
  const closeEditor = () => setEditing(null);

  const saveEditing = () => {
    if (!editing) return;
    const { type, isNew, originalId, data } = editing;
    if (!data.id || !data.id.trim()) { showToast("Укажите id перед сохранением", "error"); return; }
    const setter = setterFor(type);
    setter(prev => {
      if (isNew) return [...prev, data];
      return prev.map(x => (x.id === originalId ? data : x));
    });
    showToast(isNew ? "Запись добавлена" : "Изменения сохранены");
    setEditing(null);
  };
  const duplicateItem = (type, item) => {
    const copy = JSON.parse(JSON.stringify(item));
    copy.id = nextId(prefixFor(type), listFor(type).map(x => x.id));
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
                    <div className="cell-title">{nameOfDoctor(o.doctor_id) || "врач не выбран"} — {nameOfService(o.service_id) || "услуга не выбрана"}</div>
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

/* ============================================================
   ENTITY TABLE
   ============================================================ */
function EntityTable({ title, type, items, onSearch, searchValue, onAdd, onEdit, onDuplicate, onDelete, columns, issueCountFor, emptyIcon: EmptyIcon, emptyTitle, emptyText }) {
  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={14} />
          <input className="ipt" placeholder={`Поиск по ${title.toLowerCase()}…`} value={searchValue} onChange={e => onSearch(e.target.value)} />
        </div>
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
   ============================================================ */
function EditorDrawer({ editing, setEditing, onClose, onSave, services, clinics, doctors }) {
  const { type, isNew, data } = editing;
  const update = patch => setEditing({ ...editing, data: { ...data, ...patch } });

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
          <button className="btn btn-accent" onClick={onSave}><Save size={14} /> Сохранить</button>
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
