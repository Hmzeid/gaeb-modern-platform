# Legacy AS/400 System — Process Summary by Subsystem

Source basis: SEU source listings (IBM i V6R1M0, library `NEWLIBGAEB`) extracted from the delivered PDFs and cross-checked against `legacy_inventory.json` (333 programs, 169 data files). Member names are quoted as evidence throughout.

**Cross-cutting architecture (all subsystems)**

- There are no IBM i menu objects in the delivery. Navigation is hand-built: a CL dispatcher `CAINGHIR` (the only CL program) shows display file `CAINGHIS`, format `CHOICEREC`, and maps `&CHOICE` 1–8 to `CALL PGM(...)`; RPG dispatchers do the same job elsewhere — `CAINGHIRS` and `CBA707IR` both `EXFMT CHOICEREC` and branch on function-key indicators (*IN60–*IN71) to `CALL` the work programs. `CBA707IR` alone calls 20+ programs (`CBA306IR7`, `CBA333OR9`, `CBA334ORU`, `CLOW13GX`, `CBAXGTAR`, …), so it is effectively the Budget main menu.
- Every interactive program follows one pattern: a workstation file (`CF E WORKSTN`) with subfiles (`SFILE(...:RRN)`), `EXFMT` control/detail formats, pop-up windows (`WIN1`, `WIN2`…), dedicated error formats (`ERR`, `ERR1`…), and shared called routines — `BULDNAME` (building-name lookup), `RWGOVE` (governorate), `SUBPB03R`, `RW004BRS`/`RW04BRS` appear in almost every subsystem, i.e. a common code-table/lookup layer over the shared tables `PBLCNTRF` (control), `PBLBRAL1` (branches), `PBLTAB01–09` (code tables), `PBLSCHOL`, `PBLBULNO` (building register).
- Report programs are separate members with a `PRINTER` file and O-specs writing `HEADER`/`DATA`/`FOOTER`/`TOTALR` records (e.g. `CBA333ORS`, `CBA334ORR`, `BLCD30AR`, `PMPT200R4`), usually after a screen program collects selection criteria (formats `MNSCTL`/`MSG01`) and a `REPAIR*` routine builds a temporary totals file (`PBGRCTMP`, `PBGTM6`) that the print program consumes.
- Caution for migration: Arabic comments/literals inside the listings extract as mojibake (legacy Arabic code page), so business meaning below is reconstructed from file/field names, call graphs and executable logic, not from the Arabic text. Also, the DDS for the shared `PBA3*` budget master files was **not** in the delivery (only logical files over them were), so Budget master-file layouts must be obtained separately.

---

## 1. Budget (الموازنه) — 110 programs, source file `BALANC5`

### Menu structure / main functions
Two-level dispatch: `CAINGHIR` (CL) offers 8 choices → `CBA333ORS`, `CLOW13GGX#`, `CBA334ORR`, `CBA334ORU5`, `CBA416IR#`, `CBA807UR`, `CBA316IR#`, `CBA336ORY1`. `CAINGHIRS` (RPG twin) dispatches on *IN60–*IN71 to `CBA0GTAR1`, `CBA316IR#`, `CBA00GOR#`, `CBA516IR#`, `CBA01GOR#`, `CBA116UR`, `CLOW13GG#`, `CBA014ORB`, `CBA014OR7X`, `CBA118GR1`, `DBA807UR`. User functions are therefore: payment/allowance data entry, budget inquiries, and a family of printed budget reports (the `CBA333*`/`CBA334*` members).

### Most important programs
- **CBA009OR** (27 pp) and its many near-identical variants (`CBA009ORW`, `CBA009ORR`, `CBA009ORL`, `CBA00GOR`, `CBA00GOR#`, `CBA00GORF`, `CBAGG9OR`, `CBAGG9OR1`) — the core interactive **payment/authorization entry** programs. They update `PBA3PYQQ` (payments), `PBAFNPF`, `PBAAUTH` (authorizations) and `PBAFNDR` as `UF` (update) files, read the reference set `PBA3GOVE` (governorates), `PBA3PYFN`/`PBA3PYST` (payment types/states), `PBA3WKCD` (work codes), `PBAFNDT`, `PBABSRC` (funding sources), `PBABDGT` (budget), `PBARECPF`, and write allowance/payment output records to `CBABDALW` (record `CALWREC`) / `CBABGALW` (`GALSREC`). Subfile screen `CBA009OS` with formats `REC`, `TASREC`, `DOOR`, `ERR`/`ERRQ`.
- **CBAGG9OR / CBAGG9OR1** (29/25 pp) — the same entry pattern extended to assignments: additionally update `PBA3FNGV` and `PBA3TASG` (assignment/transfer files) and receipt totals `PBGRECPF`/`PBGRECTM`; `CBAGG9OR1` writes both `DALWREC` and `GALWREC` allowance records.
- **CBAXGTAR / CBAXGTAR1** (21 pp) — cross-subsystem inquiry: reads Budget payment files plus Purchases files (`PBYCLA`, `PBYCLAM`, `PBYCLAS`, `PBYSUPL1` suppliers, `PBYMANT` via `PBLBULL1`/`PELBULL1` buildings) and School-Map building tables (`PBLSCOL1`, `PBLTAB03/04`), with window formats `SCRREC`, `WIN`, `WIN1`, `WIN3` — i.e. a consolidated project/building financial inquiry.
- **CBA333ORS** (menu choice 1) — **report**: screen `MNSCTL` collects criteria, calls `REPAIRC` to build temp file `PBGRCTMP` from receipts `PBGRECPF` + allowances `LBABGALW` + reported payments `PBA3PYRP`, then prints via `CBA333TR#` (`HEADER`/`DATA`/`FUNTOT`/`TOTALR`).
- **CBA334ORR** — same report pattern over the budget file `PBABDGT` and allowance logical `CBABDALF`, temp file `PBGTM6`, printer `CBA334BRR`; `CBA334ORU5` is the choice-4 sibling.
- **CLOW13GX / CLOW13GGX#** — print program (`CLW13URPS` PRINTER) producing a formatted statement from `EGMALYKL` (updated totals file) with `HEADER`/`DTHDR`/`EGMAL`/`FOOT` output records.
- **CBA707IR** — dispatcher/menu (above).

### Key business rules visible in code
- Entry is controlled by reference data: no payment line is accepted outside the governorate (`PBA3GOVE`), work-code (`PBA3WKCD`), funding-source (`PBABSRC`) and budget (`PBABDGT`) tables, all chained before update; every entry program carries multiple `ERR*` formats, i.e. field-level validation before any `WRITE`/`UPDAT`.
- Amount handling: in `CBA009OR` the entered fiscal amount is moved into the output record's `AMOUNT` (`Z-ADD FISCBL AMOUNT`, `MOVE BET AMOUNT`) conditionally on payment-type code (`PYFNO IFEQ 1` → `MOVE BETOT AMOUNT`), and allowance output records (`CBABDALW`, keyed `LWYEAR`, `LWTAS`) carry `AMOUNT` (12,2), `ACCNO` (account number), `LWTAS` (assignment), decision/transfer dates `LWTSDT`/`LWDCDT` — payments are posted per fiscal year + assignment + governorate.
- Reports never print raw transactions: a `REPAIR*` build step aggregates into a temp totals file first (separation of posting and reporting).

### Main reports
Budget/receipt statements from the `CBA333*`/`CBA334*` family (totals by function — `FUNTOT`/`TOTALR`), the `CLOW13GX` statement, and payment reports over `PBA3PYRP` (reported payments).

---

## 2. School Map (خريطه مدرسيه) — 84 programs

### Menu structure / main functions
No CL menu; entry is through the building master program `BLCD01AR`, which `CALL`s twenty sibling programs (`BLCD02AR`–`BLCD24AR`, `BLCD39UR`, plus `LND01HLR` from Real Estate) — i.e. one building record opens all its sub-data: annexes, rooms, utilities, coordinates. Planning programs are the `PLAN*`/`PLN*` family; statistics roll-up is `SUM408R`. PDF filenames confirm the functions (Arabic): "basic data of the educational building", "building annexes data", "disbursement data of the building", "farms basic data", "project goals entry".

### Most important programs
- **BLCD01AR** (26 pp) — **building master data entry**, the hub. Updates `PBLBULNO` (building number register), `PBLWALLS` (walls/fences), `PBLEFECT`, `PBLMOKF` (location), `PBLAREA` (areas); reads `PBLCNTRF`, `PBLBRAL1`, `PBLVILG` (villages), `SCHCOORD` (GIS coordinates — also writes `COORDREC`), code tables `PBLTAB01–03`. Calls `BLCD02AR`…`BLCD24AR` for each sub-domain and `CHKDIG` (check-digit routine).
- **BLCD23AR** (37 pp, largest) — **annexes (ملاحق) entry**: subfile program over `PBLADDIT` (annexes, `UF A`), with `PBLSROOM` (rooms), `PBLAREA`, `PBLBULNO`; writes record `LADDRC`.
- **BLCD20AR** — **sanitation/drainage data entry** for the building (updates `PBLSEWAG`, `PBLGNETW`, `PBL SWLOC` family).
- **BLCD38AR** — **classrooms entry** ("classes not previously added"): updates `PBLINTRV`, `PBLHOLF1`, `BLCD03PF` (class/room file) with subfile `BLC38SFL`.
- **BLCD30AR** — **data-quality report**: reads ~30 building sub-files (utilities `PBLGASES`/`PBLGASEQ`, water `PBLGRWTR`/`PBLTOWTR`, sewage, gates, walls, areas…) and prints schools **with errors in their data** on printer file `BLCD30PP`.
- **SUM408R** — **school summary/statistics roll-up**: builds/updates `SCHSUMPF` summary and `RASONPF` records (`SUMREC`, `RASREC`) from `PBLSCOL1`, projects `PROJPF5V`, targets `TARGETPF`, rents `RNT001PF` and `GIS001L2`; calls `BRN001IR`, `LND02HLR`, `LND03HLR`, `OPT001IR`.
- **PLN105AR** — **planning batch update**: reads project files `PROJPF5V`/`PROJLF5V`, roads `RODAPF5V`/`RODALF5V`, school summaries `SCHSUM4#`/`SCHSUM2#`, land `PBLND14L`, and writes the plan file `PLN105PF` (`UF A`) — a periodic refresh of planning data, no workstation file (batch).
- **PLAN02AR / PLAN03AR / PLAN04AR** — project entry and project-goals entry (أهداف المشروع) over the plan files.

### Key business rules visible in code
- Existence/duplicate control on the building number: `BLCD01AR` does `CHAIN PBLBULNO` and branches on `%FOUND` / `NOT %FOUND` before allowing add vs. update, and `CHKDIG` is invoked for the building-number check digit.
- A building is a composite: the master record is only complete with its annexes (`PBLADDIT`), rooms/classrooms (`PBLSROOM`, `BLCD03PF`), areas (`PBLAREA`), walls, gates and every utility connection — `BLCD30AR` exists precisely to police completeness, scanning all sub-files and listing buildings whose data is inconsistent/missing.
- Statistics are derived, not typed: `SUM408R` recomputes the school summary (`SCHSUMPF`) from building, project, target and rent sources.

### Main reports
`BLCD30AR` schools-with-data-errors report; printed building statements from the `BLCD*PF` printer-file members (`BLCD01PF`–`BLCD05PF` in the inventory); summary statistics produced around `SUM408R`/`SCHSUMPF`.

---

## 3. Real Estate (ملكيه عقاريه) — 60 programs

### Menu structure / main functions
Two functional halves visible in the folder split and program prefixes: **land & ownership** (`LND*`, `GRN*` approvals, `LGNM*` committees) and **expropriation & rentals** (`REMV*` نزع ملكية, `RNT*` rentals). Programs share the School-Map building/land tables (`PBLLND01`–`PBLLND15`, `PBLBRAL1`, `PBLCNTRF`, `PBLTAB02–04`), so land parcels are maintained against the same building register.

### Most important programs
- **LND13AR** (36 pp, largest) — **land-parcel approval/registration** ("الاعتماد لقطعة الأرض" per its PDF name): subfile program (`ENSUB`) touching the whole land family `PBLLND01/04/05/06/08/09/14/15`, borders `PBLBORDR`, coordinates `SCHCOORD1`, buildings `PBLBULDG`/`PBLSCHOL`; calls `LNDSUBR`, `MNULNSIR` (a land sub-menu), `RW004BRS`.
- **LND05AR** — **site boundaries entry** (حدود الموقع العام): updates `PBLLND05` and border file `PBLBORDL`, records `LAND05`/`BORDRC`, via subfile `LND05SFL`; calls `BLNDSUB`, `LNDSUBR`.
- **LND26AR** — **land sale data entry** (بيانات البيع): writes `PBLLND26` (`LAND26`), validated against projects `PROJPLL1`/`PROJCODE`, ownership view `LNDOWNOL`, school summary `SCHSUMF1`.
- **GRN002AR** — **real-estate approval entry** (إدخال موافقة العقارية): subfile `GNSUB` over `GRN002PF`, land files `PBLLND04/08/09`, and it **prints the approval** on printer file `GRN002IP` (`HEAD1`/`HEAD2`/`DATA` output) — entry and printed decision in one program.
- **REMV01AR** — **expropriation case entry** (نزع ملكية): updates `REMV01PF` (`REM01`), reads rentals `RNT001PF`/`RNT004PF`, areas `PBLAREA1`, buildings `BULD1LF`; calls `REMV08AR`, `REMV09HR` (helpers) and `REMV01QR` (inquiry).
- **REMV02AR** (17 pp) — **expropriation after the ministerial decree** (بعد قرار الوزير): updates `REMV02PF`, reads `REMV01PF/03/06/07PF`, and dispatches to the case sub-programs `REMV03AR`, `REMV06AR`, `REMV07AR`, `REMV10AR`, `REMV12AR` — the post-decree workflow stage (a second PDF of the same member covers the offers schedule, كشف العروض).
- **RNT001AR** (15 pp) — **rented-building position** (موقف المبنى المؤجر): one screen program maintaining eight rental files `RNT001PF`–`RNT008PF` plus monthly files `RNTM01–03PF`, one format per file (`RNT01`–`RNT08`).
- **LGNM01AR** — **committees data** (بيانات اللجان): subfile of committee members (`LGNREC`, `MBRREC`) over `PBLLND01` and employees file `PEMEMPLO`; calls `ESNDL1AR`, `HLPTB02P`.

### Key business rules visible in code
- Workflow staging in expropriation: a case is created in `REMV01AR` (pre-decree data) and only after the minister's decree does `REMV02AR` take over, pulling the case, offers and parties from `REMV01/03/06/07PF` — the decree is the gate between the two programs.
- Land transactions are never free-standing: sale (`LND26AR`) and approval (`GRN002AR`, `LND13AR`) programs chain against the parcel master (`PBLLND04`), ownership (`LNDOWNOL`), borders and the building register before writing, and approvals produce a printed document (`GRN002IP`).
- Rentals are tracked as a *position* per building across 8 related files (contract, payments position, monthly data in `RNTM01–03PF`), keyed off the shared building number (`PBLBULNO`/`PBLBULNO3`).

### Main reports
Printed real-estate approval (`GRN002AR` → `GRN002IP`); printer-file members in the inventory (`PBLLND06/08/09/10/13/14`, `LND013PF`) are the land listing reports; expropriation offers schedule handled inside the `REMV02AR` family.

---

## 4. Estimates / BOQ (مقايسات) — 38 programs (construction مقايسات إنشاء + maintenance مقايسات صيانة)

### Menu structure / main functions
The Estimates subsystem is documented largely by screen-print PDFs whose Arabic names are the menu: estimate entry (تسجيل مقايسه), building estimate inquiry (استعلام مقايسه مبني), project estimate inquiry (استعلام مقايسه مشروع), price-list inquiry (استعلام قائمه اسعار), contractor-price registration (تسجيل اسعار مقاول), estimate amendment (تعديل مقايسه). The code members are the `PMP*`/`ADM*` family working on the `DES*` design files shared with Technical Abstracts.

### Most important programs
- **PMPITMAR** (51 pp, largest) — **estimate item entry**: the item subfile program. Updates the five estimate-item files `ADM001PF`–`ADM005PF` (records `ADM01`–`ADM05`, one per item category) against design masters `DES001PF`/`DES002PF`/`DES003PF`, item lists `DESL01PF`/`DESL02PF`, `DEST01PF`, `DES092PF`, price list `PMPPL`; screen formats `FOUNDITM1`, `ITMELECTR` (electrical items), `SUBC`/`SUB1C`/`SUB2C` subfiles; calls `CAT005RR` (catalogue), `DES011IR`, `MANAGERR`, `PLANYEARR`, `SPC001IR`.
- **PMPT200R4** and **PMPT200R2** (34/33 pp) — **estimate print**: workstation criteria screen (`MMMMM1PS`, format `SCR01`) + printer file `MMMMM1PP`; reads `DES001–003PF`, `DEST01/02PF`, updates `ADM002PF`, accumulates `TOTWORK`/`TOTALSM` and prints `HEADER`/`WORK`/`LINE`/`TOTALSM` — the priced BOQ document with work totals.
- **PMP55555** (33 pp) — a variant of the same print program over the reviewed-estimate files `ADMR02PF`/`ADMR03PF` (the "R" review copy of the ADM item files), i.e. printing the *revised/approved* estimate rather than the draft.
- The inquiry programs documented by the screen PDFs (استعلام مقايسه / مبني / مشروع, استعلام اسعار مقايسات, استعلام قائمه اسعار) — read-only BOQ and price-list inquiries at building and project level.

### Key business rules visible in code
- An estimate is built **only from the standard catalogue**: item entry (`PMPITMAR`) picks items via `CAT005RR` from `DESL01PF`/`DESL02PF` lists and the `DES001–003PF` design masters (with `DES092PF` specifications); the five `ADM00xPF` files separate item categories (incl. electrical, `ITMELECTR`).
- Draft vs. reviewed estimates are physically separate file sets (`ADM*` vs `ADMR*`), and each has its own print program (`PMPT200R*` vs `PMP55555`) — an estimate cannot be printed as final from the draft files.
- Print totals are computed in-program (`TOTWORK`, `TOTALSM` accumulation before the `TOTALSM` output record), i.e. BOQ value = Σ item lines, produced at print time from the item files.

### Main reports
The priced estimate/BOQ print (`PMPT200R4`/`PMPT200R2`, `PMP55555`) — header, work sections, item lines, totals — is the subsystem's principal output; price-list and estimate inquiries are screen-based.

---

## 5. Technical Abstracts / Contractor Payments (مستخلصات فنيه) — 25 programs (construction + maintenance)

### Menu structure / main functions
The payment-certification subsystem: `INV*` programs handle the abstract (مستخلص) itself, `INM*` the maintenance abstracts, `PAG*` the payment/disbursement side, `BIL*` billing lines. It consumes the Estimates data (`DES*`, `ENG*` engineers, `DEST01PF` destinations) and produces the certified amounts that Budget pays.

### Most important programs
- **INV001AR1** (125 pp) and **INV005AR** (123 pp) — the **main abstract entry** programs, the largest interactive programs in the whole delivery (~60 files each). They update the abstract files `INVC01PF`, `INV001PF`–`INV007PF`, `INV010PF`, `INV011PF`, notes files `INVNT1–3PF`, read the full design/estimate set (`DES001–003PF`, `DES007PF`, `DESL01/02PF`, `DESNT1–5PF` + their `C` copies), engineers `ENG000/001/002/004/009PF`, payments `PAG003PF`/`PAG021LF`, admin `ADMA01PF`; item subfile screen `INV001AS` (`ITMCTRL`, `ITMSFL`). They write billing records `BIL001`–`BIL010` and call `BIL001HR` (billing helper), `CHKDAT` (date check), `CAT005RR`/`CAT006RR` (catalogues), `FUNSUP`.
- **INV001HR / INV001IR** (59/32 pp) — the helper/inquiry companions of the abstract entry (same file set, `HR`/`IR` suffix pattern used across the estate for helper/inquiry variants).
- **INM001AR1** (85 pp) and **INM002R#** (123 pp) — **maintenance abstracts**: same architecture over the `INM001–007PF` files, additionally reading Purchases data (`#BYPRG`, `PBYMANLF`, `PBYPARTT`) and folders `PFFOL05L`/`PFFOLD5L` — maintenance abstracts are tied to purchase orders/contracts.
- **PAG001MR** (33 pp) and **PAGM01MR** (34 pp) — **payment registration**: update `PAG001PF`–`PAG003PF` (records `PAG001`–`PAG003`) via subfile screen `PAG001mS`, validated against `DEST01–03PF`; calls `PAG001RP` (payment print), `GETRQ1IR`/`GETST1IR` (request/status lookups), `WRKUSPL`.
- **BILM01AR** — billing maintenance over the `BIL*` records produced by abstract entry.

### Key business rules visible in code
- Abstract value is computed line by line from measured quantity × contract price: `EVAL QSTKVL = AQTY1 * ITPR` in `INV001AR1` (quantity × item price = line value), accumulated into the `BIL001`–`BIL010` billing records.
- Deductions are a first-class, typed mechanism: `INV001AR1` contains 100+ references to the `CUT*` deduction fields, branching on deduction kind (`CUTKND WHENEQ 2 / 3 / WHENGE 4`) to build different deduction headers (`SCUTHDR`) — different deduction types (e.g. retention, advances, penalties) are calculated and presented differently.
- An abstract cannot be keyed freehand: items come from the Estimates catalogue files (`DES*`), the engineer/destination from `ENG*`/`DEST01PF`, dates are validated by the called routine `CHKDAT`, and payment (`PAG001MR`) is a separate step from certification (abstract entry) — certification, billing and payment are three distinct programs/files (`INV*` → `BIL*` → `PAG*`).
- Construction and maintenance abstracts are parallel implementations (`INV*` vs `INM*`) over mirrored file sets; maintenance additionally requires the Purchases link (`#BYPRG`).

### Main reports
Payment print `PAG001RP` (called from `PAG001MR`); abstract/billing printouts from the `INV*` family over the `BIL*` records; the printed abstract is the document the whole entry flow builds toward (billing records `BIL001`–`BIL010` are its sections).

---

## 6. Purchases & Contracts (مشتريات) — 16 programs

### Menu structure / main functions
The smallest subsystem — a tendering workflow documented by its Arabic PDF names, all in the `#BY*` family over tender files `#BYD1LF`, `#BYGRP`, `PBY*`: tender (مناقصه, `#BY001AR`), specifications booklet (كراسه الشروط, `#BY003AR`), bids/offers (العطاء, `#BY004AR`), bid exclusion (أستبعاد عطاء, `#BY005A1`), envelope-opening committee (لجنه المظاريف, `#BY007AR`/`#BY008AR`), award committee (لجنه البت, `#BY009AR`), financial evaluation (التقييم المالى, `#BY011AR`), tender parts (أجزاء مناقصة, `#BY013AR`), group parts (أجزاء مجموعه, `#BY016AR`), negotiations (مفاوضات, `#BY016R2`), award/assignment (أحاله, `#BY045AR`), contractor (مقاول, `#BY051AR`, master `PBYSUPL`), work (شغل, `#BY054AR`), and a purchases abstract program `DBY005AR` (مستخلص).

### Most important programs
- **#BY001AR** — tender header entry (مناقصه): creates the tender that all other `#BY*` programs key off.
- **#BY004AR / #BY005A1** — bid registration and **bid exclusion**: exclusion is its own program, i.e. removing a bid is a controlled, recorded act, not an edit.
- **#BY007AR / #BY008AR / #BY009AR** — the two committees (envelope opening, then award/البت) as separate programs — the procedural stages of Egyptian tender law are separate screens/steps.
- **#BY011AR** — **financial evaluation** (التقييم المالى) of bids.
- **#BY013AR** — tender parts/lots entry: updates `#BYD1LF` (tender detail) against `#BYGRP` (groups), calls `DES01VAL` (validation), `NABWAYAR`.
- **#BY016AR / #BY016R2** — group parts and **negotiations** recording.
- **#BY045AR** — award/assignment (إحالة) — the outcome step.
- **#BY051AR + PBYSUPL** — contractor/supplier master used by all subsystems (`PBYSUPL1` is read by Budget inquiries too).
- **#BY054AR** — work/contracts execution data: updates `PBYMANT`, `PBYMMTB`, `PBYTEMP` and `#BYD1LF`; calls `CHK5DAYS` (a five-day deadline check), `MAIL01FR`, `DBY130A`.
- **DBY005AR** (15 pp, largest) — purchases abstract/payment: updates `PBYSMPL` and `PBYDFMN`, reads law table `PBLAW11`; calls `CRNT08UR`, `MBA005OR`, `PQMFUNCR`.

### Key business rules visible in code
- The tender lifecycle is enforced by program separation: booklet → bids → exclusion → envelope committee → financial evaluation → award committee → negotiations → award (إحالة); each stage is a distinct program writing the shared tender detail `#BYD1LF`, so a later stage's data presupposes the earlier stage's records.
- Time limits are coded: `#BY054AR` calls `CHK5DAYS` — a working-days/deadline validation routine — before updating the work files.
- Legal reference data is table-driven (`PBLAW11` read by `DBY005AR`), and suppliers are a single shared master (`PBYSUPL`) consumed across Budget, Abstracts and Purchases.

### Main reports
No dedicated printer programs appear in this subsystem's 16 members — its outputs are the tender documents produced from the stage programs and the shared `DBY*` print path (`DBY033RLO` printer file referenced in `DBY005AR`'s family); reporting for purchases is otherwise via the Budget/Abstract inquiry programs (`CBAXGTAR` reads the `PBY*` files).

---

## Migration-relevant summary

1. Six subsystems, one shared foundation: building register (`PBLBULNO`/`PBLSCHOL`), code tables (`PBLTAB01–09`, `PBLCNTRF`, `PBLBRAL1`) and supplier master (`PBYSUPL`) are used by everything — migrate these first.
2. The money flow crosses subsystems: Estimates (`ADM*`/`DES*`) → Abstracts certification (`INV*` → `BIL*` → `PAG*`) → Budget payment (`PBA3PYQQ`, `PBAAUTH`, allowance files `CBABDALW`/`CBABGALW`). These interfaces are file-based, not API-based.
3. A large share of the estate is cloned variants (the `CBA009OR`/`CBA00GOR`/`CBAGG9OR` family; `INV001AR1`/`INV005AR`; `PMPT200R4`/`PMP55555`) — the modern system should collapse each family into one parameterized module.
4. Business rules live in the RPG logic (validation chains, `%FOUND` existence checks, `CUTKND` deduction branching, quantity×price valuation, `CHK5DAYS`, `CHKDIG`) — they must be extracted rule-by-rule; screen/report layouts are separate members and migrate as templates.
5. Gaps in the delivery: DDS for the shared `PBA3*` Budget masters, and the display-file DDS behind the `*OS`/`*AS` workstation files (only their usage in RPG is visible), are needed to complete the data dictionary.
