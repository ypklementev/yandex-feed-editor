import { SPECIALITIES } from "../data/feedData";
import { dupeMap } from "./feedHelpers";

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

    // Для каждой связки "врач + клиника + специальность"
    // должна существовать хотя бы одна базовая услуга.
    //
    // Именно эту связку проверяет Яндекс.
    // Например:
    // doctor=35 + clinic=3 + speciality=физиотерапевт
    // должен иметь хотя бы один offer с is_base_service=true.
    const baseServiceGroups = new Set();

    offers.forEach(o => {
        if (
            o.doctor_id &&
            o.clinic_id &&
            o.speciality &&
            o.is_base_service
        ) {
            const key = `${o.doctor_id}::${o.clinic_id}::${o.speciality}`;
            baseServiceGroups.add(key);
        }
    });

    // Собираем все реально существующие связки
    // "врач + клиника + специальность" из offers.
    const doctorClinicSpecialities = new Map();

    offers.forEach(o => {
        if (!o.doctor_id || !o.clinic_id || !o.speciality) return;

        const key = `${o.doctor_id}::${o.clinic_id}::${o.speciality}`;

        if (!doctorClinicSpecialities.has(key)) {
            doctorClinicSpecialities.set(key, {
                doctor_id: o.doctor_id,
                clinic_id: o.clinic_id,
                speciality: o.speciality
            });
        }
    });

    // Для каждой связки проверяем наличие хотя бы одного
    // offer с is_base_service=true.
    doctorClinicSpecialities.forEach(({ doctor_id, clinic_id, speciality }, key) => {
        if (baseServiceGroups.has(key)) return;

        const doctor = doctorById.get(doctor_id);
        const clinic = clinicById.get(clinic_id);

        const doctorLabel = doctor?.name || `врач ${doctor_id}`;
        const clinicLabel = clinic?.name || `клиника ${clinic_id}`;

        err(
            "Предложения",
            `${doctor_id}_${clinic_id}_${speciality}`,
            `${doctorLabel} — ${clinicLabel}: для специальности "${speciality}" не указана базовая услуга (is_base_service=true)`
        );
    });

    return { errors, warnings };
}


export { validateFeed };
