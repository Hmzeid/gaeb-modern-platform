// One-time seed for the GAEB migration POC. Runs only when the users table
// is empty (checked by the ensureSeed action), so user edits are never
// overwritten.
import type { Ctx } from "@hatch/space-sdk";
import * as schema from "./schema";

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`gaeb::${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function seedAll(ctx: Ctx): Promise<void> {
  const db = ctx.db<typeof schema>();

  // ---- Users ----
  const userRows = [
    { username: "admin", password: "admin123", nameEn: "System Administrator", nameAr: "مدير النظام", role: "admin" as const },
    { username: "budget", password: "budget123", nameEn: "Mona Adel — Budget Officer", nameAr: "منى عادل — مسؤول الموازنة", role: "budget" as const },
    { username: "contracts", password: "contracts123", nameEn: "Karim Samy — Contracts Officer", nameAr: "كريم سامي — مسؤول العقود", role: "contracts" as const },
    { username: "technical", password: "tech123", nameEn: "Sherif Nabil — Technical Officer", nameAr: "شريف نبيل — مسؤول فني", role: "technical" as const },
    { username: "viewer", password: "viewer123", nameEn: "Omar Fathy — Viewer", nameAr: "عمر فتحي — مشاهد", role: "viewer" as const },
  ];
  for (const u of userRows) {
    await db.insert(schema.users).values({
      username: u.username,
      passwordHash: await hashPassword(u.password),
      nameEn: u.nameEn,
      nameAr: u.nameAr,
      role: u.role,
    });
  }

  // ---- Reference data ----
  const govData: Array<[string, string, string]> = [
    ["CAI", "Cairo", "القاهرة"],
    ["GIZ", "Giza", "الجيزة"],
    ["ALX", "Alexandria", "الإسكندرية"],
    ["DAK", "Dakahlia", "الدقهلية"],
    ["SHR", "Sharqia", "الشرقية"],
    ["GHR", "Gharbia", "الغربية"],
    ["QAL", "Qalyubia", "القليوبية"],
    ["MNF", "Monufia", "المنوفية"],
    ["FAY", "Fayoum", "الفيوم"],
    ["ASY", "Asyut", "أسيوط"],
  ];
  const govIds = new Map<string, number>();
  for (const [code, en, ar] of govData) {
    const r = await db.insert(schema.governorates).values({ code, nameEn: en, nameAr: ar }).returning({ id: schema.governorates.id });
    if (r[0]) govIds.set(code, r[0].id);
  }

  const centerData: Array<[string, string, string]> = [
    ["CAI", "Nasr City", "مدينة نصر"],
    ["CAI", "Heliopolis", "مصر الجديدة"],
    ["CAI", "Maadi", "المعادي"],
    ["GIZ", "Dokki", "الدقي"],
    ["GIZ", "6th of October", "السادس من أكتوبر"],
    ["GIZ", "Imbaba", "إمبابة"],
    ["ALX", "Montaza", "المنتزه"],
    ["ALX", "Agami", "العجمي"],
    ["DAK", "Mansoura", "المنصورة"],
    ["DAK", "Talkha", "طلخا"],
    ["SHR", "Zagazig", "الزقازيق"],
    ["GHR", "Tanta", "طنطا"],
    ["QAL", "Benha", "بنها"],
    ["QAL", "Shubra El Kheima", "شبرا الخيمة"],
  ];
  const centerIds = new Map<string, number>();
  for (const [gov, en, ar] of centerData) {
    const gid = govIds.get(gov);
    if (!gid) continue;
    const r = await db.insert(schema.centers).values({ governorateId: gid, nameEn: en, nameAr: ar }).returning({ id: schema.centers.id });
    if (r[0]) centerIds.set(`${gov}:${en}`, r[0].id);
  }

  const villageData: Array<[string, string, string]> = [
    ["DAK:Mansoura", "Sandub", "سندوب"],
    ["DAK:Mansoura", "Mit Khameer", "ميت خمير"],
    ["DAK:Talkha", "Mit Sharaf", "ميت شرف"],
    ["SHR:Zagazig", "Al Ghar", "الغار"],
    ["GHR:Tanta", "Mit Hebeish", "ميت حبيش"],
    ["QAL:Benha", "Mit El Attar", "ميت العطار"],
    ["GIZ:Imbaba", "Bashtil", "بشتيل"],
    ["FAY:Fayoum City", "Qahafa", "قهافة"],
  ];
  for (const [key, en, ar] of villageData) {
    const cid = centerIds.get(key);
    if (!cid) continue;
    await db.insert(schema.villages).values({ centerId: cid, nameEn: en, nameAr: ar });
  }

  const stageData: Array<[string, string]> = [
    ["Kindergarten", "رياض أطفال"],
    ["Primary", "ابتدائي"],
    ["Preparatory", "إعدادي"],
    ["Secondary", "ثانوي"],
    ["Combined (Primary + Preparatory)", "مجمع تعليمي"],
  ];
  const stageIds = new Map<string, number>();
  for (const [en, ar] of stageData) {
    const r = await db.insert(schema.stages).values({ nameEn: en, nameAr: ar }).returning({ id: schema.stages.id });
    if (r[0]) stageIds.set(en, r[0].id);
  }

  const ownData: Array<[string, string]> = [
    ["GAEB-owned", "ملك الهيئة"],
    ["Government-owned", "ملك حكومي"],
    ["Private lease", "إيجار من القطاع الخاص"],
    ["Endowment (Waqf)", "وقف"],
  ];
  const ownIds = new Map<string, number>();
  for (const [en, ar] of ownData) {
    const r = await db.insert(schema.ownershipTypes).values({ nameEn: en, nameAr: ar }).returning({ id: schema.ownershipTypes.id });
    if (r[0]) ownIds.set(en, r[0].id);
  }

  // ---- Buildings (legacy PBLBULDG, key BLCD) ----
  type B = {
    code: string; en: string; ar: string; gov: string; center: string; stage: string;
    eduType: string; own: string; landOwner: string; plot: number; barea: number;
    floors: number; rooms: number; status: string;
  };
  const buildingData: B[] = [
    { code: "100234", en: "El Nasr Primary School", ar: "مدرسة النصر الابتدائية", gov: "CAI", center: "Nasr City", stage: "Primary", eduType: "General", own: "GAEB-owned", landOwner: "GAEB", plot: 4200, barea: 1850, floors: 3, rooms: 24, status: "active" },
    { code: "100517", en: "Heliopolis Preparatory School for Girls", ar: "مدرسة مصر الجديدة الإعدادية بنات", gov: "CAI", center: "Heliopolis", stage: "Preparatory", eduType: "General", own: "Government-owned", landOwner: "Ministry of Education", plot: 5100, barea: 2400, floors: 4, rooms: 30, status: "active" },
    { code: "200118", en: "October STEM Secondary School", ar: "مدرسة أكتوبر الثانوية للمتفوقين", gov: "GIZ", center: "6th of October", stage: "Secondary", eduType: "STEM", own: "GAEB-owned", landOwner: "GAEB", plot: 9800, barea: 4600, floors: 4, rooms: 36, status: "active" },
    { code: "200342", en: "Imbaba Combined School Complex", ar: "مجمع مدارس إمبابة التعليمي", gov: "GIZ", center: "Imbaba", stage: "Combined (Primary + Preparatory)", eduType: "General", own: "GAEB-owned", landOwner: "GAEB", plot: 7600, barea: 3900, floors: 5, rooms: 48, status: "under_construction" },
    { code: "300076", en: "Montaza Primary School", ar: "مدرسة المنتزه الابتدائية", gov: "ALX", center: "Montaza", stage: "Primary", eduType: "General", own: "Private lease", landOwner: "Private owner — leased", plot: 2600, barea: 1200, floors: 3, rooms: 18, status: "active" },
    { code: "400291", en: "Mansoura Secondary School for Boys", ar: "مدرسة المنصورة الثانوية بنين", gov: "DAK", center: "Mansoura", stage: "Secondary", eduType: "General", own: "GAEB-owned", landOwner: "GAEB", plot: 6400, barea: 3100, floors: 4, rooms: 32, status: "active" },
    { code: "400388", en: "Talkha Kindergarten", ar: "روضة طلخا", gov: "DAK", center: "Talkha", stage: "Kindergarten", eduType: "General", own: "Endowment (Waqf)", landOwner: "Ministry of Awqaf", plot: 1500, barea: 620, floors: 2, rooms: 8, status: "active" },
    { code: "500154", en: "Zagazig Preparatory School", ar: "مدرسة الزقازيق الإعدادية", gov: "SHR", center: "Zagazig", stage: "Preparatory", eduType: "Language", own: "GAEB-owned", landOwner: "GAEB", plot: 4800, barea: 2150, floors: 3, rooms: 27, status: "maintenance" },
    { code: "600209", en: "Tanta Primary School No. 4", ar: "مدرسة طنطا الابتدائية رقم ٤", gov: "GHR", center: "Tanta", stage: "Primary", eduType: "General", own: "Government-owned", landOwner: "Gharbia Governorate", plot: 3900, barea: 1740, floors: 3, rooms: 22, status: "active" },
    { code: "700167", en: "Benha New Secondary School", ar: "مدرسة بنها الثانوية الجديدة", gov: "QAL", center: "Benha", stage: "Secondary", eduType: "General", own: "GAEB-owned", landOwner: "GAEB", plot: 8200, barea: 0, floors: 0, rooms: 0, status: "planned" },
  ];
  const buildingIds = new Map<string, number>();
  for (const b of buildingData) {
    const r = await db.insert(schema.buildings).values({
      code: b.code, nameEn: b.en, nameAr: b.ar,
      governorateId: govIds.get(b.gov) ?? null,
      centerId: centerIds.get(`${b.gov}:${b.center}`) ?? null,
      villageId: null,
      stageId: stageIds.get(b.stage) ?? null,
      eduType: b.eduType,
      ownershipId: ownIds.get(b.own) ?? null,
      landOwner: b.landOwner, plotArea: b.plot, buildingArea: b.barea,
      floors: b.floors, classrooms: b.rooms, status: b.status,
    }).returning({ id: schema.buildings.id });
    if (r[0]) buildingIds.set(b.code, r[0].id);
  }

  // ---- Projects ----
  const projectData = [
    { b: "200342", en: "Imbaba Complex — Phase 2 construction", ar: "مجمع إمبابة — المرحلة الثانية", status: "in_progress", start: "2025-09-01", end: "2026-08-30", budget: 48500000, progress: 62 },
    { b: "700167", en: "Benha Secondary — new build", ar: "بنها الثانوية — إنشاء جديد", status: "planned", start: "2026-07-01", end: "2027-12-31", budget: 62000000, progress: 0 },
    { b: "500154", en: "Zagazig Preparatory — full renovation", ar: "الزقازيق الإعدادية — تطوير شامل", status: "in_progress", start: "2025-11-15", end: "2026-06-30", budget: 12800000, progress: 38 },
    { b: "100234", en: "El Nasr Primary — classroom extension", ar: "النصر الابتدائية — توسعة فصول", status: "completed", start: "2024-08-01", end: "2025-05-20", budget: 9400000, progress: 100 },
    { b: "200118", en: "October STEM — science labs fit-out", ar: "أكتوبر للمتفوقين — تجهيز معامل", status: "in_progress", start: "2026-01-10", end: "2026-09-30", budget: 15700000, progress: 45 },
  ];
  for (const p of projectData) {
    await db.insert(schema.projects).values({
      buildingId: buildingIds.get(p.b) ?? null, nameEn: p.en, nameAr: p.ar,
      status: p.status, startDate: p.start, endDate: p.end, budget: p.budget, progress: p.progress,
    });
  }

  // ---- Budget ----
  const fyData = [
    { year: "2023/2024", label: "FY 2023/2024", status: "closed" },
    { year: "2024/2025", label: "FY 2024/2025", status: "closed" },
    { year: "2025/2026", label: "FY 2025/2026", status: "open" },
  ];
  const fyIds = new Map<string, number>();
  for (const f of fyData) {
    const r = await db.insert(schema.fiscalYears).values(f).returning({ id: schema.fiscalYears.id });
    if (r[0]) fyIds.set(f.year, r[0].id);
  }
  const ch6 = "Chapter 6 — Investments (الباب السادس: الاستثمارات)";
  const ch2 = "Chapter 2 — Goods & Services (الباب الثاني: السلع والخدمات)";
  const allocData = [
    { fy: "2025/2026", ch: ch6, item: "New school construction", gov: "CAI", allocated: 412000000, spent: 268400000 },
    { fy: "2025/2026", ch: ch6, item: "New school construction", gov: "GIZ", allocated: 356000000, spent: 201750000 },
    { fy: "2025/2026", ch: ch6, item: "New school construction", gov: "DAK", allocated: 188000000, spent: 96400000 },
    { fy: "2025/2026", ch: ch6, item: "Maintenance & renovation", gov: "SHR", allocated: 96000000, spent: 71200000 },
    { fy: "2025/2026", ch: ch6, item: "Maintenance & renovation", gov: "ALX", allocated: 84000000, spent: 39800000 },
    { fy: "2025/2026", ch: ch6, item: "Land acquisition", gov: "QAL", allocated: 120000000, spent: 45000000 },
    { fy: "2025/2026", ch: ch2, item: "Technical studies & supervision", gov: "CAI", allocated: 38500000, spent: 22900000 },
    { fy: "2025/2026", ch: ch2, item: "Furniture & equipment", gov: "GHR", allocated: 27000000, spent: 8100000 },
    { fy: "2024/2025", ch: ch6, item: "New school construction", gov: "CAI", allocated: 385000000, spent: 379200000 },
    { fy: "2024/2025", ch: ch6, item: "Maintenance & renovation", gov: "GIZ", allocated: 78000000, spent: 74500000 },
  ];
  const allocIds: number[] = [];
  for (const a of allocData) {
    const r = await db.insert(schema.allocations).values({
      fiscalYearId: fyIds.get(a.fy) ?? null, chapter: a.ch, item: a.item,
      governorateId: govIds.get(a.gov) ?? null, allocated: a.allocated, spent: a.spent,
    }).returning({ id: schema.allocations.id });
    if (r[0]) allocIds.push(r[0].id);
  }
  const txnData = [
    { kind: "payment" as const, date: "2026-10-05", desc: "Certificate No. 7 — Imbaba Complex contractor payment", amount: 6850000, alloc: 1, ref: "PAY-2026-1042" },
    { kind: "receipt" as const, date: "2026-10-01", desc: "Ministry of Finance — Q1 appropriation release", amount: 150000000, alloc: 0, ref: "RCP-2026-0311" },
    { kind: "payment" as const, date: "2026-09-18", desc: "Zagazig renovation — progress payment", amount: 2940000, alloc: 3, ref: "PAY-2026-0987" },
    { kind: "payment" as const, date: "2026-09-02", desc: "Benha land acquisition — first installment", amount: 22500000, alloc: 5, ref: "PAY-2026-0910" },
    { kind: "receipt" as const, date: "2026-08-15", desc: "Appropriation carry-over from FY 2024/2025", amount: 12400000, alloc: 0, ref: "RCP-2026-0276" },
    { kind: "payment" as const, date: "2026-08-28", desc: "Supervision consultancy — August invoice", amount: 1860000, alloc: 6, ref: "PAY-2026-0899" },
  ];
  for (const t of txnData) {
    await db.insert(schema.transactions).values({
      kind: t.kind, txnDate: t.date, description: t.desc, amount: t.amount,
      allocationId: allocIds[t.alloc] ?? null, refNo: t.ref,
    });
  }

  // ---- Suppliers / Tenders / Offers / Claims ----
  const supplierData = [
    { en: "Arab Contractors (Osman Ahmed Osman & Co.)", ar: "المقاولون العرب", contact: "contracts@arabcontractors.example", tax: "200-114-556" },
    { en: "Orascom Construction", ar: "أوراسكوم للإنشاءات", contact: "bids@orascom.example", tax: "205-882-310" },
    { en: "Hassan Allam Construction", ar: "حسن علام للإنشاءات", contact: "tenders@hassanallam.example", tax: "210-447-902" },
    { en: "Nile Contracting & Building", ar: "النيل للمقاولات والبناء", contact: "info@nilecontracting.example", tax: "315-220-781" },
    { en: "Delta Furniture & School Equipment", ar: "دلتا للأثاث والتجهيزات المدرسية", contact: "sales@deltafurniture.example", tax: "410-663-208" },
    { en: "Al Safa General Supplies", ar: "الصفا للتوريدات العامة", contact: "office@alsafa.example", tax: "512-904-377" },
  ];
  const supplierIds: number[] = [];
  for (const s of supplierData) {
    const r = await db.insert(schema.suppliers).values({ nameEn: s.en, nameAr: s.ar, contact: s.contact, taxId: s.tax }).returning({ id: schema.suppliers.id });
    if (r[0]) supplierIds.push(r[0].id);
  }

  const tenderData = [
    { number: "TND-2026-014", type: "Construction", en: "Construction of Imbaba School Complex — Phase 2", ar: "إنشاء مجمع مدارس إمبابة — المرحلة الثانية", status: "awarded", open: "2026-08-10", close: "2026-09-15" },
    { number: "TND-2026-021", type: "Construction", en: "New secondary school in Benha, Qalyubia", ar: "إنشاء مدرسة ثانوية جديدة ببنها", status: "evaluation", open: "2026-10-01", close: "2026-11-05" },
    { number: "TND-2026-027", type: "Maintenance", en: "Renovation of Zagazig Preparatory School", ar: "تطوير مدرسة الزقازيق الإعدادية", status: "awarded", open: "2026-07-20", close: "2026-08-25" },
    { number: "TND-2026-033", type: "Supplies", en: "Supply of 12,000 student desks — Gharbia", ar: "توريد ١٢ ألف تختة مدرسية — الغربية", status: "open", open: "2026-10-20", close: "2026-11-25" },
    { number: "TND-2025-096", type: "Supplies", en: "Science lab equipment — STEM schools", ar: "تجهيزات معامل العلوم لمدارس المتفوقين", status: "closed", open: "2025-11-02", close: "2025-12-10" },
  ];
  const tenderIds: number[] = [];
  for (const t of tenderData) {
    const r = await db.insert(schema.tenders).values({
      number: t.number, tenderType: t.type, titleEn: t.en, titleAr: t.ar,
      status: t.status, openDate: t.open, closeDate: t.close,
    }).returning({ id: schema.tenders.id });
    if (r[0]) tenderIds.push(r[0].id);
  }
  const offerData = [
    { t: 0, s: 0, amount: 47900000, status: "accepted" },
    { t: 0, s: 2, amount: 51200000, status: "rejected" },
    { t: 0, s: 3, amount: 49850000, status: "rejected" },
    { t: 1, s: 1, amount: 63400000, status: "under_review" },
    { t: 1, s: 0, amount: 61900000, status: "under_review" },
    { t: 1, s: 3, amount: 65750000, status: "under_review" },
    { t: 2, s: 3, amount: 12400000, status: "accepted" },
    { t: 2, s: 2, amount: 13100000, status: "rejected" },
    { t: 3, s: 4, amount: 8960000, status: "submitted" },
    { t: 3, s: 5, amount: 9340000, status: "submitted" },
  ];
  for (const o of offerData) {
    const tid = tenderIds[o.t]; const sid = supplierIds[o.s];
    if (tid == null || sid == null) continue;
    await db.insert(schema.offers).values({ tenderId: tid, supplierId: sid, amount: o.amount, status: o.status });
  }
  const claimData = [
    { t: 0, s: 0, amount: 1250000, desc: "Price escalation claim — steel price increase, Phase 2", status: "under_review", date: "2026-10-12" },
    { t: 2, s: 3, amount: 340000, desc: "Additional works claim — unforeseen foundation conditions", status: "approved", date: "2026-09-30" },
    { t: 4, s: 5, amount: 96000, desc: "Late delivery penalty dispute — lab equipment lot 2", status: "open", date: "2026-01-19" },
  ];
  for (const c of claimData) {
    const tid = tenderIds[c.t]; const sid = supplierIds[c.s];
    await db.insert(schema.claims).values({
      tenderId: tid ?? null, supplierId: sid ?? null, amount: c.amount,
      description: c.desc, status: c.status, claimDate: c.date,
    });
  }

  // ---- Certificates (abstracts) ----
  const certData = [
    { no: "ABS-2026-031", b: "200342", contractor: "Arab Contractors", ref: "CNT-2026-014", type: "construction", from: "2026-09-01", to: "2026-09-30", ded: 10, status: "approved" as const, items: [["Concrete works — foundations", "m³", 420, 3850], ["Reinforcement steel", "ton", 68, 41200], ["Block masonry works", "m²", 2150, 640], ["Plastering works", "m²", 1800, 185]] as Array<[string, string, number, number]> },
    { no: "ABS-2026-034", b: "500154", contractor: "Nile Contracting & Building", ref: "CNT-2026-027", type: "maintenance", from: "2026-10-01", to: "2026-10-31", ded: 5, status: "submitted" as const, items: [["Roof waterproofing renewal", "m²", 940, 720], ["Electrical rewiring", "point", 260, 1150], ["Painting — classrooms", "m²", 3200, 95]] as Array<[string, string, number, number]> },
    { no: "ABS-2026-036", b: "200118", contractor: "Hassan Allam Construction", ref: "CNT-2026-041", type: "construction", from: "2026-10-01", to: "2026-10-31", ded: 10, status: "draft" as const, items: [["Lab benches installation", "unit", 24, 28500], ["Fume hoods", "unit", 6, 96400]] as Array<[string, string, number, number]> },
    { no: "ABS-2026-019", b: "100234", contractor: "Nile Contracting & Building", ref: "CNT-2025-118", type: "construction", from: "2026-05-01", to: "2026-05-31", ded: 10, status: "paid" as const, items: [["Extension structure works", "m²", 860, 5200], ["Finishing works", "m²", 860, 1480]] as Array<[string, string, number, number]> },
  ];
  for (const c of certData) {
    const r = await db.insert(schema.certificates).values({
      certNo: c.no, buildingId: buildingIds.get(c.b) ?? null, contractor: c.contractor,
      contractRef: c.ref, certType: c.type, periodFrom: c.from, periodTo: c.to,
      deductionsPct: c.ded, status: c.status,
    }).returning({ id: schema.certificates.id });
    const cid = r[0]?.id;
    if (cid == null) continue;
    for (const [desc, unit, qty, price] of c.items) {
      await db.insert(schema.certItems).values({ certId: cid, description: desc, unit, quantity: qty, price });
    }
  }

  // ---- Estimates ----
  const estData = [
    { no: "EST-2026-008", b: "700167", project: "Benha New Secondary School — full construction estimate", type: "construction", status: "approved", items: [["Site works & excavation", "m³", 5400, 210], ["Structural concrete", "m³", 3100, 4200], ["Finishing & joinery", "m²", 4600, 2350], ["Electrical installations", "lot", 1, 6800000], ["Sanitary installations", "lot", 1, 3950000]] as Array<[string, string, number, number]> },
    { no: "EST-2026-011", b: "500154", project: "Zagazig Preparatory — renovation estimate", type: "maintenance", status: "draft", items: [["Demolition & removal", "m²", 1200, 145], ["Roof insulation", "m²", 940, 780], ["Flooring renewal", "m²", 2100, 620]] as Array<[string, string, number, number]> },
    { no: "EST-2026-013", b: "400291", project: "Mansoura Secondary — science wing estimate", type: "construction", status: "under_review", items: [["Wing structure", "m²", 780, 6900], ["Lab services", "lot", 1, 2400000]] as Array<[string, string, number, number]> },
  ];
  for (const e of estData) {
    const r = await db.insert(schema.estimates).values({
      docNo: e.no, buildingId: buildingIds.get(e.b) ?? null, projectName: e.project,
      estType: e.type, status: e.status,
    }).returning({ id: schema.estimates.id });
    const eid = r[0]?.id;
    if (eid == null) continue;
    for (const [desc, unit, qty, price] of e.items) {
      await db.insert(schema.estimateItems).values({ estimateId: eid, description: desc, unit, quantity: qty, unitPrice: price });
    }
  }

  // ---- Real Estate ----
  const landData = [
    { code: "LND-1001", en: "Plot 14, New Benha Extension", ar: "قطعة ١٤ امتداد بنها الجديد", gov: "QAL", area: 8200, own: "GAEB", status: "allocated" },
    { code: "LND-1002", en: "Plot 7, 6th of October — Education Zone", ar: "قطعة ٧ منطقة التعليم بأكتوبر", gov: "GIZ", area: 12400, own: "GAEB", status: "allocated" },
    { code: "LND-1015", en: "Village plot — Mit Khameer, Mansoura", ar: "أرض قرية ميت خمير بالمنصورة", gov: "DAK", area: 3600, own: "Donation", status: "available" },
    { code: "LND-1021", en: "Plot 3, Tanta North", ar: "قطعة ٣ شمال طنطا", gov: "GHR", area: 5100, own: "Government", status: "under_expropriation" },
    { code: "LND-1030", en: "Plot 22, Agami, Alexandria", ar: "قطعة ٢٢ العجمي بالإسكندرية", gov: "ALX", area: 4700, own: "GAEB", status: "available" },
    { code: "LND-1044", en: "Plot 9, Zagazig East", ar: "قطعة ٩ شرق الزقازيق", gov: "SHR", area: 6900, own: "Private", status: "under_expropriation" },
  ];
  const landIds = new Map<string, number>();
  for (const l of landData) {
    const r = await db.insert(schema.lands).values({
      code: l.code, locationEn: l.en, locationAr: l.ar,
      governorateId: govIds.get(l.gov) ?? null, area: l.area, ownership: l.own, status: l.status,
    }).returning({ id: schema.lands.id });
    if (r[0]) landIds.set(l.code, r[0].id);
  }
  const leaseData = [
    { b: "300076", lessor: "Mohamed El Sayed (private owner)", rent: 486000, start: "2024-09-01", end: "2027-08-31", status: "active" },
    { b: "400388", lessor: "Ministry of Awqaf — Dakahlia", rent: 120000, start: "2023-09-01", end: "2026-08-31", status: "expiring" },
    { b: "600209", lessor: "Gharbia Governorate", rent: 0, start: "2020-01-01", end: "2030-12-31", status: "active" },
    { b: "100517", lessor: "Ministry of Education", rent: 0, start: "2019-01-01", end: "2029-12-31", status: "active" },
  ];
  for (const l of leaseData) {
    await db.insert(schema.leases).values({
      buildingId: buildingIds.get(l.b) ?? null, lessor: l.lessor, annualRent: l.rent,
      startDate: l.start, endDate: l.end, status: l.status,
    });
  }
  const expropData = [
    { caseNo: "EXP-2025-041", land: "LND-1021", owner: "Heirs of Abdel Rahman Tawfik", comp: 14800000, status: "in_court" },
    { caseNo: "EXP-2026-007", land: "LND-1044", owner: "Fatma Hassan Ali", comp: 9200000, status: "valuation" },
    { caseNo: "EXP-2024-118", land: "LND-1015", owner: "Village council — donation dispute resolved", comp: 0, status: "settled" },
  ];
  for (const e of expropData) {
    await db.insert(schema.expropriations).values({
      caseNo: e.caseNo, landId: landIds.get(e.land) ?? null, owner: e.owner,
      compensation: e.comp, status: e.status,
    });
  }

  // ---- Legacy inventory (real members from the AS/400 analysis) ----
  const legacyData: Array<[string, string, string, number, string, string, string]> = [
    ["CBABDALW", "Budget", "PF", 13, "LWYEAR, LWTAS", "Appropriations by fiscal year & chapter (باب)", "allocations"],
    ["CBABGALW", "Budget", "PF", 11, "LWYEAR, LWTAS", "Appropriation groups", "allocations"],
    ["CBARECPF", "Budget", "PF", 14, "RCPNO", "Receipts register (إيصالات)", "transactions"],
    ["CBAXX2PF", "Budget", "LF", 9, "LWYEAR", "Appropriations logical view by year", "allocations"],
    ["PBLBULDG", "School Map", "PF", 22, "BLCD", "Educational buildings master file", "buildings"],
    ["PLN105PF", "School Map", "PF", 39, "BLCD", "Building planning detail", "buildings"],
    ["SCHPF5", "School Map", "PF", 17, "BLCD", "School data file", "buildings"],
    ["PBYPARTT", "Purchases & Contracts", "PF", 34, "TYPE, TETNNO, TNSRNO", "Tender parts / priced items", "offers"],
    ["PBYTENDR", "Purchases & Contracts", "PF", 18, "TYPE, TETNNO", "Tender headers", "tenders"],
    ["PBYCLAIM", "Purchases & Contracts", "PF", 25, "CLMNO", "Supplier claims", "claims"],
    ["#BYPRTGR", "Purchases & Contracts", "PF", 13, "GRPCOD", "Tender part groups", "offers"],
    ["INV001PF", "Technical Abstracts", "PF", 12, "BLCD, SUBTYP, TTNCD, DOCCD", "Payment certificate headers (مستخلصات)", "certificates"],
    ["INVO01PF", "Technical Abstracts", "PF", 16, "BLCD, DOCCD", "Payment certificate items", "cert_items"],
    ["INM001PF", "Technical Abstracts", "PF", 10, "BLCD", "Maintenance abstracts", "certificates"],
    ["REMV01PF", "Real Estate", "PF", 21, "BLCD", "Rented buildings register", "leases"],
    ["PRC002PF", "Real Estate", "PF", 20, "LNDCOD", "Land parcels register", "lands"],
    ["PBLLND04", "Real Estate", "PF", 15, "LNDCOD", "Land location detail", "lands"],
    ["RNT003PF", "Real Estate", "PF", 14, "BLCD", "Lease contracts", "leases"],
  ];
  const legacyIds = new Map<string, number>();
  for (const [member, sub, kind, fc, keys, desc, table] of legacyData) {
    const r = await db.insert(schema.legacyFiles).values({
      member, subsystem: sub, kind, fieldCount: fc, keysText: keys, description: desc, modernTable: table,
    }).returning({ id: schema.legacyFiles.id });
    if (r[0]) legacyIds.set(member, r[0].id);
  }

  const mappingData: Record<string, Array<[string, string, string, string, string]>> = {
    PBLBULDG: [
      ["BLCD", "6A", "code", "TEXT", "Unique building code — primary key"],
      ["BLNAMEA", "40A (CCSID 420)", "name_ar", "TEXT", "Arabic name, converted from CCSID 420"],
      ["BLNAMEE", "40A", "name_en", "TEXT", "English name"],
      ["GVCOD", "3A", "governorate_id", "INTEGER FK", "Resolved via governorates lookup"],
      ["CTCOD", "4A", "center_id", "INTEGER FK", "Resolved via centers lookup"],
      ["VLCOD", "4A", "village_id", "INTEGER FK", "Resolved via villages lookup"],
      ["STGCOD", "2A", "stage_id", "INTEGER FK", "Education stage lookup"],
      ["EDUCTP", "1A", "edu_type", "TEXT", "Decoded: G=General, L=Language, S=STEM"],
      ["OWNCOD", "2A", "ownership_id", "INTEGER FK", "Ownership type lookup"],
      ["PLAREA", "9P2 (packed)", "plot_area", "REAL", "Packed decimal unpacked to numeric"],
      ["BLAREA", "9P2 (packed)", "building_area", "REAL", "Packed decimal unpacked to numeric"],
      ["FLORNO", "3S 0", "floors", "INTEGER", ""],
      ["CLSRNO", "4S 0", "classrooms", "INTEGER", ""],
      ["BLSTAT", "1A", "status", "TEXT", "Decoded: A=active, C=under construction, M=maintenance"],
    ],
    CBABDALW: [
      ["LWYEAR", "4S 0", "fiscal_year_id", "INTEGER FK", "Hijri-format year converted to FY lookup"],
      ["LWTAS", "2A", "chapter", "TEXT", "Chapter (باب) code decoded to chapter label"],
      ["LWITEM", "30A", "item", "TEXT", "Budget item description"],
      ["LWGOV", "3A", "governorate_id", "INTEGER FK", "Governorate lookup by code"],
      ["LWAMT", "13P 2 (packed)", "allocated", "REAL", "Appropriation amount, packed decimal unpacked"],
      ["LWSPNT", "13P 2 (packed)", "spent", "REAL", "Disbursed amount to date"],
    ],
    PBYPARTT: [
      ["TYPE", "2A", "tender_type", "TEXT", "Tender category code"],
      ["TETNNO", "6S 0", "tender_id", "INTEGER FK", "Composite key part 1 → tenders"],
      ["TNSRNO", "4S 0", "id", "INTEGER", "Part serial within tender"],
      ["PRTDSC", "50A", "description", "TEXT", "Part / item description"],
      ["PRTQTY", "9P 2", "quantity", "REAL", ""],
      ["PRTPRC", "11P 2", "amount", "REAL", "Offered price"],
    ],
    INV001PF: [
      ["BLCD", "6A", "building_id", "INTEGER FK", "Building lookup by BLCD"],
      ["SUBTYP", "1A", "cert_type", "TEXT", "Decoded: C=construction, M=maintenance"],
      ["TTNCD", "4A", "contract_ref", "TEXT", "Contractor / contract code"],
      ["DOCCD", "5S 0", "cert_no", "TEXT", "Certificate document number"],
      ["AMTGROS", "13P 2", "gross (computed)", "REAL", "Recomputed from items on load"],
      ["DEDUPCT", "5P 2", "deductions_pct", "REAL", "Retention / deductions percentage"],
      ["DOCSTAT", "1A", "status", "TEXT", "Workflow: draft → submitted → approved → paid"],
    ],
    PRC002PF: [
      ["LNDCOD", "6A", "code", "TEXT", "Land parcel code — primary key"],
      ["LNDLOC", "40A", "location_en", "TEXT", ""],
      ["LNDLOCA", "40A (CCSID 420)", "location_ar", "TEXT", "Arabic location, CCSID 420 conversion"],
      ["LNDGOV", "3A", "governorate_id", "INTEGER FK", "Governorate lookup"],
      ["LNDAREA", "11P 2", "area", "REAL", "Area in m²"],
      ["LNDOWN", "20A", "ownership", "TEXT", ""],
      ["LNDSTAT", "1A", "status", "TEXT", "Decoded status"],
    ],
  };
  for (const [member, rows] of Object.entries(mappingData)) {
    const fid = legacyIds.get(member);
    if (!fid) continue;
    for (const [lf, lt, mc, mt, notes] of rows) {
      await db.insert(schema.fieldMappings).values({
        legacyFileId: fid, legacyField: lf, legacyType: lt, modernColumn: mc, modernType: mt, notes,
      });
    }
  }

  // ---- Staging rows for migration jobs ----
  const stagingB = [
    { blcd: "800101", en: "Shubra Primary School", ar: "مدرسة شبرا الابتدائية", gov: "QAL", stage: "Primary", plot: 3300, rooms: 20 },
    { blcd: "800102", en: "Maadi Secondary School", ar: "مدرسة المعادي الثانوية", gov: "CAI", stage: "Secondary", plot: 5900, rooms: 28 },
    { blcd: "800103", en: "Fayoum Preparatory School", ar: "مدرسة الفيوم الإعدادية", gov: "FAY", stage: "Preparatory", plot: 4100, rooms: 24 },
    { blcd: "800104", en: "Asyut Primary School No. 2", ar: "مدرسة أسيوط الابتدائية رقم ٢", gov: "ASY", stage: "Primary", plot: 2900, rooms: 16 },
    { blcd: "100234", en: "El Nasr Primary School (duplicate)", ar: "مدرسة النصر — سجل مكرر", gov: "CAI", stage: "Primary", plot: 4200, rooms: 24 },
    { blcd: "800199", en: "Unknown Governorate School", ar: "مدرسة بمحافظة غير معروفة", gov: "ZZZ", stage: "Primary", plot: 2000, rooms: 10 },
  ];
  for (const s of stagingB) {
    await db.insert(schema.stagingBuildings).values({
      blcd: s.blcd, nameEn: s.en, nameAr: s.ar, govCode: s.gov, stageName: s.stage,
      plotArea: s.plot, classrooms: s.rooms, loaded: 0,
    });
  }
  const stagingBud = [
    { lwyear: "2025", lwtas: "06", item: "New school construction", gov: "MNF", amount: 64000000 },
    { lwyear: "2025", lwtas: "06", item: "Maintenance & renovation", gov: "ASY", amount: 31000000 },
    { lwyear: "2025", lwtas: "02", item: "Furniture & equipment", gov: "FAY", amount: 11500000 },
    { lwyear: "2025", lwtas: "06", item: "New school construction", gov: "CAI", amount: -500000 },
    { lwyear: "2025", lwtas: "06", item: "Land acquisition", gov: "XXX", amount: 8000000 },
  ];
  for (const s of stagingBud) {
    await db.insert(schema.stagingBudget).values({
      lwyear: s.lwyear, lwtas: s.lwtas, item: s.item, govCode: s.gov, amount: s.amount, loaded: 0,
    });
  }

  // ---- Module migration status ----
  const statusData: Array<[string, string, number]> = [
    ["dashboard", "migrated", 100],
    ["reference", "migrated", 100],
    ["schoolmap", "in_progress", 72],
    ["budget", "in_progress", 64],
    ["purchases", "in_progress", 48],
    ["certificates", "planned", 30],
    ["estimates", "planned", 22],
    ["realestate", "in_progress", 55],
  ];
  for (const [key, status, percent] of statusData) {
    await db.insert(schema.moduleStatus).values({ key, status, percent });
  }

  await db.insert(schema.auditLog).values({
    username: "system",
    action: "seed",
    entity: "platform",
    entityLabel: "GAEB Modern Platform",
    details: "Initial seed: users, reference data, module starter data, legacy inventory, staging rows.",
  });
}
