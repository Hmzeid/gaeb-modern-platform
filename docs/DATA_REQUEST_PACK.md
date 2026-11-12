# GAEB Customer Data Request Pack — IBM i (AS/400) Migration POC
# حزمة طلب بيانات العميل — إثبات مفهوم ترحيل بيانات IBM i

**From:** Veebase LLC — GAEB Modern Enterprise Platform programme
**To:** GAEB IBM i technical team
**Subject:** Data and evidence required to execute a real-data migration proof of concept
**Status of this document:** Request pack only. No customer data has been migrated yet.
Nothing in this pack assumes facts about GAEB's live system; every item below is a
request for GAEB to confirm or supply. Example commands are standard IBM i V6R1
commands, provided for convenience — GAEB's operator should confirm them against the
actual installation (library names, authorities, and job queues) before use.

---

## 1. Purpose

The replacement platform's migration engine is built and tested end-to-end against
synthetic IBM i-format extracts. To prove it against real GAEB data we request a
controlled extract of the **School Map** subsystem first (the shared building
register), followed by the evidence items in §6 that unblock the other subsystems.

## 2. Files requested — initial School Map migration (library NEWLIBGAEB)

Core register and its direct dependencies (physical files):

| File | Role in migration |
|---|---|
| PBLBULDG | Building register — the primary migration target |
| PBLGOVCD *(requested if present under this or a similar name)* | Governorate codes |
| Reference/code files feeding PBLBULDG: centre, village and village-dependency, educational-administration, education-stage, and land-owner tables as present on the live system (the delivered source archive referenced exports of ~388 centres, ~6,116 villages, ~35,449 village dependencies, ~292 administrations, 45 stages, ~28 owner bodies — please confirm the live member names) | Referential integrity for the building register |

The full School Map physical-file set identified from the delivered sources (47
members) is listed in the appendix; the initial POC needs only the rows above, but
DDS for the full set is requested in §5 for coverage verification.

## 3. Specific evidence blockers (must be answered by GAEB)

1. **B-01 — Budget master DDS (PBA3\*):** the delivered archive contains only logical
   files over the PBA3\* Budget masters. Please supply the physical-file DDS (or
   DSPFFD output) for every PBA3\* master, or the masters themselves in the extract.
   Without them the Budget subsystem cannot be converted or equivalence-tested.
2. **B-02 — INV001PF authoritative definition:** the delivered sources contain three
   definitions of INV001PF that are not identical (BIL02SRC vs NGHADA variants).
   Please confirm which definition is authoritative on the live system (DSPFFD output
   from the live file settles this).
3. **B-13 — Estimates item-master DDS:** the Estimates subsystem was delivered as
   programs only; the physical file holding the item catalogue was not identified.
   Please identify it and supply its DDS.
4. **B-03/B-04/B-08 — business-rule reference results:** CHKDIG algorithm/source;
   the exact CHK5DAYS working-day rule and calendar; the full CUTKND deduction-kind
   enumeration with each kind's formula. For each rule we also request a small set of
   worked examples from the live system (inputs → outputs) so equivalence can be
   tested, not assumed.

## 4. Required metadata for every extracted file

- DDS source member (or DSPFFD + DSPFD output) for the file **as it exists live**
- Record format name and record length
- The CCSID of the file, and of any field whose CCSID differs from the file CCSID
  (Arabic text fields in particular — correct decoding depends on this)
- Record count on the live system at extract time
- For files carrying money: a control total per money field, computed on the live
  system at extract time (e.g. SUM over the field), so the migration can be
  reconciled to the piastre
- Extract timestamp and the job/user that produced it

## 5. Supported export formats (in order of preference)

1. **Native binary record images** (preferred for data containing packed/zoned
   decimals): a save file (SAVOBJ/SAVLIB) or a raw stream-file copy of the physical
   file's records. Packed and zoned fields must arrive as their native bytes.
2. **Fixed-format text** via CPYTOIMPF to a stream file with an explicit stream-file
   code page. NOTE: CPYTOIMPF converts packed/zoned fields to character text — it
   does **not** emit native packed bytes. If this route is used, tell us the exact
   CPYTOIMPF parameters (delimiters, code page, decimal point) so the layout can be
   verified before loading.
3. **Delimited text (CSV)** via CPYTOIMPF with string/field delimiters and a stated
   code page — same note as (2).

Example commands (standard V6R1; confirm on your system before use):
```
DSPFFD FILE(NEWLIBGAEB/PBLBULDG) OUTPUT(*OUTFILE) OUTFILE(QTEMP/FFDOUT)
DSPFD  FILE(NEWLIBGAEB/PBLBULDG) OUTPUT(*OUTFILE) OUTFILE(QTEMP/FDOUT)
CPYTOIMPF FROMFILE(NEWLIBGAEB/PBLBULDG) TOSTMF('/tmp/pblbuldg.txt') +
          STMFCODPAG(420) RCDDLM(*CRLF) DTAFMT(*FIXED)
SAVOBJ OBJ(PBLBULDG) LIB(NEWLIBGAEB) DEV(*SAVF) SAVF(QGPL/GAEBEXT) TGTRLS(*CURRENT)
```
No command above writes to or alters production data. Veebase will never write to
the source system; if direct extraction is approved instead, we request a
**read-only** profile with authority limited to the named library and files.

## 6. Data protection and transfer

- Extracts may be anonymized for personal data (names of individuals) using a
  consistent substitution GAEB controls; structural and financial fields must remain
  exact, or reconciliation becomes impossible.
- Transfer over an encrypted channel agreed with GAEB; checksum (SHA-256) per file
  supplied alongside; Veebase confirms receipt checksums before any processing.
- Extracts are used for the migration POC only, stored encrypted, and deleted or
  returned at GAEB's instruction after the POC.

## 7. Customer validation checklist (GAEB sign-off per item)

- [ ] Extracted file list matches §2; member names confirmed or corrected
- [ ] DSPFFD/DSPFD metadata supplied for each file (§4)
- [ ] CCSIDs confirmed per file/field (§4)
- [ ] Record counts and money control totals supplied (§4)
- [ ] B-01 PBA3\* DDS supplied; B-02 INV001PF definition confirmed; B-13 item master identified
- [ ] Business-rule worked examples supplied (B-03, B-04, B-08)
- [ ] Export format and parameters confirmed (§5)
- [ ] Transfer channel and checksums agreed (§6)

## Appendix — School Map physical files identified from delivered sources (47)

PBLBULDG, PBLADDIT, PBLSROOM, PBLSROM, PBLROOMS, PBLAREAS, PBLLEVEL, PBLWALL,
PBLFLOOR, PBLGATES, PBLELSUP, PBLSPPLS, PBLINSPL, PBLINTRV, PBLGASES, PBLEFECT,
PBLSWLOK, PBLDMG17, BULDCODF, BULDCOD1, BULDCD1F, SCHDES1F, SCHPF5, SCHSUM,
SCH05SPF, SCHDBF07, SCHDBF77, SCHDBFPD, SCHPLNPF, SCHMHMPF, PLN01PF, PLN02PF,
PLN105PF, PLN501PF, PLNDMDPF, PROJSRPF, PELCOURS, DELB01PF, FARM01PF, FARM02PF,
SEM001PF, TES001PF, TES002PF, CLOS00PF (duplicated definitions of PBLSROM and
PBLLEVEL in the archive are noted and will be reconciled against live DSPFFD).

---
---

# النسخة العربية

**من:** شركة Veebase — برنامج منصة GAEB الحديثة
**إلى:** الفريق الفني لنظام IBM i لدى الهيئة العامة للأبنية التعليمية
**الموضوع:** البيانات والأدلة المطلوبة لتنفيذ إثبات مفهوم الترحيل بالبيانات الفعلية
**حالة هذا المستند:** حزمة طلب فقط — لم يتم ترحيل أي بيانات فعلية للعميل حتى الآن.
لا يفترض هذا المستند أي حقائق عن النظام الحي؛ كل بند أدناه طلب تأكيد أو توريد من الهيئة.
الأوامر المثال هي أوامر قياسية لنظام IBM i V6R1 مقدمة للتيسير، ويجب على مشغّل الهيئة
تأكيدها مقابل التثبيت الفعلي (أسماء المكتبات والصلاحيات) قبل الاستخدام.

## ١. الغرض
محرك الترحيل في المنصة البديلة مبني ومختبَر من الطرف إلى الطرف على مستخرجات اصطناعية
بصيغة IBM i. ولإثباته على بيانات الهيئة الفعلية نطلب استخراجًا مضبوطًا لمنظومة
**الخريطة المدرسية** أولًا (سجل المباني المشترك)، ثم أدلة البند ٦ التي تفتح بقية المنظومات.

## ٢. الملفات المطلوبة — الترحيل الأولي للخريطة المدرسية (مكتبة NEWLIBGAEB)
- **PBLBULDG** — سجل المباني، هدف الترحيل الأساسي.
- ملفات الأكواد والمراجع المغذية له: المراكز، القرى وتوابعها، الإدارات التعليمية،
  المراحل التعليمية، جهات ملكية الأراضي — بالأسماء الفعلية على النظام الحي
  (المصادر المسلّمة أشارت إلى نحو ٣٨٨ مركزًا و٦١١٦ قرية و٣٥٤٤٩ تابعًا و٢٩٢ إدارة
  و٤٥ مرحلة و٢٨ جهة — يُرجى تأكيد أسماء الأعضاء الحية).

## ٣. عوائق أدلة محددة (تتطلب رد الهيئة)
1. **B-01 — أوصاف ملفات الموازنة الرئيسية (PBA3\*):** الأرشيف المسلّم يحتوي ملفات
   منطقية فقط فوقها. يُرجى توريد أوصاف الملفات الفعلية (DDS) أو مخرجات DSPFFD لكل ملف رئيسي.
2. **B-02 — التعريف المعتمد لملف INV001PF:** المصادر المسلّمة تحتوي ثلاثة تعريفات
   غير متطابقة. يُرجى تأكيد التعريف المعتمد على النظام الحي (مخرجات DSPFFD من الملف الحي تحسم الأمر).
3. **B-13 — وصف ملف بنود المقايسات الرئيسي:** سُلّمت منظومة المقايسات برامج فقط دون
   ملف البنود الفعلي. يُرجى تحديده وتوريد وصفه.
4. **B-03/B-04/B-08 — نتائج مرجعية لقواعد العمل:** خوارزمية CHKDIG؛ قاعدة أيام العمل
   الدقيقة لـ CHK5DAYS وتقويمها؛ التعداد الكامل لأنواع الاستقطاعات CUTKND مع صيغة كل نوع.
   ونطلب لكل قاعدة مجموعة أمثلة محسوبة من النظام الحي (مدخلات ← مخرجات) لاختبار التكافؤ.

## ٤. بيانات وصفية مطلوبة لكل ملف مستخرج
- عضو مصدر DDS (أو مخرجات DSPFFD وDSPFD) للملف كما هو على النظام الحي.
- اسم صيغة السجل وطول السجل.
- قيمة CCSID للملف، ولأي حقل تختلف قيمته عن قيمة الملف (خاصة حقول النص العربي).
- عدد السجلات على النظام الحي وقت الاستخراج.
- لكل ملف يحتوي مبالغ: إجمالي رقابي لكل حقل مالي محسوب على النظام الحي وقت الاستخراج.
- وقت الاستخراج والوظيفة/المستخدم المنفذ.

## ٥. صيغ التصدير المدعومة (بترتيب الأفضلية)
1. **صور سجلات ثنائية أصلية** (الأفضل للبيانات ذات الحقول المضغوطة/المقسمة): ملف حفظ
   (SAVOBJ/SAVLIB) أو نسخة خام لملف بيانات — يجب أن تصل الحقول المضغوطة ببايتها الأصلية.
2. **نص ثابت الصيغة** عبر CPYTOIMPF مع تحديد صفحة ترميز الملف صراحة. تنبيه: CPYTOIMPF
   يحوّل الحقول المضغوطة إلى نص — لا يصدر البايت الأصلي. عند استخدام هذا المسار يُرجى
   إبلاغنا بمعاملات الأمر الدقيقة للتحقق من التخطيط قبل التحميل.
3. **نص مفصول (CSV)** عبر CPYTOIMPF مع فواصل وصفحة ترميز معلنة — يسري التنبيه نفسه.
لا يكتب أي أمر مثال في النسخة الإنجليزية على بيانات الإنتاج أو يعدّلها. لن تكتب Veebase
أبدًا على النظام المصدري؛ وعند اعتماد الاستخراج المباشر نطلب ملف صلاحية **للقراءة فقط**
مقيدًا بالمكتبة والملفات المسماة.

## ٦. حماية البيانات والنقل
- يجوز إخفاء هوية البيانات الشخصية باستبدال متسق تديره الهيئة؛ وتبقى الحقول البنيوية
  والمالية دقيقة وإلا استحالت المطابقة.
- النقل عبر قناة مشفرة متفق عليها؛ وبصمة SHA-256 لكل ملف؛ وتؤكد Veebase البصمات عند الاستلام.
- تُستخدم المستخرجات لإثبات المفهوم فقط، وتُخزن مشفرة، وتُحذف أو تُعاد بتعليمات الهيئة.

## ٧. قائمة تحقق العميل
- [ ] قائمة الملفات مطابقة للبند ٢ مع تأكيد الأسماء أو تصحيحها
- [ ] توريد بيانات DSPFFD/DSPFD لكل ملف
- [ ] تأكيد قيم CCSID لكل ملف/حقل
- [ ] توريد أعداد السجلات والإجماليات الرقابية المالية
- [ ] حسم B-01 وB-02 وB-13
- [ ] توريد الأمثلة المحسوبة لقواعد العمل (B-03، B-04، B-08)
- [ ] تأكيد صيغة التصدير ومعاملاتها
- [ ] الاتفاق على قناة النقل والبصمات
