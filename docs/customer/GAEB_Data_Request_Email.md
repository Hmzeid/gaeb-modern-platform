# Cover email — GAEB Data Request Pack (send with the pack attached)

Subject: GAEB Modern Platform — data request for the School Map migration pilot

Dear [GAEB technical lead name],

The modern platform for GAEB is built and verified end to end on synthetic IBM i
data. To run the first customer-witnessed migration on real data, we request the
extracts and evidence in the attached Data Request Pack.

The initial scope is deliberately narrow: the School Map building register
(PBLBULDG) and its reference files, with the metadata, record counts, and control
totals listed in the pack. The extraction guide (attached) covers the supported
formats — including an important note that IBM i save files are not directly
readable and follow a restore-then-extract route — and the exact information we
need per file so the migration reconciles to the piastre.

We also list the open evidence items that unblock the remaining subsystems
(Budget master DDS, the authoritative INV001PF definition, the Estimates item
master, and three business-rule confirmations), so your team can answer them in
the same round.

Nothing will be loaded into operational tables without GAEB-approved mappings,
and every batch returns a reconciliation report: source count equals loaded plus
quarantined, with each quarantined record itemized.

We would appreciate a named technical contact on your side for the extraction
questions. A 30-minute call this week would let us confirm formats and CCSIDs
before the first delivery.

Regards,
[Name], Veebase LLC — GAEB Modern Platform programme

---

الموضوع: منصة GAEB الحديثة — طلب بيانات تجربة ترحيل الخريطة المدرسية

مرفق حزمة طلب البيانات اللازمة لتنفيذ أول ترحيل ببيانات فعلية بحضور الهيئة:
استخراج ملف سجل المباني PBLBULDG وملفاته المرجعية مع البيانات الوصفية وأعداد
السجلات والإجماليات الرقابية، ودليل الاستخراج للفريق الفني (مع تنبيه صريح أن
ملفات الحفظ لا تُقرأ مباشرة ولها مسار استعادة ثم استخراج)، وبنود الأدلة المفتوحة
لبقية المنظومات. لن يُحمَّل أي بيان إلى الجداول التشغيلية دون ربط معتمد من
الهيئة، وكل دفعة تُسلَّم بتقرير مطابقة كامل.
