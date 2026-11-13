// Bilingual strings for the GAEB Modern Platform. English is the source;
// Arabic is written natively (not translated word-for-word) and reviewed
// against the legacy system's own terminology where the POC exposed it.
const EN = {
    title: "GAEB Modern Platform", authority: "General Authority for Educational Buildings",
    login: "Sign in", user: "Username", pass: "Password", logout: "Sign out", role: "Role",
    welcome: "Welcome back", err: "Error", loading: "Loading…", save: "Save", cancel: "Cancel",
    create: "Create", advance: "Advance", search: "Search buildings, tenders, certificates…",
    viewAll: "View all", actions: "Actions", status: "Status", total: "Total", back: "Back",
    // navigation
    nav_overview: "Portfolio Overview", nav_geo: "Geographic Intelligence", nav_dash: "Overview",
    nav_map: "School Map", nav_budget: "Budget", nav_tenders: "Tenders & Contracts",
    nav_certs: "Payment Certificates", nav_estimates: "Estimates & BOQ", nav_estate: "Real Estate",
    nav_reports: "Reports & Analytics", nav_migration: "Migration Center", nav_admin: "Administration",
    grp_exec: "Executive", grp_ops: "Operations", grp_gov: "Governance",
    // overview
    ov_sub: "Executive snapshot of investment, delivery and risk",
    allDirectorates: "All Directorates", fiscalYear: "Fiscal Year",
    tab_summary: "Executive Summary", tab_health: "Portfolio Health", tab_fin: "Financials", tab_del: "Delivery & Stages", tab_risk: "Risks",
    k_buildings: "Total buildings", k_invest: "Total investment", k_tenders: "Active tenders",
    k_paid: "Certificates paid", k_exec: "Budget execution", k_cases: "Expropriation cases", k_estimates: "Open estimates",
    vs_prev: "of allocated budget", certified: "Certified", allocated: "Allocated", committed: "Committed",
    spent: "Spent", available: "Available", atRisk: "At risk", notStarted: "Not yet started",
    inv_by_sub: "Investment by subsystem", module_health: "Module health", tenders_by_stage: "Tenders by stage",
    budget_real: "Budget realization", recent: "Recent activity", queues: "Action queues",
    in_pipeline: "in pipeline", in_execution: "in execution", open_financials: "Open financials",
    view_modules: "View all modules", view_stages: "View all stages", view_activity: "View all activity",
    q_certs: "Certificates in draft", q_est: "Estimates awaiting review", q_appr: "Active mapping approvals",
    health_on: "On track", health_risk: "At risk", health_over: "Overdue",
    no_money: "Money figures require the finance-report permission.",
    // geo
    geo_sub: "School infrastructure across 27 governorates — planning, monitoring and decision support",
    geo_map: "Buildings by governorate — bubble size = portfolio", geo_alerts: "Regional alerts",
    geo_rank: "Top governorates by portfolio", geo_risk: "Portfolio risk distribution",
    geo_cov: "Migration coverage", covered: "Governorates covered", migrated: "Migrated & reconciled",
    risk_level: "Risk level (overall)", schematic: "Schematic plot on real coordinates — production binds an official Egypt boundary set.",
    // modules
    gross: "Gross", ded: "Deductions", net: "Net", kind: "Kind", qty: "Qty", price: "Price",
    retention: "Retention %", payRef: "Payment ref", newCert: "New certificate",
    nameEn: "Name (EN)", nameAr: "Name (AR)", blcd: "Legacy code (BLCD)", buildings: "Buildings",
    governorate: "Governorate", village: "Village code", region: "Regional centre",
    fy: "Fiscal year", chapter: "Chapter", item: "Item",
    tenderTitle: "Tender title", stage: "Stage", legacyRef: "Legacy ref",
    cases: "Expropriation cases", decree: "Decree no.", decreeDate: "Decree date", gazette: "Gazette no.",
    recordDecree: "Record decree", compensation: "Compensation",
    catalogue: "Item catalogue", code: "Code", unit: "Unit", revision: "Rev.",
    newBuilding: "New building", newAlloc: "New allocation", newTender: "New tender", newCase: "New case",
    newEstimate: "New estimate", estTitle: "Estimate title", returnDraft: "Return to draft",
    budget_util: "Budget utilization", cert_summary: "Certificates summary", buildings_by_gov: "Buildings by governorate",
    download_csv: "Download CSV", count: "Count", utilization: "Utilization %",
    // migration
    migration: "Migration Center", preview: "Preview decode", runImport: "Run import",
    batches: "Import batches", rejects: "Quarantined records", resubmit: "Resubmit corrected",
    transform: "Run transform", approvals: "Mapping approvals", inventory: "Legacy inventory",
    chooseFile: "IBM i extract file", viewInModule: "View in School Map",
    live_monitor: "Live import monitor", watch: "Watch", stop: "Stop", processed: "processed",
    accepted: "accepted", quarantined: "quarantined", operations: "Operations",
    reconciliation: "Reconciliation", intake: "Intake pipeline", registerDataset: "Register received dataset",
    audit: "Audit trail", member: "Member", class: "Class", by: "By", evidence: "Evidence",
    approvedBy: "Approved by", field: "Field", layout: "Layout", batch: "Batch",
    approve_new: "New approval", revoke: "Revoke", mode: "Mode", reason: "Reason",
    jobs: "Import jobs", claim: "Claim", transition: "Transition", state: "State",
    source: "Source", equation: "Count equation holds", duplicates: "Duplicate occurrences preserved",
    runs: "Runs", control_totals: "Control totals", source_totals: "Source totals",
    objects: "legacy objects", transformName: "Transform",
    // statuses
    st_draft: "Draft", st_certified: "Certified", st_billed: "Billed", st_payment_authorized: "Payment authorized", st_paid: "Paid",
    st_booklet: "Booklet", st_published: "Published", st_bids_open: "Bids open", st_bids_closed: "Bids closed",
    st_exclusion_review: "Exclusion review", st_envelope_committee: "Envelope committee",
    st_financial_evaluation: "Financial evaluation", st_award_committee: "Award committee",
    st_negotiation: "Negotiation", st_awarded: "Awarded", st_contracted: "Contracted",
    st_reviewed: "Reviewed", st_approved: "Approved", st_pre_decree: "Pre-decree", st_post_decree: "Post-decree",
    st_construction: "Construction", st_maintenance: "Maintenance",
    empty: "Nothing here yet.", admin_users: "Signed in as", session: "Session",
    footer_note: "Every figure on this page comes from the live platform APIs.",
    lang: "العربية",
};
const AR: typeof EN = {
    title: "منصة الهيئة العامة للأبنية التعليمية الحديثة", authority: "الهيئة العامة للأبنية التعليمية",
    login: "تسجيل الدخول", user: "اسم المستخدم", pass: "كلمة المرور", logout: "تسجيل الخروج", role: "الدور",
    welcome: "مرحباً بعودتك", err: "خطأ", loading: "جارٍ التحميل…", save: "حفظ", cancel: "إلغاء",
    create: "إنشاء", advance: "تقديم", search: "ابحث في المباني والمناقصات والمستخلصات…",
    viewAll: "عرض الكل", actions: "إجراءات", status: "الحالة", total: "الإجمالي", back: "رجوع",
    nav_overview: "نظرة عامة على المحفظة", nav_geo: "الذكاء الجغرافي", nav_dash: "نظرة عامة",
    nav_map: "الخريطة المدرسية", nav_budget: "الموازنة", nav_tenders: "المناقصات والعقود",
    nav_certs: "المستخلصات", nav_estimates: "المقايسات", nav_estate: "الملكية العقارية",
    nav_reports: "التقارير والتحليلات", nav_migration: "مركز الترحيل", nav_admin: "الإدارة",
    grp_exec: "التنفيذي", grp_ops: "العمليات", grp_gov: "الحوكمة",
    ov_sub: "لقطة تنفيذية للاستثمار والتسليم والمخاطر",
    allDirectorates: "كل المديريات", fiscalYear: "السنة المالية",
    tab_summary: "الملخص التنفيذي", tab_health: "سلامة المحفظة", tab_fin: "الماليات", tab_del: "التسليم والمراحل", tab_risk: "المخاطر",
    k_buildings: "إجمالي المباني", k_invest: "إجمالي الاستثمار", k_tenders: "المناقصات النشطة",
    k_paid: "مستخلصات مدفوعة", k_exec: "تنفيذ الموازنة", k_cases: "قضايا نزع الملكية", k_estimates: "مقايسات مفتوحة",
    vs_prev: "من الموازنة المعتمدة", certified: "معتمد", allocated: "المعتمد", committed: "المرتبط",
    spent: "المنصرف", available: "المتاح", atRisk: "في خطر", notStarted: "لم يبدأ بعد",
    inv_by_sub: "الاستثمار حسب النظام الفرعي", module_health: "سلامة الوحدات", tenders_by_stage: "المناقصات حسب المرحلة",
    budget_real: "تحقق الموازنة", recent: "النشاط الأخير", queues: "قوائم الإجراءات",
    in_pipeline: "قيد الإعداد", in_execution: "قيد التنفيذ", open_financials: "فتح الماليات",
    view_modules: "عرض كل الوحدات", view_stages: "عرض كل المراحل", view_activity: "عرض كل النشاط",
    q_certs: "مستخلصات في المسودة", q_est: "مقايسات بانتظار المراجعة", q_appr: "اعتمادات ربط نشطة",
    health_on: "على المسار", health_risk: "في خطر", health_over: "متأخر",
    no_money: "الأرقام المالية تتطلب صلاحية تقارير الماليات.",
    geo_sub: "البنية المدرسية عبر ٢٧ محافظة — تخطيط ومتابعة ودعم قرار",
    geo_map: "المباني حسب المحافظة — حجم الفقاعة = حجم المحفظة", geo_alerts: "تنبيهات إقليمية",
    geo_rank: "أعلى المحافظات حسب المحفظة", geo_risk: "توزيع مخاطر المحفظة",
    geo_cov: "تغطية الترحيل", covered: "المحافظات المغطاة", migrated: "مُرحَّل ومُطابَق",
    risk_level: "مستوى المخاطر (عام)", schematic: "رسم تخطيطي على إحداثيات حقيقية — في الإنتاج يُربط بمجموعة حدود رسمية لمصر.",
    gross: "الإجمالي", ded: "الاستقطاعات", net: "الصافي", kind: "النوع", qty: "الكمية", price: "السعر",
    retention: "نسبة الاحتجاز %", payRef: "مرجع السداد", newCert: "مستخلص جديد",
    nameEn: "الاسم (إنجليزي)", nameAr: "الاسم (عربي)", blcd: "الكود القديم", buildings: "المباني",
    governorate: "المحافظة", village: "كود القرية", region: "المركز الإقليمي",
    fy: "السنة المالية", chapter: "الباب", item: "البند",
    tenderTitle: "عنوان المناقصة", stage: "المرحلة", legacyRef: "المرجع القديم",
    cases: "قضايا نزع الملكية", decree: "رقم القرار", decreeDate: "تاريخ القرار", gazette: "رقم الجريدة الرسمية",
    recordDecree: "تسجيل القرار", compensation: "التعويض",
    catalogue: "دليل البنود", code: "الكود", unit: "الوحدة", revision: "مراجعة",
    newBuilding: "مبنى جديد", newAlloc: "اعتماد جديد", newTender: "مناقصة جديدة", newCase: "قضية جديدة",
    newEstimate: "مقايسة جديدة", estTitle: "عنوان المقايسة", returnDraft: "إرجاع إلى المسودة",
    budget_util: "استخدام الموازنة", cert_summary: "ملخص المستخلصات", buildings_by_gov: "المباني حسب المحافظة",
    download_csv: "تنزيل CSV", count: "العدد", utilization: "نسبة الاستخدام %",
    migration: "مركز الترحيل", preview: "معاينة فك الترميز", runImport: "تشغيل الاستيراد",
    batches: "دفعات الاستيراد", rejects: "السجلات المعزولة", resubmit: "إعادة إرسال بعد التصحيح",
    transform: "تشغيل التحويل", approvals: "اعتمادات الربط", inventory: "جرد النظام القديم",
    chooseFile: "ملف استخراج IBM i", viewInModule: "عرض في الخريطة المدرسية",
    live_monitor: "مراقبة الاستيراد المباشرة", watch: "مراقبة", stop: "إيقاف", processed: "تمت معالجتها",
    accepted: "مقبولة", quarantined: "معزولة", operations: "العمليات",
    reconciliation: "المطابقة", intake: "خط الإدخال", registerDataset: "تسجيل مجموعة بيانات واردة",
    audit: "سجل التدقيق", member: "العضو", class: "الفئة", by: "بواسطة", evidence: "الدليل",
    approvedBy: "اعتمدها", field: "الحقل", layout: "التخطيط", batch: "الدفعة",
    approve_new: "اعتماد جديد", revoke: "إلغاء الاعتماد", mode: "الوضع", reason: "السبب",
    jobs: "مهام الاستيراد", claim: "استلام", transition: "نقل الحالة", state: "الحالة",
    source: "المصدر", equation: "معادلة العدد سليمة", duplicates: "حالات التكرار محفوظة",
    runs: "التشغيلات", control_totals: "مجاميع الرقابة", source_totals: "مجاميع المصدر",
    objects: "عنصر قديم", transformName: "التحويل",
    st_draft: "مسودة", st_certified: "معتمد", st_billed: "مُفوتر", st_payment_authorized: "مأذون بالصرف", st_paid: "مدفوع",
    st_booklet: "كراسة الشروط", st_published: "منشورة", st_bids_open: "فتح المظاريف", st_bids_closed: "إغلاق التقديم",
    st_exclusion_review: "فحص الاستبعاد", st_envelope_committee: "لجنة المظاريف",
    st_financial_evaluation: "التقييم المالي", st_award_committee: "لجنة البت",
    st_negotiation: "التفاوض", st_awarded: "تمت الترسية", st_contracted: "تم التعاقد",
    st_reviewed: "تمت المراجعة", st_approved: "معتمد نهائياً", st_pre_decree: "قبل القرار", st_post_decree: "بعد القرار",
    st_construction: "إنشاءات", st_maintenance: "صيانة",
    empty: "لا يوجد شيء هنا بعد.", admin_users: "مسجل باسم", session: "الجلسة",
    footer_note: "كل رقم في هذه الصفحة يأتي من واجهات المنصة الحقيقية.",
    lang: "English",
};
export const T = { en: EN, ar: AR };
export type Lang = keyof typeof T;
export type Strs = typeof EN;

/** Status → chip tone, the one mapping every screen uses. */
export function statusTone(s: string): "ok" | "warn" | "info" | "bad" | "mut" | "vio" {
  switch (s) {
    case "paid": case "approved": case "contracted": case "awarded": case "active": case "accepted": case "COMPLETED": return "ok";
    case "certified": case "reviewed": case "billed": case "payment_authorized": case "post_decree": return "info";
    case "draft": case "pre_decree": case "QUEUED": return "mut";
    case "rejected": case "FAILED": case "revoked": return "bad";
    default: return "warn";
  }
}

/** Tender stage order (mirrors the server state machine). */
export const TENDER_STAGES = ["draft", "booklet", "published", "bids_open", "bids_closed", "exclusion_review",
  "envelope_committee", "financial_evaluation", "award_committee", "negotiation", "awarded", "contracted"];
export const CERT_STAGES = ["draft", "certified", "billed", "payment_authorized", "paid"];
export const EST_STAGES = ["draft", "reviewed", "approved"];
export const CERT_NEXT: Record<string, string> = { draft: "certified", certified: "billed", billed: "payment_authorized", payment_authorized: "paid" };
export const TENDER_NEXT: Record<string, string> = Object.fromEntries(TENDER_STAGES.slice(0, -1).map((s, i) => [s, TENDER_STAGES[i + 1]]));
export const INTAKE_STAGES = ["received", "registered", "verified", "profiled", "mapped", "approved", "imported", "reconciled", "reviewed", "accepted"];
