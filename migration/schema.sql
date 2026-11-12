-- GAEB AS/400 -> PostgreSQL migration DDL (generated from DDS PF definitions parsed from SEU listings)
-- Type inference rules: decimals>0 -> NUMERIC; name/length heuristics otherwise. Review field_map.csv before production use.

CREATE SCHEMA IF NOT EXISTS abstracts;
CREATE SCHEMA IF NOT EXISTS budget;
CREATE SCHEMA IF NOT EXISTS estimates;
CREATE SCHEMA IF NOT EXISTS purchases;
CREATE SCHEMA IF NOT EXISTS real_estate;
CREATE SCHEMA IF NOT EXISTS school_map;

-- Budget | legacy NEWLIBGAEB/CBABDALW (source BALANC5) | الموازنه/ملفات/111.pdf
CREATE TABLE IF NOT EXISTS budget.cbabdalw (
  lwyear INTEGER,
  lwno INTEGER,
  lwsav INTEGER,
  lwbano INTEGER,
  lsbano BIGINT,
  lwblno INTEGER,
  lwtsdt INTEGER,
  lwdcdt INTEGER,
  lwgvcd INTEGER,
  lwser INTEGER,
  amount NUMERIC(12,2),
  lwtas INTEGER,
  accno INTEGER,
  PRIMARY KEY (lwyear, lwtas)
);

-- Budget | legacy NEWLIBGAEB/CBABDGLW (source BALANC5) | الموازنه/ملفات/112.pdf
CREATE TABLE IF NOT EXISTS budget.cbabdglw (
  lwdcdt INTEGER,
  lwgvcd INTEGER,
  lwser INTEGER,
  lwyear INTEGER,
  lwno INTEGER,
  lwfisc INTEGER,
  lwtsdt INTEGER,
  mablgh NUMERIC(10,2),
  tsmno INTEGER,
  shatb INTEGER,
  PRIMARY KEY (lwdcdt, lwgvcd, lwser)
);

-- Budget | legacy NEWLIBGAEB/CBABGALW (source BALANC5) | الموازنه/ملفات/113.pdf
CREATE TABLE IF NOT EXISTS budget.cbabgalw (
  lwyear INTEGER,
  lwno INTEGER,
  lwsav INTEGER,
  lwsgv INTEGER,
  lwbano INTEGER,
  lsbano BIGINT,
  lwblno INTEGER,
  lwtsdt INTEGER,
  lwdcdt INTEGER,
  lwgvcd INTEGER,
  lwser INTEGER,
  amount NUMERIC(12,2),
  lwtas INTEGER,
  accno INTEGER,
  PRIMARY KEY (lwser, lwdcdt, lwgvcd, lwsgv)
);

-- Budget | legacy NEWLIBGAEB/CBARECPF (source BALANC5) | الموازنه/ملفات/114.pdf
CREATE TABLE IF NOT EXISTS budget.cbarecpf (
  dcdt INTEGER,
  gvcd INTEGER,
  pyser INTEGER,
  dpccd INTEGER,
  dpcd INTEGER,
  today INTEGER,
  bakday INTEGER,
  rectim INTEGER,
  temp INTEGER,
  bdzx BIGINT,
  bdy INTEGER,
  PRIMARY KEY (dcdt, gvcd, pyser, dpccd, dpcd, bdy)
);

-- Budget | legacy NEWLIBGAEB/CBAXX1PF (source BALANC5) | الموازنه/ملفات/115.pdf
CREATE TABLE IF NOT EXISTS budget.cbaxx1pf (
  zxcd BIGINT,
  zxnm VARCHAR(70),
  PRIMARY KEY (zxcd)
);

-- Budget | legacy NEWLIBGAEB/CBAXX2PF (source BALANC5) | الموازنه/ملفات/116.pdf
CREATE TABLE IF NOT EXISTS budget.cbaxx2pf (
  bdzx BIGINT,
  bdsd INTEGER,
  bdy INTEGER,
  gvcd INTEGER,
  xbcd INTEGER,
  mans NUMERIC(13,2),
  tagz NUMERIC(13,2),
  alat NUMERIC(13,2),
  arad NUMERIC(13,2),
  abhas NUMERIC(13,2),
  wsal NUMERIC(13,2),
  dfat NUMERIC(13,2),
  artb NUMERIC(13,2),
  mnsrf NUMERIC(13,2),
  tasw NUMERIC(13,2),
  fisccx INTEGER,
  PRIMARY KEY (bdzx, bdsd, bdy, fisccx)
);

-- Budget | legacy NEWLIBGAEB/CBAXX9PF (source BALANC5) | الموازنه/ملفات/117.pdf
CREATE TABLE IF NOT EXISTS budget.cbaxx9pf (
  bdzx BIGINT,
  bdsd INTEGER,
  bdy INTEGER,
  gvcd INTEGER,
  xbcd INTEGER,
  mans NUMERIC(13,2),
  tagz NUMERIC(13,2),
  alat NUMERIC(13,2),
  arad NUMERIC(13,2),
  abhas NUMERIC(13,2),
  wsal NUMERIC(13,2),
  dfat NUMERIC(13,2),
  artb NUMERIC(13,2),
  mnsrf NUMERIC(13,2),
  tasw NUMERIC(13,2),
  fisccx INTEGER,
  PRIMARY KEY (bdzx, bdsd, bdy, fisccx)
);

-- Budget | legacy NEWLIBGAEB/CBGRECPF (source BALANC5) | الموازنه/ملفات/118.pdf
CREATE TABLE IF NOT EXISTS budget.cbgrecpf (
  dcdt INTEGER,
  gvcd INTEGER,
  pyser INTEGER,
  fcod INTEGER,
  today INTEGER,
  rectim INTEGER,
  temp INTEGER,
  bnd INTEGER,
  bdzx BIGINT,
  bdy INTEGER,
  PRIMARY KEY (dcdt, gvcd, pyser, bdy)
);

-- Budget | legacy NEWLIBGAEB/CBGREXPF (source BALANC5) | الموازنه/ملفات/119.pdf
CREATE TABLE IF NOT EXISTS budget.cbgrexpf (
  dcdt INTEGER,
  gvcd INTEGER,
  pyser INTEGER,
  fcod INTEGER,
  today INTEGER,
  rectim INTEGER,
  temp INTEGER,
  bnd INTEGER,
  gvcdx INTEGER,
  PRIMARY KEY (dcdt, gvcd, pyser)
);

-- School Map | legacy NEWLIBGAEB/PLNDMDPF (source DMGSRC) | خريطه مدرسيه نهائى/ملفات خريطة/DETAIL ملف المبانى المخطط دمجها.pdf
CREATE TABLE IF NOT EXISTS school_map.plndmdpf (
  blcda INTEGER,
  blcdb INTEGER,
  PRIMARY KEY (blcda, blcdb)
);

-- School Map | legacy NEWLIBGAEB/SCHPF5 (source SCHSRC) | خريطه مدرسيه نهائى/ملفات خريطة/الملف الخمسية.pdf
CREATE TABLE IF NOT EXISTS school_map.schpf5 (
  mossum INTEGER,
  mosbrn INTEGER,
  optsum INTEGER,
  yersum INTEGER,
  brsum INTEGER,
  dssum INTEGER,
  vlsum INTEGER,
  blcd INTEGER,
  clssum INTEGER,
  clssm1 INTEGER,
  clssm2 INTEGER,
  stage INTEGER,
  mokf INTEGER,
  solk INTEGER,
  proj INTEGER,
  dat INTEGER,
  PRIMARY KEY (mossum, optsum, yersum, brsum, dssum, vlsum, blcd)
);

-- School Map | legacy NEWLIBGAEB/PBLADDIT (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/بيانات الملاحــــق خاص  بالمبنى.pdf
CREATE TABLE IF NOT EXISTS school_map.pbladdit (
  alcd INTEGER,
  alno INTEGER,
  aflno INTEGER,
  taddsp NUMERIC(10,2),
  sycrad INTEGER,
  mecrad INTEGER,
  stradd INTEGER,
  plwocd INTEGER,
  elwocd INTEGER,
  bradcd INTEGER,
  coutsw INTEGER,
  PRIMARY KEY (alcd, alno)
);

-- School Map | legacy NEWLIBGAEB/SEM001PF (source SRCPLAN) | خريطه مدرسيه نهائى/ملفات خريطة/م  التخطيط على مستوى القرية.pdf
CREATE TABLE IF NOT EXISTS school_map.sem001pf (
  brpln INTEGER,
  dspln INTEGER,
  vgpln INTEGER,
  vgname VARCHAR(20),
  clvinr INTEGER,
  clvden INTEGER,
  clvrep INTEGER,
  clvper INTEGER,
  clvpup INTEGER,
  clvrod INTEGER,
  clvsix INTEGER,
  clvmar INTEGER,
  clvhid INTEGER,
  sour1 INTEGER,
  sour2 INTEGER,
  PRIMARY KEY (vgpln)
);

-- School Map | legacy NEWLIBGAEB/FARM02PF (source SRCBLCD) | خريطه مدرسيه نهائى/ملفات خريطة/م  حدودالموقع العام للمزارع.pdf
CREATE TABLE IF NOT EXISTS school_map.farm02pf (
  blcd INTEGER,
  farmno INTEGER,
  dirsid INTEGER,
  lensid NUMERIC(6,2),
  angle NUMERIC(5,2),
  distxt VARCHAR(7),
  PRIMARY KEY (blcd, farmno, dirsid)
);

-- School Map | legacy NEWLIBGAEB/SCHSUM (source SRCPLAN) | خريطه مدرسيه نهائى/ملفات خريطة/م 100كثافات اكبر من.pdf
CREATE TABLE IF NOT EXISTS school_map.schsum (
  blcd INTEGER,
  stno INTEGER,
  des INTEGER,
  PRIMARY KEY (blcd)
);

-- School Map | legacy NEWLIBGAEB/SCHDES1F (source SCHSRC) | خريطه مدرسيه نهائى/ملفات خريطة/م احتياجات  رئيسى.pdf
CREATE TABLE IF NOT EXISTS school_map.schdes1f (
  desc VARCHAR(2),
  desnm VARCHAR(20),
  PRIMARY KEY (desc)
);

-- School Map | legacy NEWLIBGAEB/BULDCD1F (source PRTFL) | خريطه مدرسيه نهائى/ملفات خريطة/م اسم نوع المبنى.pdf
CREATE TABLE IF NOT EXISTS school_map.buldcd1f (
  kind INTEGER,
  kindnm VARCHAR(20),
  PRIMARY KEY (kind)
);

-- School Map | legacy NEWLIBGAEB/FARM01PF (source SRCBLCD) | خريطه مدرسيه نهائى/ملفات خريطة/م البيانـات الاساسيـة للمـزارع.pdf
CREATE TABLE IF NOT EXISTS school_map.farm01pf (
  blcd INTEGER,
  farmno INTEGER,
  farmnm VARCHAR(40),
  farmpo INTEGER,
  farmvg INTEGER,
  farmty INTEGER,
  farmow INTEGER,
  farmar NUMERIC(8,2),
  PRIMARY KEY (blcd, farmno)
);

-- School Map | legacy NEWLIBGAEB/PBLSROMN (source SRCBLCD) | خريطه مدرسيه نهائى/ملفات خريطة/م الفــراغـــات بالترتيب الجديد.pdf
CREATE TABLE IF NOT EXISTS school_map.pblsromn (
  blcd INTEGER,
  blno INTEGER,
  flno INTEGER,
  spcd INTEGER,
  spno INTEGER,
  spar NUMERIC(5,2),
  PRIMARY KEY (blcd, blno, flno, spcd, spno)
);

-- School Map | legacy NEWLIBGAEB/BULDCOD1 (source PRTFL) | خريطه مدرسيه نهائى/ملفات خريطة/م جميع أنواع المبانى+ القرى +المركز.pdf
CREATE TABLE IF NOT EXISTS school_map.buldcod1 (
  krcd INTEGER,
  kind INTEGER,
  buldcd INTEGER,
  dscd INTEGER,
  vgcd INTEGER,
  vilg1 INTEGER,
  buldnm VARCHAR(40),
  PRIMARY KEY (krcd, buldcd)
);

-- School Map | legacy NEWLIBGAEB/BULDCODF (source PRTFL) | خريطه مدرسيه نهائى/ملفات خريطة/م جميع أنواع المبانى.pdf
CREATE TABLE IF NOT EXISTS school_map.buldcodf (
  krcd INTEGER,
  kind INTEGER,
  buldcd INTEGER,
  buldnm VARCHAR(40),
  PRIMARY KEY (krcd, buldcd)
);

-- School Map | legacy NEWLIBGAEB/PLN02PF (source SRCPLAN) | خريطه مدرسيه نهائى/ملفات خريطة/م عدد فصول تم حلها فعلى.pdf
CREATE TABLE IF NOT EXISTS school_map.pln02pf (
  blcd01 INTEGER,
  PRIMARY KEY (blcd01)
);

-- School Map | legacy NEWLIBGAEB/PLN01PF (source SRCPLAN) | خريطه مدرسيه نهائى/ملفات خريطة/م عدد فصول تم حلها.pdf
CREATE TABLE IF NOT EXISTS school_map.pln01pf (
  mosum INTEGER,
  clss INTEGER,
  sta INTEGER,
  sdat INTEGER,
  PRIMARY KEY (mosum)
);

-- School Map | legacy NEWLIBGAEB/PROJSRPF (source PRTFL25) | خريطه مدرسيه نهائى/ملفات خريطة/م مسلسل الخطة.pdf
CREATE TABLE IF NOT EXISTS school_map.projsrpf (
  klcd1 INTEGER,
  date1 INTEGER,
  kwrk1 INTEGER,
  klno1 INTEGER,
  planno INTEGER,
  PRIMARY KEY (planno, date1, kwrk1, klcd1, klno1)
);

-- School Map | legacy NEWLIBGAEB/PELCOURS (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/مـــــــــلف الملاعب.pdf
CREATE TABLE IF NOT EXISTS school_map.pelcours (
  semosr INTEGER,
  kincur INTEGER,
  lenmos NUMERIC(4,2),
  widthm NUMERIC(4,2),
  mosoa NUMERIC(8,2),
  kinlan INTEGER,
  status INTEGER
);

-- School Map | legacy NEWLIBGAEB/DELB01PF (source DMGSRC) | خريطه مدرسيه نهائى/ملفات خريطة/مـلف المبانى الملغاة من المبنى التعليمى.pdf
CREATE TABLE IF NOT EXISTS school_map.delb01pf (
  blcd INTEGER,
  date INTEGER,
  kind INTEGER,
  user BIGINT,
  PRIMARY KEY (blcd, date)
);

-- School Map | legacy NEWLIBGAEB/SCH05SPF (source SRCPLAN) | خريطه مدرسيه نهائى/ملفات خريطة/ملــف بيــانــات الخطــة الخمسيــة المعتمدة.pdf
CREATE TABLE IF NOT EXISTS school_map.sch05spf (
  mossum INTEGER,
  mosbrn INTEGER,
  optsum INTEGER,
  yersum INTEGER,
  brsum INTEGER,
  dssum INTEGER,
  vlsum INTEGER,
  blcd INTEGER,
  clssum INTEGER,
  clssm1 INTEGER,
  clssm2 INTEGER,
  stage INTEGER,
  mokf INTEGER,
  solk INTEGER,
  proj INTEGER,
  dat INTEGER,
  PRIMARY KEY (mossum, optsum, yersum, brsum, dssum, vlsum, blcd)
);

-- School Map | legacy NEWLIBGAEB/PLN105PF (source SRCPLAN) | خريطه مدرسيه نهائى/ملفات خريطة/ملـف تجميعى  للخــطة التنفيـذيــة.pdf
CREATE TABLE IF NOT EXISTS school_map.pln105pf (
  blrd00 INTEGER,
  blrd01 BIGINT,
  s5 INTEGER,
  s5# INTEGER,
  s6 INTEGER,
  s8 INTEGER,
  s8# INTEGER,
  s9 INTEGER,
  s11 INTEGER,
  s11# INTEGER,
  s12 INTEGER,
  s14 INTEGER,
  s14# INTEGER,
  s15 INTEGER,
  s17 INTEGER,
  s17# INTEGER,
  s18 INTEGER,
  s23 INTEGER,
  s23# INTEGER,
  s24 INTEGER,
  s28 INTEGER,
  s28# INTEGER,
  s29 INTEGER,
  s30 INTEGER,
  s30# INTEGER,
  s31 INTEGER,
  s32 INTEGER,
  s32# INTEGER,
  s33 INTEGER,
  s34 INTEGER,
  s34# INTEGER,
  s35 INTEGER,
  s26 INTEGER,
  s26# INTEGER,
  s27 INTEGER,
  s36 INTEGER,
  s36# INTEGER,
  s37 INTEGER,
  date0 INTEGER,
  PRIMARY KEY (blrd00)
);

-- School Map | legacy NEWLIBGAEB/PBLWALL (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف اطوال السور.pdf
CREATE TABLE IF NOT EXISTS school_map.pblwall (
  lbld INTEGER,
  swnsu NUMERIC(5,2),
  mad INTEGER,
  mowah NUMERIC(4,2),
  lacd INTEGER,
  statu INTEGER,
  PRIMARY KEY (lbld, lacd)
);

-- School Map | legacy NEWLIBGAEB/SCHDBF07 (source SCHSRC) | خريطه مدرسيه نهائى/ملفات خريطة/ملف الاحلال الكلى والجزئى 2.pdf
CREATE TABLE IF NOT EXISTS school_map.schdbf07 (
  brcd7 INTEGER,
  dscd7 INTEGER,
  sgtyp INTEGER,
  dends INTEGER,
  stdno7 INTEGER,
  clsno7 INTEGER,
  clsds INTEGER,
  schds INTEGER,
  PRIMARY KEY (dscd7, sgtyp)
);

-- School Map | legacy NEWLIBGAEB/SCHDBF77 (source SCHSRC) | خريطه مدرسيه نهائى/ملفات خريطة/ملف الاحلال الكلى والجزئى.pdf
CREATE TABLE IF NOT EXISTS school_map.schdbf77 (
  brcd7 INTEGER,
  dscd7 INTEGER,
  sgtyp INTEGER,
  dends INTEGER,
  stdno7 INTEGER,
  clsno7 INTEGER,
  clsds INTEGER,
  schds INTEGER,
  year7 INTEGER,
  optno7 INTEGER,
  mosno INTEGER,
  PRIMARY KEY (dscd7, sgtyp, mosno)
);

-- School Map | legacy NEWLIBGAEB/PBLFLOOR (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف الادوار الخاص  بالمبنى التعليمى .pdf
CREATE TABLE IF NOT EXISTS school_map.pblfloor (
  flcd INTEGER,
  fblno INTEGER
);

-- School Map | legacy NEWLIBGAEB/PBLGATES (source TES) | خريطه مدرسيه نهائى/ملفات خريطة/ملف البوابات.pdf
CREATE TABLE IF NOT EXISTS school_map.pblgates (
  gatbl INTEGER,
  noofga INTEGER,
  gatycd INTEGER,
  noofg INTEGER,
  gatyc INTEGER,
  galen NUMERIC(4,2),
  gahid NUMERIC(4,2),
  gcount INTEGER,
  PRIMARY KEY (gatbl, noofga)
);

-- School Map | legacy NEWLIBGAEB/TES002PF (source SRCPLAN) | خريطه مدرسيه نهائى/ملفات خريطة/ملف البيـانات الاسـاسـية للكثافات.pdf
CREATE TABLE IF NOT EXISTS school_map.tes002pf (
  blcd# INTEGER,
  desn# INTEGER,
  room# INTEGER,
  sgcd# INTEGER,
  PRIMARY KEY (blcd#)
);

-- School Map | legacy NEWLIBGAEB/TES001PF (source SRCPLAN) | خريطه مدرسيه نهائى/ملفات خريطة/ملف البيـانات الاسـاسـية_للمحروم.pdf
CREATE TABLE IF NOT EXISTS school_map.tes001pf (
  vgcd# INTEGER,
  class# INTEGER,
  sgcd# INTEGER,
  PRIMARY KEY (vgcd#, sgcd#)
);

-- School Map | legacy NEWLIBGAEB/PBLINSPL (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف التجهيزات الصحية.pdf
CREATE TABLE IF NOT EXISTS school_map.pblinspl (
  ilcd INTEGER,
  iblno INTEGER,
  iispcd INTEGER,
  srspcd INTEGER,
  ilcdty INTEGER,
  noil INTEGER,
  eficn INTEGER,
  neficn INTEGER,
  excuef INTEGER
);

-- School Map | legacy NEWLIBGAEB/PBLSPPLS (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف التغذية.pdf
CREATE TABLE IF NOT EXISTS school_map.pblsppls (
  sblcd INTEGER,
  spyty INTEGER,
  PRIMARY KEY (sblcd, spyty)
);

-- School Map | legacy NEWLIBGAEB/PBLELSUP (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف التوصيلات الكهربائيـــــــة.pdf
CREATE TABLE IF NOT EXISTS school_map.pblelsup (
  elblc INTEGER,
  pscd INTEGER,
  met INTEGER,
  metcd INTEGER,
  sits INTEGER,
  tfps INTEGER,
  nooftf INTEGER,
  cbcs VARCHAR(40),
  concd INTEGER,
  psdis NUMERIC(6,2),
  PRIMARY KEY (elblc)
);

-- School Map | legacy NEWLIBGAEB/SCHPLNPF (source SCHSRC) | خريطه مدرسيه نهائى/ملفات خريطة/ملف الخطة.pdf
CREATE TABLE IF NOT EXISTS school_map.schplnpf (
  mossum INTEGER,
  mosbrn INTEGER,
  optsum INTEGER,
  yersum INTEGER,
  brsum INTEGER,
  dssum INTEGER,
  vlsum INTEGER,
  blcd INTEGER,
  clssum INTEGER,
  mokfp INTEGER,
  PRIMARY KEY (mossum, optsum, yersum)
);

-- School Map | legacy NEWLIBGAEB/SCHDBFPD (source SCHSRC) | خريطه مدرسيه نهائى/ملفات خريطة/ملف الزيادة السكانية السنويةالنهائى بالاولوية.pdf
CREATE TABLE IF NOT EXISTS school_map.schdbfpd (
  year INTEGER,
  brcdpu INTEGER,
  dscdpu INTEGER,
  vgcdpu INTEGER,
  pupin INTEGER,
  clspup INTEGER,
  clsreq INTEGER,
  mosno INTEGER,
  PRIMARY KEY (mosno, year, brcdpu, dscdpu)
);

-- School Map | legacy NEWLIBGAEB/PBLGASES (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف الغاز.pdf
CREATE TABLE IF NOT EXISTS school_map.pblgases (
  gald INTEGER,
  gblno1 INTEGER,
  schgs INTEGER,
  nogssy INTEGER,
  cougas INTEGER,
  PRIMARY KEY (gald, gblno1)
);

-- School Map | legacy NEWLIBGAEB/PBLINTRV (source TES) | خريطه مدرسيه نهائى/ملفات خريطة/ملف الفترة الدراسية.pdf
CREATE TABLE IF NOT EXISTS school_map.pblintrv (
  tmblc INTEGER,
  ivno INTEGER,
  intvtm INTEGER,
  schnm VARCHAR(40),
  bgcd1 INTEGER,
  sgcd INTEGER,
  edcdty INTEGER,
  statu INTEGER,
  rimg VARCHAR(40),
  sdcdt INTEGER,
  tmal INTEGER,
  tfmal INTEGER,
  coutp INTEGER,
  noots INTEGER,
  nclas INTEGER,
  PRIMARY KEY (tmblc, ivno)
);

-- School Map | legacy NEWLIBGAEB/PBLSROOM (source TES) | خريطه مدرسيه نهائى/ملفات خريطة/ملف الفراغات.pdf
CREATE TABLE IF NOT EXISTS school_map.pblsroom (
  frblcd INTEGER,
  frbscd INTEGER,
  spcd INTEGER,
  frgsr INTEGER,
  lent NUMERIC(4,2),
  wdth NUMERIC(4,2),
  roar NUMERIC(5,2)
);

-- School Map | legacy NEWLIBGAEB/PBLSROM (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف الفراغــــات.pdf
CREATE TABLE IF NOT EXISTS school_map.pblsrom (
  spcd INTEGER,
  frgsr INTEGER,
  lent NUMERIC(4,2),
  wdth NUMERIC(4,2)
);

-- School Map | legacy NEWLIBGAEB/PBLSROM (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف الفراغــــات1.pdf
CREATE TABLE IF NOT EXISTS school_map.pblsrom_pbl (
  spcd INTEGER,
  frgsr INTEGER,
  lent NUMERIC(4,2),
  wdth NUMERIC(4,2)
);

-- School Map | legacy NEWLIBGAEB/PBLROOMS (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف الفصول المرشدة فى الدورلترشيد الفراغات.pdf
CREATE TABLE IF NOT EXISTS school_map.pblrooms (
  blcd INTEGER,
  rblno INTEGER,
  rflor INTEGER,
  rkin INTEGER,
  rcoun INTEGER,
  PRIMARY KEY (blcd, rblno, rflor, rkin)
);

-- School Map | legacy NEWLIBGAEB/PBLEFECT (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف المحيطات المؤثرة الخاص  بالمبنى التعليمى.pdf
CREATE TABLE IF NOT EXISTS school_map.pblefect (
  elcd INTEGER,
  efcdty INTEGER,
  efcd INTEGER,
  PRIMARY KEY (elcd, efcdty)
);

-- School Map | legacy NEWLIBGAEB/PBLAREAS (source TES) | خريطه مدرسيه نهائى/ملفات خريطة/ملف المساحات.pdf
CREATE TABLE IF NOT EXISTS school_map.pblareas (
  arblc INTEGER,
  gnflar NUMERIC(8,3),
  soar NUMERIC(8,3),
  gespar NUMERIC(8,3),
  mosoar NUMERIC(8,3),
  plar NUMERIC(8,3),
  tflar NUMERIC(9,3),
  PRIMARY KEY (arblc)
);

-- School Map | legacy NEWLIBGAEB/PBLLEVEL (source TES) | خريطه مدرسيه نهائى/ملفات خريطة/ملف المناسيب.pdf
CREATE TABLE IF NOT EXISTS school_map.pbllevel (
  lvbl INTEGER,
  lbno INTEGER,
  marall NUMERIC(3,2),
  frflll NUMERIC(3,2),
  grflll NUMERIC(3,2),
  seqlvl NUMERIC(5,2),
  PRIMARY KEY (lvbl, lbno)
);

-- School Map | legacy NEWLIBGAEB/PBLLEVEL (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف المنـــــــــــــاسيب.pdf
CREATE TABLE IF NOT EXISTS school_map.pbllevel_pbl (
  lvbl INTEGER,
  lbno INTEGER,
  marall NUMERIC(3,2),
  frflll NUMERIC(3,2),
  grflll NUMERIC(3,2),
  seqlvl NUMERIC(5,2),
  PRIMARY KEY (lvbl, lbno)
);

-- School Map | legacy NEWLIBGAEB/CLOS00PF (source SRCCLOS) | خريطه مدرسيه نهائى/ملفات خريطة/ملف بيانات المغلقات.pdf
CREATE TABLE IF NOT EXISTS school_map.clos00pf (
  krcd INTEGER,
  klcd INTEGER,
  mol7k INTEGER,
  tyc INTEGER,
  moltyp INTEGER,
  clsdt INTEGER,
  krarez INTEGER,
  dateez INTEGER,
  datmez INTEGER,
  hdate INTEGER,
  PRIMARY KEY (krcd, klcd, mol7k)
);

-- School Map | legacy NEWLIBGAEB/PBLDMG17 (source DMGSRC) | خريطه مدرسيه نهائى/ملفات خريطة/ملف بيانات دمج مدارس .pdf
CREATE TABLE IF NOT EXISTS school_map.pbldmg17 (
  ordrno INTEGER,
  blcda INTEGER,
  blcdb INTEGER,
  dmgdt INTEGER,
  PRIMARY KEY (ordrno, blcda, blcdb)
);

-- School Map | legacy NEWLIBGAEB/PBLSWLOK (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف صرف على خندق .pdf
CREATE TABLE IF NOT EXISTS school_map.pblswlok (
  plcd INTEGER,
  trulg NUMERIC(5,2),
  truwd NUMERIC(5,2),
  trudh NUMERIC(5,2),
  PRIMARY KEY (plcd)
);

-- School Map | legacy NEWLIBGAEB/PBLBULDG (source PBL) | خريطه مدرسيه نهائى/ملفات خريطة/ملف مبنى التعليمى.pdf
CREATE TABLE IF NOT EXISTS school_map.pblbuldg (
  becd INTEGER,
  blrd INTEGER,
  blcd INTEGER,
  shnm VARCHAR(40),
  edara INTEGER,
  tycd INTEGER,
  dscd INTEGER,
  vgcd INTEGER,
  cicd INTEGER,
  street VARCHAR(40),
  strno INTEGER,
  bltl BIGINT,
  ldowcd INTEGER,
  blowcd INTEGER,
  tyc INTEGER,
  vilg INTEGER,
  bgcd INTEGER,
  tblno INTEGER,
  cotmk INTEGER,
  cotes INTEGER,
  cotev INTEGER,
  nousiv INTEGER,
  PRIMARY KEY (blcd)
);

-- School Map | legacy NEWLIBGAEB/SCHMHMPF (source SRCPLAN) | خريطه مدرسيه نهائى/ملفات خريطة/ملف مسلاسلات محروم ثانوي عام وصناعي.pdf
CREATE TABLE IF NOT EXISTS school_map.schmhmpf (
  mhmsum INTEGER,
  typ INTEGER,
  PRIMARY KEY (mhmsum)
);

-- School Map | legacy NEWLIBGAEB/PLN501PF (source SRCPLAN) | خريطه مدرسيه نهائى/ملفات خريطة/ملف يحتوى على مسلسلات كثافة تم اضافتها من قبل.pdf
CREATE TABLE IF NOT EXISTS school_map.pln501pf (
  mossum INTEGER,
  mosbrn INTEGER,
  optsum INTEGER,
  yersum INTEGER,
  brsum INTEGER,
  dssum INTEGER,
  vlsum INTEGER,
  blcd INTEGER,
  clssum INTEGER,
  clssm1 INTEGER,
  clssm2 INTEGER,
  stage INTEGER,
  mokf INTEGER,
  solk INTEGER,
  proj INTEGER,
  dat INTEGER,
  PRIMARY KEY (mossum, optsum, yersum, brsum, dssum, vlsum, blcd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV001PF (source BIL02SRC) | مستخلصات فنيه/مستخلصات أنشاء/برامج/Session B - [24 x 80]_16.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv001pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  docty INTEGER,
  begdate INTEGER,
  enddate INTEGER,
  bilvlu NUMERIC(10,2),
  concd INTEGER,
  plyear INTEGER,
  strcd INTEGER,
  bilend INTEGER,
  PRIMARY KEY (blcd, subtyp, ttncd, doccd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV002PF (source BIL02SRC) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/17.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv002pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  mlcd INTEGER,
  itmcd INTEGER,
  itqtyy NUMERIC(8,2),
  ituntpr NUMERIC(9,2),
  PRIMARY KEY (blcd, subtyp, ttncd, doccd, mlcd, itmcd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV003PF (source BIL02SRC) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/18.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv003pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  mlcd INTEGER,
  itmcd INTEGER,
  typsub INTEGER,
  resl INTEGER,
  qstk NUMERIC(5,2),
  PRIMARY KEY (blcd, subtyp, ttncd, doccd, mlcd, itmcd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV004PF (source BIL02SRC) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/19.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv004pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  itmcd INTEGER,
  lohser INTEGER,
  itmloc INTEGER,
  numfl INTEGER,
  typewrksh INTEGER,
  serial INTEGER,
  mlcd INTEGER,
  lohnum INTEGER,
  PRIMARY KEY (blcd, subtyp, ttncd, doccd, mlcd, itmcd, lohser)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV005PF (source BIL02SRC) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/20.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv005pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  pilval NUMERIC(9,2),
  PRIMARY KEY (blcd, subtyp, ttncd, doccd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV006PF (source BIL02SRC) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/21.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv006pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  wrkcd INTEGER,
  incrm NUMERIC(9,2),
  PRIMARY KEY (blcd, subtyp, ttncd, doccd, wrkcd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV007PF (source BIL02SRC) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/22.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv007pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  mlcd INTEGER,
  itmcd INTEGER,
  lohser INTEGER,
  typsub INTEGER,
  resl INTEGER,
  qstk NUMERIC(5,2),
  PRIMARY KEY (blcd, subtyp, ttncd, doccd, mlcd, itmcd, lohser)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV008PF (source BIL02SRC) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/23.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv008pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  mlcd INTEGER,
  itmcd INTEGER,
  typsub INTEGER,
  resl INTEGER,
  qstk NUMERIC(5,2),
  PRIMARY KEY (blcd, subtyp, ttncd, doccd, mlcd, itmcd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV009PF (source BIL02SRC) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/24.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv009pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  trmsr INTEGER,
  trmnm VARCHAR(15),
  trmqty NUMERIC(6,2),
  trmprc NUMERIC(8,2),
  trmval NUMERIC(9,2),
  PRIMARY KEY (blcd, subtyp, ttncd, doccd, trmsr)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV010PF (source BIL02SRC) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/25.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv010pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  PRIMARY KEY (blcd, subtyp, ttncd, doccd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INVO01PF (source NGHADA) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/26.pdf
CREATE TABLE IF NOT EXISTS abstracts.invo01pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  opnsr INTEGER,
  docty INTEGER,
  begdate INTEGER,
  enddate INTEGER,
  bilvlu NUMERIC(12,2),
  concd INTEGER,
  plyear INTEGER,
  strcd INTEGER,
  bilend INTEGER,
  opncause INTEGER,
  opndat INTEGER,
  opnusr BIGINT,
  PRIMARY KEY (blcd, subtyp, ttncd, doccd, opnsr)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV001PF (source NGHADA) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/27.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv001pf_nghada (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  docty INTEGER,
  begdate INTEGER,
  enddate INTEGER,
  bilvlu NUMERIC(12,2),
  concd INTEGER,
  plyear INTEGER,
  strcd INTEGER,
  bilend INTEGER,
  PRIMARY KEY (blcd, subtyp, ttncd, doccd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV010PF (source NGHADA) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/28.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv010pf_nghada (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  PRIMARY KEY (blcd, subtyp, ttncd, doccd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV001PF (source NGHADA) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/29.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv001pf_nghada (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  docty INTEGER,
  begdate INTEGER,
  enddate INTEGER,
  bilvlu NUMERIC(12,2),
  concd INTEGER,
  plyear INTEGER,
  strcd INTEGER,
  bilend INTEGER,
  PRIMARY KEY (blcd, subtyp, ttncd, doccd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INV010PF (source NGHADA) | مستخلصات فنيه/مستخلصات أنشاء/ملفات/30.pdf
CREATE TABLE IF NOT EXISTS abstracts.inv010pf_nghada (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  PRIMARY KEY (blcd, subtyp, ttncd, doccd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INM001PF (source BILM5SRC) | مستخلصات فنيه/مستخلصات صيانه/ملفات مستخلصات صيانه/32.pdf
CREATE TABLE IF NOT EXISTS abstracts.inm001pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  docty INTEGER,
  begdate INTEGER,
  enddate INTEGER,
  bilvlu NUMERIC(10,2),
  concd INTEGER,
  plyear INTEGER,
  strcd INTEGER,
  bilend INTEGER,
  PRIMARY KEY (blcd, subtyp, ttncd, plyear, strcd, doccd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INM002PF (source BILM5SRC) | مستخلصات فنيه/مستخلصات صيانه/ملفات مستخلصات صيانه/33.pdf
CREATE TABLE IF NOT EXISTS abstracts.inm002pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  plyear INTEGER,
  strcd INTEGER,
  doccd INTEGER,
  itmcd INTEGER,
  itqtyy NUMERIC(8,2),
  ituntpr NUMERIC(9,2),
  PRIMARY KEY (blcd, subtyp, ttncd, plyear, strcd, doccd, itmcd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INM003PF (source BILM5SRC) | مستخلصات فنيه/مستخلصات صيانه/ملفات مستخلصات صيانه/34.pdf
CREATE TABLE IF NOT EXISTS abstracts.inm003pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  plyear INTEGER,
  strcd INTEGER,
  doccd INTEGER,
  itmcd INTEGER,
  typsub INTEGER,
  resl INTEGER,
  qstk NUMERIC(5,2),
  PRIMARY KEY (blcd, subtyp, ttncd, plyear, strcd, doccd, itmcd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INM004PF (source BILM5SRC) | مستخلصات فنيه/مستخلصات صيانه/ملفات مستخلصات صيانه/35.pdf
CREATE TABLE IF NOT EXISTS abstracts.inm004pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  doccd INTEGER,
  itmcd INTEGER,
  lohser INTEGER,
  itmloc INTEGER,
  numfl INTEGER,
  typewrksh INTEGER,
  serial INTEGER,
  lohnum INTEGER,
  PRIMARY KEY (blcd, subtyp, ttncd, doccd, itmcd, lohser)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INM005PF (source BILM5SRC) | مستخلصات فنيه/مستخلصات صيانه/ملفات مستخلصات صيانه/36.pdf
CREATE TABLE IF NOT EXISTS abstracts.inm005pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  plyear INTEGER,
  strcd INTEGER,
  doccd INTEGER,
  pilval NUMERIC(9,2),
  PRIMARY KEY (blcd, subtyp, ttncd, plyear, strcd, doccd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INM006PF (source BILM5SRC) | مستخلصات فنيه/مستخلصات صيانه/ملفات مستخلصات صيانه/37.pdf
CREATE TABLE IF NOT EXISTS abstracts.inm006pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  plyear INTEGER,
  strcd INTEGER,
  doccd INTEGER,
  wrkcd INTEGER,
  incrm NUMERIC(9,2),
  PRIMARY KEY (blcd, subtyp, ttncd, plyear, strcd, doccd, wrkcd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INM007PF (source BILM5SRC) | مستخلصات فنيه/مستخلصات صيانه/ملفات مستخلصات صيانه/38.pdf
CREATE TABLE IF NOT EXISTS abstracts.inm007pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  plyear INTEGER,
  strcd INTEGER,
  doccd INTEGER,
  mlcd INTEGER,
  itmcd INTEGER,
  lohser INTEGER,
  typsub INTEGER,
  resl INTEGER,
  qstk NUMERIC(5,2),
  PRIMARY KEY (blcd, subtyp, ttncd, plyear, strcd, doccd, itmcd, lohser)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INM009PF (source BILM5SRC) | مستخلصات فنيه/مستخلصات صيانه/ملفات مستخلصات صيانه/39.pdf
CREATE TABLE IF NOT EXISTS abstracts.inm009pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  plyear INTEGER,
  strcd INTEGER,
  doccd INTEGER,
  trmsr INTEGER,
  trmnm VARCHAR(15),
  trmqty NUMERIC(6,2),
  trmprc NUMERIC(8,2),
  trmval NUMERIC(9,2),
  PRIMARY KEY (blcd, subtyp, ttncd, plyear, strcd, doccd, trmsr)
);

-- Technical Abstracts | legacy NEWLIBGAEB/INM010PF (source BILM5SRC) | مستخلصات فنيه/مستخلصات صيانه/ملفات مستخلصات صيانه/40.pdf
CREATE TABLE IF NOT EXISTS abstracts.inm010pf (
  blcd INTEGER,
  subtyp INTEGER,
  ttncd BIGINT,
  plyear INTEGER,
  strcd INTEGER,
  doccd INTEGER,
  PRIMARY KEY (blcd, subtyp, ttncd, plyear, strcd, doccd)
);

-- Technical Abstracts | legacy NEWLIBGAEB/MXM001PF (source BILM5SRC) | مستخلصات فنيه/مستخلصات صيانه/ملفات مستخلصات صيانه/41.pdf
CREATE TABLE IF NOT EXISTS abstracts.mxm001pf (
  blcd INTEGER,
  type INTEGER,
  tetnno BIGINT,
  exmser INTEGER,
  brcd INTEGER,
  year INTEGER,
  strcd INTEGER,
  exmdate INTEGER,
  exmend INTEGER,
  exmval NUMERIC(9,2),
  PRIMARY KEY (blcd, type, tetnno, year, strcd, exmser)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/#BYPRTGR (source CONTRACT) | مشتريات/ملفات مشتريات/أجزاء مجموعه.pdf
CREATE TABLE IF NOT EXISTS purchases.n_byprtgr (
  type INTEGER,
  tetnno BIGINT,
  tbulno INTEGER,
  grpno INTEGER,
  tbulnm VARCHAR(40),
  tndvpg NUMERIC(6,3),
  pmdvdt INTEGER,
  fidvdt INTEGER,
  plcdt INTEGER,
  empno INTEGER,
  strdat INTEGER,
  mocvl NUMERIC(10,2),
  totvl NUMERIC(10,2),
  PRIMARY KEY (type, tetnno, grpno, tbulno)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/PBYPARTT (source CONTRACT) | مشتريات/ملفات مشتريات/أجزاء مناقصة.pdf
CREATE TABLE IF NOT EXISTS purchases.pbypartt (
  type INTEGER,
  tetnno BIGINT,
  tnsrno INTEGER,
  tnsrnm VARCHAR(40),
  coneng VARCHAR(40),
  strdat INTEGER,
  blmono INTEGER,
  empno INTEGER,
  pmtho1 INTEGER,
  tofl NUMERIC(4,2),
  tndedt INTEGER,
  tnpbdt INTEGER,
  supcd1 INTEGER,
  tndvp NUMERIC(6,3),
  bfvl NUMERIC(10,2),
  pr NUMERIC(10,2),
  megr NUMERIC(10,2),
  pmdvdt INTEGER,
  fidvdt INTEGER,
  cecd INTEGER,
  brcd INTEGER,
  edcd INTEGER,
  lvcd INTEGER,
  tnsrsu INTEGER,
  ddvunp INTEGER,
  extime INTEGER,
  pch INTEGER,
  exdate INTEGER,
  nvl1 INTEGER,
  tnprpe NUMERIC(10,2),
  tnprvl BIGINT,
  strcd INTEGER,
  plcdt INTEGER,
  tnprp NUMERIC(5,2),
  PRIMARY KEY (type, tetnno, tnsrno)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/#BYSUT# (source CONTRACT) | مشتريات/ملفات مشتريات/أستبعاد عطاء.pdf
CREATE TABLE IF NOT EXISTS purchases.n_bysutn_ (
  type INTEGER,
  tetnno BIGINT,
  tnsrno INTEGER,
  spcd INTEGER,
  bbvl NUMERIC(10,2),
  pmthod INTEGER,
  pbrcno INTEGER,
  tofvl NUMERIC(12,3),
  oftime INTEGER,
  ofprdt INTEGER,
  pbsu INTEGER,
  pbvl NUMERIC(12,2),
  prec NUMERIC(4,2),
  tt NUMERIC(12,3),
  tt1 INTEGER,
  dd NUMERIC(2,1),
  qx NUMERIC(12,3),
  qx1 NUMERIC(12,3),
  qx2 NUMERIC(4,2),
  qx3 INTEGER,
  ofno1 INTEGER,
  ofno2 INTEGER,
  notce VARCHAR(320),
  not VARCHAR(80),
  PRIMARY KEY (type, tetnno, tnsrno, spcd)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/#BYMBER (source CONTRACT) | مشتريات/ملفات مشتريات/ألجنه المظاريف.pdf
CREATE TABLE IF NOT EXISTS purchases.n_bymber (
  type INTEGER,
  tetnno BIGINT,
  seral INTEGER,
  typr INTEGER,
  nampr VARCHAR(40),
  PRIMARY KEY (type, tetnno, seral)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/PBYMANT (source CONTRACT) | مشتريات/ملفات مشتريات/أوامر شغل .pdf
CREATE TABLE IF NOT EXISTS purchases.pbymant (
  type INTEGER,
  tetnno BIGINT,
  grpno INTEGER,
  tblno INTEGER,
  ordno INTEGER,
  tbulnm VARCHAR(40),
  ordvl NUMERIC(10,2),
  tolf NUMERIC(5,2),
  extim NUMERIC(6,3),
  adrcd INTEGER,
  wrkdt INTEGER,
  strdt INTEGER,
  prmdt INTEGER,
  findt INTEGER,
  stcd INTEGER,
  mtcd INTEGER,
  PRIMARY KEY (type, tetnno, grpno, tblno, ordno)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/#BYOF (source CONTRACT) | مشتريات/ملفات مشتريات/الأحاله.pdf
CREATE TABLE IF NOT EXISTS purchases.n_byof (
  type INTEGER,
  tetnno BIGINT,
  PRIMARY KEY (type, tetnno)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/#BYSUTN (source CONTRACT) | مشتريات/ملفات مشتريات/العطاء.pdf
CREATE TABLE IF NOT EXISTS purchases.n_bysutn (
  type INTEGER,
  tetnno BIGINT,
  tnsrno INTEGER,
  cmpnm VARCHAR(40),
  spcd INTEGER,
  bbvl NUMERIC(10,2),
  pmthod INTEGER,
  pbrcno INTEGER,
  tofvl NUMERIC(12,3),
  oftime INTEGER,
  ofprdt INTEGER,
  pbsu INTEGER,
  pbvl NUMERIC(12,2),
  prec NUMERIC(4,2),
  tt NUMERIC(12,3),
  tt1 INTEGER,
  dd NUMERIC(2,1),
  qx NUMERIC(12,3),
  qx1 NUMERIC(12,3),
  qxx NUMERIC(6,3),
  qxxp NUMERIC(6,3),
  qxx1 NUMERIC(12,3),
  qxx2 NUMERIC(12,3),
  qx2 NUMERIC(4,2),
  qx3 INTEGER,
  w# INTEGER,
  ofno1 INTEGER,
  ofno2 INTEGER,
  notce VARCHAR(320),
  PRIMARY KEY (type, tetnno, tnsrno, spcd)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/#BYNOTES (source CONTRACT) | مشتريات/ملفات مشتريات/كراسه الشروط.pdf
CREATE TABLE IF NOT EXISTS purchases.n_bynotes (
  type INTEGER,
  tetnno BIGINT,
  tnsrno INTEGER,
  supcd2 INTEGER,
  dcrcno INTEGER,
  dcbydt INTEGER,
  PRIMARY KEY (type, tetnno, tnsrno, supcd2)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/#BYCMT (source CONTRACT) | مشتريات/ملفات مشتريات/لجنه البت أ.pdf
CREATE TABLE IF NOT EXISTS purchases.n_bycmt (
  type INTEGER,
  tetnno BIGINT,
  number INTEGER,
  numrc INTEGER,
  nmtyp VARCHAR(1),
  namrc VARCHAR(40),
  PRIMARY KEY (type, tetnno, number, numrc)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/#BYSHW (source CONTRACT) | مشتريات/ملفات مشتريات/لجنه المظاريف.pdf
CREATE TABLE IF NOT EXISTS purchases.n_byshw (
  type INTEGER,
  tetnno BIGINT,
  number INTEGER,
  date INTEGER,
  add VARCHAR(40),
  date1 INTEGER,
  subt INTEGER,
  PRIMARY KEY (type, tetnno, number)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/PBYCLAIM (source CONTRACT) | مشتريات/ملفات مشتريات/مستخلص.pdf
CREATE TABLE IF NOT EXISTS purchases.pbyclaim (
  type INTEGER,
  tetnno BIGINT,
  tnsrno INTEGER,
  clmno INTEGER,
  cnno INTEGER,
  supcd2 INTEGER,
  tnitnk INTEGER,
  pct NUMERIC(3,3),
  tnitst BIGINT,
  ofardt INTEGER,
  ofatdt INTEGER,
  indt INTEGER,
  outdt INTEGER,
  rcdt INTEGER,
  dgvcd INTEGER,
  bpyser INTEGER,
  clmtv NUMERIC(12,2),
  clmvl NUMERIC(10,2),
  pevl NUMERIC(10,2),
  clvl NUMERIC(10,2),
  pp NUMERIC(10,2),
  tvl NUMERIC(10,2),
  lprt INTEGER,
  lprtv NUMERIC(10,2),
  gh NUMERIC(10,2),
  PRIMARY KEY (clmno, type, tetnno, tnsrno, supcd2)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/#BYOFFRS (source CONTRACT) | مشتريات/ملفات مشتريات/مفاوضات .pdf
CREATE TABLE IF NOT EXISTS purchases.n_byoffrs (
  type INTEGER,
  tetnno BIGINT,
  tnsrno INTEGER,
  spcd INTEGER,
  number INTEGER,
  brn VARCHAR(30),
  ad VARCHAR(40),
  cc VARCHAR(40),
  tndedt INTEGER,
  tfvl NUMERIC(12,3),
  oftime INTEGER,
  pbsu INTEGER,
  pbvl NUMERIC(12,2),
  rr VARCHAR(20),
  sw NUMERIC(4,2),
  ptt1 INTEGER,
  dd NUMERIC(2,1),
  pqxx NUMERIC(6,3),
  qxx1 NUMERIC(12,3),
  qxx2 NUMERIC(12,3),
  qx31 INTEGER,
  ofno1 INTEGER,
  ofno2 INTEGER,
  w1 INTEGER,
  swpq VARCHAR(160),
  PRIMARY KEY (type, tetnno, tnsrno, spcd, number)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/PBYSUPL1 (source CONTRACT) | مشتريات/ملفات مشتريات/مقاول1.pdf
CREATE TABLE IF NOT EXISTS purchases.pbysupl1 (
  cmpnm VARCHAR(40),
  blrd INTEGER,
  cndl INTEGER,
  clasf INTEGER,
  suptyp INTEGER,
  supcnt INTEGER
);

-- Purchases & Contracts | legacy NEWLIBGAEB/PBYSUPL2 (source CONTRACT) | مشتريات/ملفات مشتريات/مقاول2.pdf
CREATE TABLE IF NOT EXISTS purchases.pbysupl2 (
  supcd INTEGER,
  supkn INTEGER,
  cmpnq VARCHAR(80),
  bnkcd INTEGER,
  haccd VARCHAR(30),
  PRIMARY KEY (supcd, supkn)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/PBYTENDR (source CONTRACT) | مشتريات/ملفات مشتريات/مناقصه.pdf
CREATE TABLE IF NOT EXISTS purchases.pbytendr (
  type INTEGER,
  tetnno BIGINT,
  bdalcd INTEGER,
  bdy INTEGER,
  bdcd INTEGER,
  tnanm VARCHAR(40),
  tnandt INTEGER,
  tesu INTEGER,
  finmod VARCHAR(1),
  PRIMARY KEY (type, tetnno)
);

-- Purchases & Contracts | legacy NEWLIBGAEB/#BYPBLSH (source CONTRACT) | مشتريات/ملفات مشتريات/نشر.pdf
CREATE TABLE IF NOT EXISTS purchases.n_bypblsh (
  type INTEGER,
  tetnno BIGINT,
  dasrno INTEGER,
  dates INTEGER,
  journl VARCHAR(40),
  PRIMARY KEY (type, tetnno, dasrno)
);

-- Real Estate | legacy NEWLIBGAEB/REMV07PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/أستمارات البيع .pdf
CREATE TABLE IF NOT EXISTS real_estate.remv07pf (
  blcd INTEGER,
  nume INTEGER,
  name VARCHAR(40),
  numm INTEGER,
  dat INTEGER,
  area NUMERIC(10,4),
  type INTEGER,
  PRIMARY KEY (blcd, nume)
);

-- Real Estate | legacy NEWLIBGAEB/REMV09PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/أكواد النزاع.pdf
CREATE TABLE IF NOT EXISTS real_estate.remv09pf (
  remty INTEGER,
  remnm VARCHAR(30),
  PRIMARY KEY (remty)
);

-- Real Estate | legacy NEWLIBGAEB/REMV05PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/الأستيلاء المؤقت.pdf
CREATE TABLE IF NOT EXISTS real_estate.remv05pf (
  blcd INTEGER,
  nume INTEGER,
  dat1 BIGINT,
  num INTEGER,
  dat2 INTEGER,
  PRIMARY KEY (blcd, nume)
);

-- Real Estate | legacy NEWLIBGAEB/REMV10PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/القرار النهائى.pdf
CREATE TABLE IF NOT EXISTS real_estate.remv10pf (
  blcd INTEGER,
  pricn NUMERIC(12,3),
  chnum BIGINT,
  dat3 INTEGER,
  PRIMARY KEY (blcd, chnum)
);

-- Real Estate | legacy NEWLIBGAEB/REMV09PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/ب أكواد النزاع.pdf
CREATE TABLE IF NOT EXISTS real_estate.remv09pf_srcrent1 (
  remty INTEGER,
  remnm VARCHAR(30),
  PRIMARY KEY (remty)
);

-- Real Estate | legacy NEWLIBGAEB/REMV04PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/تكاليف الأعمال .pdf
CREATE TABLE IF NOT EXISTS real_estate.remv04pf (
  blcd INTEGER,
  numc BIGINT,
  dat1 INTEGER,
  chpr NUMERIC(9,2),
  PRIMARY KEY (blcd, numc)
);

-- Real Estate | legacy NEWLIBGAEB/REMV12PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/صحيفه .pdf
CREATE TABLE IF NOT EXISTS real_estate.remv12pf (
  blcd INTEGER,
  unitno INTEGER,
  hno INTEGER,
  hname VARCHAR(40),
  reason VARCHAR(40),
  dat INTEGER,
  area NUMERIC(10,4),
  PRIMARY KEY (blcd, unitno)
);

-- Real Estate | legacy NEWLIBGAEB/REMV03PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/قرار الوزير.pdf
CREATE TABLE IF NOT EXISTS real_estate.remv03pf (
  blcd INTEGER,
  numd INTEGER,
  dat1 INTEGER,
  numm INTEGER,
  dat2 INTEGER,
  area NUMERIC(10,4),
  numn INTEGER,
  datn INTEGER,
  PRIMARY KEY (blcd, numd)
);

-- Real Estate | legacy NEWLIBGAEB/REMV02PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/كشف العروض.pdf
CREATE TABLE IF NOT EXISTS real_estate.remv02pf (
  brcd INTEGER,
  blcd INTEGER,
  numd INTEGER,
  dat1 BIGINT,
  numn INTEGER,
  dat2 INTEGER,
  proj INTEGER,
  numo INTEGER,
  datf INTEGER,
  datt INTEGER,
  mpric NUMERIC(9,2),
  nume INTEGER,
  PRIMARY KEY (blcd, numd)
);

-- Real Estate | legacy NEWLIBGAEB/REMV06PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/كشوف العرض.pdf
CREATE TABLE IF NOT EXISTS real_estate.remv06pf (
  blcd INTEGER,
  numd INTEGER,
  ser INTEGER,
  name VARCHAR(40),
  area NUMERIC(10,4),
  PRIMARY KEY (blcd, numd, ser)
);

-- Real Estate | legacy NEWLIBGAEB/REMV08PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/موافقه الموقف الشعبى.pdf
CREATE TABLE IF NOT EXISTS real_estate.remv08pf (
  blcd INTEGER,
  numm INTEGER,
  dat1 INTEGER,
  PRIMARY KEY (blcd, numm)
);

-- Real Estate | legacy NEWLIBGAEB/REMV01PF (source SRCRENT1) | ملكيه عقاريه/ملكيه عقاريه نزع ملكيه/نزع ملكيه.pdf
CREATE TABLE IF NOT EXISTS real_estate.remv01pf (
  brcd INTEGER,
  blcd INTEGER,
  area NUMERIC(9,3),
  areab NUMERIC(9,3),
  areaa NUMERIC(9,3),
  remty INTEGER,
  mokf INTEGER,
  dat1 INTEGER,
  lnpr NUMERIC(9,2),
  blpr NUMERIC(9,2),
  tot NUMERIC(10,2),
  dat3 INTEGER,
  lnpr1 NUMERIC(9,2),
  klcd INTEGER,
  numb BIGINT,
  dat4 INTEGER,
  lnpr2 NUMERIC(9,2),
  pricm NUMERIC(9,2),
  chnum BIGINT,
  dat2 INTEGER,
  remtyp INTEGER,
  PRIMARY KEY (blcd)
);

-- Real Estate | legacy NEWLIBGAEB/GRN002PF (source SRCMAP2) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/أدخال موافقه العقاريه.pdf
CREATE TABLE IF NOT EXISTS real_estate.grn002pf (
  lndid INTEGER,
  PRIMARY KEY (lndid)
);

-- Real Estate | legacy NEWLIBGAEB/PRC002PF (source RECORD) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/أراضى بيانات أساسيه.pdf
CREATE TABLE IF NOT EXISTS real_estate.prc002pf (
  lndcod INTEGER,
  lndgov INTEGER,
  lndadr VARCHAR(40),
  lndown VARCHAR(40),
  lndowr VARCHAR(40),
  owncd INTEGER,
  lndare NUMERIC(8,2),
  lndphy INTEGER,
  lndnor VARCHAR(40),
  lndln1 NUMERIC(7,2),
  lndsou VARCHAR(40),
  lndln2 NUMERIC(7,2),
  lndest VARCHAR(40),
  lndln3 NUMERIC(7,2),
  lndwst VARCHAR(40),
  lndln4 NUMERIC(7,2),
  empno1 INTEGER,
  empno2 INTEGER,
  askdat INTEGER,
  techdt INTEGER,
  PRIMARY KEY (lndcod)
);

-- Real Estate | legacy NEWLIBGAEB/PBLLND05 (source SRCMAP1) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/حدود الموقع العام.pdf
CREATE TABLE IF NOT EXISTS real_estate.pbllnd05 (
  lndno INTEGER,
  dirsid INTEGER,
  lensid NUMERIC(6,2),
  neibr INTEGER,
  nebrout NUMERIC(4,2),
  neixt VARCHAR(40),
  wall INTEGER,
  PRIMARY KEY (lndno, dirsid)
);

-- Real Estate | legacy NEWLIBGAEB/GRN001PF (source SRCMAP2) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/ربط الشئون القانونيه بالأراضى.pdf
CREATE TABLE IF NOT EXISTS real_estate.grn001pf (
  lndno INTEGER,
  lndid INTEGER,
  PRIMARY KEY (lndno)
);

-- Real Estate | legacy NEWLIBGAEB/PBLLND02 (source SRCMAP1) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م  أعضاء اللجان.pdf
CREATE TABLE IF NOT EXISTS real_estate.pbllnd02 (
  cmtno INTEGER,
  cmttyp INTEGER,
  mbrno INTEGER,
  PRIMARY KEY (cmttyp, cmtno, mbrno)
);

-- Real Estate | legacy NEWLIBGAEB/GRN001PF (source SRCMAP2) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م  ـأرض الشـئون القانونية.pdf
CREATE TABLE IF NOT EXISTS real_estate.grn001pf_srcmap2 (
  lndno INTEGER,
  lndid INTEGER,
  PRIMARY KEY (lndno)
);

-- Real Estate | legacy NEWLIBGAEB/PBLLND01 (source SRCMAP1) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م البيانات الأساسية لتشكيل لجان.pdf
CREATE TABLE IF NOT EXISTS real_estate.pbllnd01 (
  cmtno INTEGER,
  cmttyp INTEGER,
  cmtdt INTEGER,
  PRIMARY KEY (cmttyp, cmtno)
);

-- Real Estate | legacy NEWLIBGAEB/PBLLND04 (source SRCMAP1) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م البيـانات الاسـاسـية_لقطعة الارض .pdf
CREATE TABLE IF NOT EXISTS real_estate.pbllnd04 (
  lndno INTEGER,
  lndnm VARCHAR(40),
  blrd INTEGER,
  dscd INTEGER,
  vgcd INTEGER,
  vilg INTEGER,
  area NUMERIC(8,2),
  need INTEGER,
  areafl INTEGER,
  lndown INTEGER,
  PRIMARY KEY (lndno)
);

-- Real Estate | legacy NEWLIBGAEB/RNT008PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م التفاوض  على الشراء.pdf
CREATE TABLE IF NOT EXISTS real_estate.rnt008pf (
  blcd INTEGER,
  date INTEGER,
  lgty INTEGER,
  lgno INTEGER,
  PRIMARY KEY (blcd, date)
);

-- Real Estate | legacy NEWLIBGAEB/PBLLND16 (source SRCMAP1) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م اللجنة الثلاثية.pdf
CREATE TABLE IF NOT EXISTS real_estate.pbllnd16 (
  lndno INTEGER,
  thropn INTEGER,
  PRIMARY KEY (lndno)
);

-- Real Estate | legacy NEWLIBGAEB/RENT03PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م بيانات مبانى مؤجرة.pdf
CREATE TABLE IF NOT EXISTS real_estate.rent03pf (
  blcd# INTEGER,
  temp# INTEGER,
  class# INTEGER,
  area# NUMERIC(9,3),
  test# INTEGER,
  law# INTEGER,
  PRIMARY KEY (blcd#)
);

-- Real Estate | legacy NEWLIBGAEB/RENT02PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م شراء مبانى مؤجرة.pdf
CREATE TABLE IF NOT EXISTS real_estate.rent02pf (
  blcdt INTEGER,
  areat NUMERIC(8,2),
  tempt INTEGER,
  tyct INTEGER,
  PRIMARY KEY (blcdt)
);

-- Real Estate | legacy NEWLIBGAEB/REMV04PF (source SRCRENT1) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م شيكات تكاليف أعمال.pdf
CREATE TABLE IF NOT EXISTS real_estate.remv04pf_srcrent1 (
  blcd INTEGER,
  numc BIGINT,
  dat1 INTEGER,
  chpr NUMERIC(9,2),
  PRIMARY KEY (blcd, numc)
);

-- Real Estate | legacy NEWLIBGAEB/RNT011PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م قرار نزع ملكية رقم.pdf
CREATE TABLE IF NOT EXISTS real_estate.rnt011pf (
  blcd INTEGER,
  stad INTEGER,
  reno INTEGER,
  tnno INTEGER,
  PRIMARY KEY (blcd, stad)
);

-- Real Estate | legacy NEWLIBGAEB/RNT009PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م قرار نزع ملكية.pdf
CREATE TABLE IF NOT EXISTS real_estate.rnt009pf (
  blcd INTEGER,
  stad INTEGER,
  lgno BIGINT,
  lgdt INTEGER,
  PRIMARY KEY (blcd, stad)
);

-- Real Estate | legacy NEWLIBGAEB/PBLLND03 (source SRCMAP1) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م لاعمال اللجــان.pdf
CREATE TABLE IF NOT EXISTS real_estate.pbllnd03 (
  cmtno INTEGER,
  cmttyp INTEGER,
  lndno INTEGER,
  esnddt INTEGER,
  provdt INTEGER,
  PRIMARY KEY (cmttyp, cmtno, lndno)
);

-- Real Estate | legacy NEWLIBGAEB/PBLLND50 (source SRCMAP1) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م مستند قرار التخصيص  .pdf
CREATE TABLE IF NOT EXISTS real_estate.pbllnd50 (
  lndno INTEGER,
  docno VARCHAR(20),
  docdat INTEGER,
  doctyp INTEGER,
  nshdat INTEGER,
  nshnam VARCHAR(50),
  enddat INTEGER,
  docscg INTEGER,
  PRIMARY KEY (lndno)
);

-- Real Estate | legacy NEWLIBGAEB/PBLLND15 (source SRCMAP1) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م معاييــر المســاحــــة.pdf
CREATE TABLE IF NOT EXISTS real_estate.pbllnd15 (
  sgcd INTEGER,
  area NUMERIC(8,2),
  lnsmsd NUMERIC(4,1),
  PRIMARY KEY (sgcd)
);

-- Real Estate | legacy NEWLIBGAEB/GRN002PF (source SRCMAP2) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م موافقة العقارية.pdf
CREATE TABLE IF NOT EXISTS real_estate.grn002pf_srcmap2 (
  lndid INTEGER,
  PRIMARY KEY (lndid)
);

-- Real Estate | legacy NEWLIBGAEB/RNT004PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م موقف شراء القرار.pdf
CREATE TABLE IF NOT EXISTS real_estate.rnt004pf (
  blcd INTEGER,
  date INTEGER,
  des INTEGER,
  PRIMARY KEY (blcd, date)
);

-- Real Estate | legacy NEWLIBGAEB/RNT003PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م موقف شراء اللجنة.pdf
CREATE TABLE IF NOT EXISTS real_estate.rnt003pf (
  blcd INTEGER,
  date INTEGER,
  t1 INTEGER,
  t2 INTEGER,
  t3 INTEGER,
  t4 INTEGER,
  t5 INTEGER,
  t6 INTEGER,
  t7 INTEGER,
  PRIMARY KEY (blcd, date)
);

-- Real Estate | legacy NEWLIBGAEB/RNT007PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م موقف شراء تبرع.pdf
CREATE TABLE IF NOT EXISTS real_estate.rnt007pf (
  blcd INTEGER,
  date INTEGER,
  tabr INTEGER,
  PRIMARY KEY (blcd, date)
);

-- Real Estate | legacy NEWLIBGAEB/RNT006PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م موقف شراء نزع ملكية.pdf
CREATE TABLE IF NOT EXISTS real_estate.rnt006pf (
  blcd INTEGER,
  date INTEGER,
  kind INTEGER,
  PRIMARY KEY (blcd, date)
);

-- Real Estate | legacy NEWLIBGAEB/RNT002PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م موقف شراءرد للمالك.pdf
CREATE TABLE IF NOT EXISTS real_estate.rnt002pf (
  blcd INTEGER,
  date INTEGER,
  red INTEGER,
  PRIMARY KEY (blcd, date)
);

-- Real Estate | legacy NEWLIBGAEB/RNT001PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م موقف شراءمبنى مؤجر.pdf
CREATE TABLE IF NOT EXISTS real_estate.rnt001pf (
  blcd INTEGER,
  date INTEGER,
  stat INTEGER,
  PRIMARY KEY (blcd, stat)
);

-- Real Estate | legacy NEWLIBGAEB/RENT05PF (source SRCRENT) | ملكيه عقاريه/واراضى مؤجرات ملكيه عقا ريه/م نماذج مبانى مؤجرة.pdf
CREATE TABLE IF NOT EXISTS real_estate.rent05pf (
  blcd INTEGER,
  test INTEGER,
  namoz INTEGER,
  clas INTEGER,
  law INTEGER,
  PRIMARY KEY (blcd)
);
