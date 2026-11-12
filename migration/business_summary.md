# GAEB AS/400 Legacy System — Business Summary

**Source:** Non-PDF documentation in the `veebase POC` archive (DOCX screen-spec files, PPTX ERD diagrams, XLS reference-data exports).
**Organisation:** GAEB — General Authority for Educational Buildings (Al-Hay'a al-'Amma lil-Abniya al-Ta'limiyya, الهيئة العامة للأبنية التعليمية), Egypt.
**System owner (from screen headers):** Central Administration for Design & Information Technology (Al-Idara al-Markaziyya lit-Tasmim wa Teknologya al-Ma'lumat), General Administration for Systems Development & Decision Support (Al-Idara al-'Amma li-Tatwir al-Nuzum wa Da'm al-Qarar). Screens carry ISO 9000/9001 branding.

## How this evidence was obtained (read this first)

- The six DOCX "screen spec" files contain almost no body text — the text layer is only a list of AS/400 program names. The actual screen content is in **~360 embedded PNG screenshots** of 5250 green-screen sessions (School Map: 68 + 182 + 33 + 57; Real Estate: 11 + 9). No Arabic OCR was available in this environment, so **15 screenshots were sampled and read visually** (first screens of the main menus plus representative entry/inquiry/report screens). Program-name inventories from the text layer were used to map the full functional breadth. A complete screen-by-screen transcription would require Arabic OCR of all 360 images.
- The PPTX ERDs are single-slide diagrams; all entity boxes and key fields were extracted from the slide XML.
- The XLS files are exports of AS/400 code tables (columns `TBID/TBKEY/TBNAM` = table id / code / name, or physical-file field names). Several are stored in Windows-1256 Arabic and appear as mojibake in standard tools; they were re-decoded from Latin-1 → CP1256 and are fully legible.
- Screenshots in the School Map docs are dated **May 2018**; the Real Estate screenshots are dated **7 August 2025** — i.e. the rentals/expropriation modules were still in live use in 2025. One School Map screenshot shows a 5250 session connected to host `9.111.111.155` port 23.
- Almost every file in the archive exists twice (a plain copy and a " (2)" copy); duplicates were skipped as instructed.

## Cross-cutting structure

- Every subsystem is keyed by a **composite geographic/organisational key**: Regional Centre code (Kod Markaz Iqlimi) + Branch code (Kod al-Far') + a serial/building number. GAEB runs 7 regional centres covering all 27 governorates (see School Map reference data).
- The subsystems are interlinked in the screens: a School Map building drill-down jumps to its tenders (Tarah), estimates (Maqayisat), budget (Mawazanah), contract ('Aqd) and payment abstracts (Mustakhlasat); the rented-buildings pipeline in School Map is the front end of the Real Estate purchase/expropriation workflow.

---

## 1. School Map (Al-Kharita al-Madrasiyya, خريطه مدرسيه)

### Business purpose
The national registry and planning system for every educational building in Egypt: what buildings exist, where, in what physical condition, who owns the land/building, how they are used — plus forward planning (school needs, the Authority's future plan targets, school merging/hosting/closure, and special programmes such as the Grade-6 administrative solutions).

### Key entities (from `ERD - المبني التعليمي.pptx`, physical file names preserved)
Central entity: **Educational Building (Al-Mabna al-Ta'limi)** — basic data file `PBLSCHOL` (regional centre code, branch code, educational building no., dependency code) and building file `PBLBULDG`. Satellite files (all 1-to-many from the building):

| File | Entity | Key content |
|---|---|---|
| PBLSROOM / PBLSRONN | Spaces (Al-Faraghat) | floor no., space code, space area |
| PBLWALLS | Fences/Walls (Al-Aswar) | per building |
| PBLGATES | Gates (Al-Bawwabat) | gate count, gate locations, gate types |
| PBLELSUP | Electrical connections (Al-Tawsilat al-Kahraba'iyya) | per building |
| PBLSPPLS | Supply/Feeding (Al-Taghziya) | supply type |
| PBLGASES | Gas sources (Masadir al-Ghaz) | per building |
| PBLSWLOC | Sewage (Al-Sarf) | septic-tank length/width |
| PBLINSPL | Sanitary equipment (Al-Tajhizat al-Sihhiyya) | floor, space, equipment type, count, condition |
| PBLLEVEL | Levels/Elevations (Al-Manaseeb) | per building |
| PBLAREAS | Areas (Al-Misahat) | per building |
| SCHCOORD | Building coordinates (Ihdathiyyat al-Mabna) | X, Y, Z |
| PBLINTRV | Usage periods (Al-Fatarat) | period no. per building |
| PBLMOKF | Usage status (Mawqif al-Istikhdam) | status code |
| PBLVGAIM | General-purpose use (Aghrad 'Amma) | purpose code, use start date |
| PBLEFECT | Surrounding influences (Al-Muhitat al-Mu'aththira) | influence type code |
| PBLMNTW | Maintenance works (A'mal al-Siyana) | maintenance type, date, works description |
| PBLADDIT | Annexes (Al-Malahiq) | annexes of a building |
| PFFOLTPF | Extension spaces (Faraghat al-Ta'liyat) | annex serial, plan year, construction type, floor — for vertical extensions |
| PBLHOST | Hosted schools (Al-Madaris al-Mustadafa) | host school no. ↔ hosted school no. |
| PBLDMG17 | School merging (Damg al-Madaris) | study no., merged-into building, merged building |
| PBLAITAD | Annex data after merging | annex no. before/after merging |
| CLOS00PF | Closed schools (Al-Madaris al-Mughlaqa) | school, annex |
| DELB01PF / DELB02PF | Building / annex cancellation (Ilgha') | code, cancellation date |
| PBLLND25 | Building merge indicator (Mu'ashshir Damg) | merge flag, user code |
| PBLCMDTL / PBLCMLSR | Comments on the building (Ta'liqat) | comment no., line no. |

### Main screens / user workflows (from the 4 DOCX screen inventories + sampled screenshots)
The four documents together inventory hundreds of programs (prefixes: `BLCD` building codes, `SIX` grade-six, `GIRL` girls' schools, `REP` reports, `PLN` planning, `LND` land, `PROJ` projects, `AZHR` Al-Azhar schools, `GIS` geographic, `STAT` studies, `POS` youth centres). Sampled screens show:

- **School Map inquiry (Doc 1, first screen):** multi-criteria search on governorate, regional centre, educational administration, section/centre, village, village dependency, educational stage, dependency (tabi'iyya), education type, student gender (boys/girls/mixed), land ownership, building ownership, usage status, building name and number. F8 launches the GIS application.
- **Future plan targets menu (Doc 1):** "Authority future-plan targets distributed by priority" — display all targets, inquiry by school no. / village code, build the plan by percentages, cancel a plan, record proposed solutions, add a new need (ihtiyaj) serial, cancel placement (taskin), plan inquiry at governorate and at republic level.
- **GIS distance inquiry (program CAGI80, Doc 1):** "Schools located within a given distance of another school" — enter school no., its X/Y coordinates, stage, ownership, no. of classrooms, area, periods, student counts by gender, density; scope options (same centre / all centres, same village / all villages); results list school no., name, area, distance in metres.
- **School-years main menu, HQ branch (Doc 2, BLCD01MR):** add class rows (sufuf) for a school that has none, edit rows (final-save mode), inquiry/print of registered schools, edit school years, detailed statement of classes and chapters for a village, print data-entry errors / non-entered rows, spool display.
- **HQ status statement (Doc 2):** totals per branch — total schools vs. schools with errors (a data-quality dashboard), at single-branch or all-branches level.
- **Rented-buildings status (Doc 2, RNT003IR):** pipeline status of every rented building at HQ across the acquisition workflow stages: needs study, site suitability, data completion, branch-manager signature, committee approval, Authority-manager signature, committee study, then outcomes — purchase forms, negotiation, donation acceptance, continued rental, suspension & liquidation, expropriation decision, return to owner (full/partial) — each stage flagged working/closed. This is the management view of the Real Estate workflow in §2.
- **Grade-Six main menu (Doc 2, SIX000MR):** "Administrative solutions for Grade 6" (Al-Hulul al-Idariyya lis-Saff al-Sadis) — 13 functions: enter solutions, follow-up entry, inquiries on solved classes by governorate/centre/village, follow-up reports, register schools to be solved by the preparatory stage, inquiries on schools not yet solved. A spooled status report (SIX023PP, Doc 3) breaks Grade-6 Phase-2 schools down by project/classroom counts and density, rented/replacement status, work-in-progress vs. delivered.
- **Master task menu (Doc 3, CTL05):** a numbered task list of 60+ building inquiries — one-classroom schools (al-fasl al-wahid), preparatory-school counts, Authority plans 90–96, floors and vertical extensions, building construction-purpose, complementary-spaces status, playground errors, computer labs, rented kindergartens, school-map response entry, closed educational buildings.
- **Area-vs-survey comparison (Doc 4, COMGPS1R):** compares each school's registered area against the field-survey (raf' misahi / GPS) area per governorate/centre, flagging deviations beyond ±10%, with error totals per governorate — a registry data-quality control.
- **Youth Centres (Doc 4, POS*):** GAEB also builds youth centres (marakiz shabab): main menu, inquiry by governorate, by centre/village, by number, and display of the youth-centre construction plan.
- **Project drill-down (Doc 4, DFO/BY/DEG/FBA programs):** from a building/project — tender (tarh), contractor file and track record (sabiqat a'mal), priced estimates (maqayisat) with F-key jumps to activities, tendering, budget (al-mawazanah), detail, the contract, payment abstracts (mustakhlasat — a sampled screen shows progress abstracts جارى nos. 1–4 with values and contractor entitlements for a youth-centre construction project), trial/final printing, and quality control (dabt al-jawda).
- **Studies & approvals inquiries (Doc 4, STAT*):** approvals on a building, by issued number/date, by governorate, by study author, and status of stages requested for change.

### Key reference data (XLS exports in `ملفات خريطة` — AS/400 code tables)
Geography & administration:
- **محافظه (Governorates):** 27 governorates with legacy non-sequential codes — Cairo 1, Alexandria 2, Port Said 3, Suez 4, Damietta 11, Dakahlia 12, Sharqia 13, Qalyubia 14, Kafr El-Sheikh 15, Gharbia 16, Monufia 17, Beheira 18, Ismailia 19, Giza 21, Beni Suef 22, Fayoum 23, Minya 24, Asyut 25, Sohag 26, Qena 27, Aswan 28, Red Sea 31, New Valley 32, Matrouh 33, North Sinai 34, South Sinai 35, Luxor 36.
- **محافظه + مركز أقليمى (Governorate → Regional Centre, fields BRCE/BRCD/BRNM/BRCNM):** 7 regional centres — 1 Greater Cairo (Cairo, Qalyubia, Giza), 2 North Delta (Alexandria, Kafr El-Sheikh, Beheira, Matrouh), 3 West Delta (Damietta, Dakahlia, Gharbia, Monufia), 4 Canal Cities & Sinai (Port Said, Suez, Sharqia, Ismailia, N. Sinai, S. Sinai), 5 North Upper Egypt (Beni Suef, Fayoum, Minya), 6 Middle Upper Egypt (Asyut, Sohag, Red Sea), 7 South Upper Egypt (Qena, Aswan, New Valley, Luxor).
- **مراكز (Centres/Districts):** ~388 centres/districts grouped under governorate header rows, codes embed the governorate (e.g. Cairo: 101 Qism Al-Tebbin, 102 Qism Helwan, 103 Qism 15 May, 104 Qism Maadi…).
- **قرى (Villages):** 6,116 villages, 5-digit hierarchical codes (governorate+centre prefix), e.g. 10101 Al-Tebbin Al-Bahriyya, 10205 Helwan Al-Balad.
- **تابع قريه (Village dependencies):** hamlets/dependencies ('izab, neighbourhoods) belonging to villages — ~35,449 rows across 3 sheets with 8–9 digit codes, e.g. "Al-Mugawara Raqm 2" (numbered neighbourhoods of new cities), thousands of 'izba names. (Two sheets sit exactly at 16,383 rows, which looks like an export cap — the true count may be higher.)
- **تعليميه (Educational administrations, table BLFT):** ~292 educational administrations (idarat ta'limiyya), coded governorate-prefixed, e.g. Cairo 101 Rod El-Farag … 139 Badr; Alexandria 201 East Alexandria … 208 Al-Agami; Port Said 301 North Port Said …

Building/school classification code tables (TBID = the AS/400 table that owns the codes):
- **التبعيه (Dependency, BLDT):** 1 Official (rasmi), 2 Official Languages, 3 Mu'an (معان — as written), 4 Private fee-paying, 5 Private Languages, 6 Community/Ahali, 7 Partnership (sharaka), 9 Azhari.
- **مرحله تعليميه (Educational stage, BLDU):** 45 stages — 1 Kindergarten, 2 Primary, 4 Basic, 10 Preparatory, 20 General Secondary, 21 Industrial, 22 Agricultural, 23 Commercial, 29 Hotel, 31/32/33 5-year Technical (Industrial/Agricultural/Commercial), 36 Maritime Secondary, 57 One-Classroom (al-fasl al-wahid), 64 Girl-Friendly (sadiqat al-fatayat), 65 Community Schools, 99 Services, plus special-education, sports, languages and combined-stage variants.
- **نوعيه تعليم (Education type, BLDV):** 1 General, 2 Technical (fanni), 3 Vocational (mihani), 4 Special Education, 5 Sports Education.
- **الغرض (Building purpose/use):** 38 codes — school, national school (qawmiyya), distinguished school, community schools, CARE authority, US aid, Mubarak-Kohl, Egyptian Childhood Development Association, hosted-for-Mubarak-Kohl, cooperative/charitable associations, private institutions, nuns' authority, smart school … Egyptian-German.
- **ملكيه أرض (Land ownership):** 1 Ministry-owned, 2 Joint ownership, 3 Rented (mu'ajjara), 4 Private ownership, 5 Temporarily seized (mustawla mu'aqqatan).
- **مالك أرض (Land owner):** ~28 owner bodies — State Property (amlak dawla), Ministry of Irrigation, Agrarian Reform, Armed Forces, New Urban Communities, Ministry of Agriculture, Awqaf (endowments), Public Business Sector, Private Property, Recovered Funds, Donation (tabarru'), Railways, Agricultural Cooperation, Social Affairs… *(data-quality note: the last row of this export is a school name — "Talaat Dargham Basic Education School" — sitting in the owner table.)*
- **ملكيه مبنى (Building ownership):** 1 Ministry, 2 Joint, 3 Rented, 4 Private.
- **هيكل (Structural condition):** 1 Good, 2 Unfit (ghayr salih), 3 Needs maintenance, 4 Needs restoration (tarmim), 5 Closed for restoration, 6 Closed for replacement (ihlal), 7 Under construction, 8 Partial annex closure, 40 Not stated, 50 None.
- **تشطيبات (Finishes) / توصيلات (Connections):** 1 All rooms, 2 Some rooms, 3 None.
- **واجهات (Facades):** ~29 finishes — cement plaster (tartasha asmantiyya), fatisa, red brick (tub wardi), artificial stone render, mahara render, Pharaonic stone cladding, oil paint, lime, wood… 50 = no spaces.
- **عدد البوابات (Gate count, BLDD):** 1–8 gates, 9 = none. **نوعيه البوابات (Gate type, BLDJ):** 1 Iron, 2 Wood, 3 Sheet metal (saj), 4 Under construction, 5 None.
- **فتره الأستخدام (Usage periods, BLDW):** First / Second / Third / Fourth period (multi-shift school days).
- **تحويلات (Transfers — yes/no table):** 1 Yes (na'am), 2 No (la).

---

## 2. Real Estate Ownership (Al-Milkiyya al-'Aqariyya, ملكيه عقاريه)

### Business purpose
Manages how GAEB acquires the buildings and land it operates from: (a) **rented buildings (al-mabani al-mu'ajjara)** — schools housed in rented premises — and the long administrative/legal pipeline to buy them, negotiate, accept them as donations, keep renting, return them, or expropriate them; (b) **expropriation (naz' al-milkiyya)** of rented buildings by ministerial/prime-ministerial decision, including compensation; (c) **land plots (qita' al-ard)** owned/allocated for future schools.

### 2a. Expropriation (Naz' MalkIyya — نزع ملكيه)

**Key entities (from `ملكيه عقاريه نزع ملكيهERD.pptx`)** — all keyed by Branch code (BRCD) + **Rented Building No. (BLCD)**, i.e. expropriation is anchored on the rented-building record:
- `REMV01PF` Ownership type **before** the competent minister's decision
- `REMV02PF` Ownership type **after** the decision
- `REMV03PF` Competent minister's decision data (registered no., NUMM)
- `REMV04PF` Works-cost cheque data (cheque no., NUMC)
- `REMV05PF` Temporary seizure data (al-istila' al-mu'aqqat)
- `REMV06PF` Display lists (kushuf al-'ard) — tied to expropriation decision no. (NUMD)
- `REMV07PF` Sale forms (istimarat al-bay')
- `REMV08PF` Local People's Council approval (muwafaqat al-majlis al-sha'bi al-mahalli)
- `REMV09PF` Expropriation type codes (REMTY code / REMNM name)

**Main screens (DOCX `شاشات نزع ملكيه`, programs REMV00MR–REMV12AR; screenshots dated Aug 2025):**
Main menu "Expropriation data":
1. Enter expropriation data **before** the Prime Minister's (Council of Ministers) decision
2. Enter expropriation data **after** the decision — sampled entry screen captures: branch code, rented building code, Council of Ministers decision no. & date, Official Gazette publication no. & date, education project (mashru' tarbiyya wa ta'lim), display-list data (no. of owners, price per metre), sale-forms count; function keys open the competent minister's decision (F08), display lists (F06), sale forms (F07), conformity certificates (shahadat al-mutabaqa, F04), final compensation (al-ta'wid al-niha'i, F10) and the real-estate unit sheet (sahifat wahda 'aqariyya, F11)
3. Enter works-cost cheque data
4. Enter temporary seizure data
5. Print reports

### 2b. Rented buildings (Al-Mu'ajjarat — مؤجرات) and land (Al-Aradi — الأراضى)

**Key entities (from `ERDملكية عقارية ( مؤجرات ).pptx`):** a rented-building master file (`RNTQ3PF` — all rented-building data) plus an **event/status file per workflow stage**, each keyed by rented building no. + date:
- Purchase status — decision (q
...[truncated 6151 chars]