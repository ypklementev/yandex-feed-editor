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


export { parseFeedXML, buildXML };
