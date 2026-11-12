# GAEB IBM i Extraction Guide — for the GAEB IBM i technical team

Scope: IBM i V6R1M0, library NEWLIBGAEB. All commands are standard V6R1 commands,
provided as examples — confirm library names, authorities, and output paths against
your installation before use. **No command here writes to or alters production data.**
Veebase never writes to the source system.

## 1. The four delivery routes — they are not interchangeable
| Route | What it is | Importable? |
|---|---|---|
| 1. Save objects (SAVOBJ/SAVLIB) | IBM i save-object format | **NO — not directly.** Restore-then-extract (§5) |
| 2. Delimited text (CPYTOIMPF) | Character text; numerics as decimal text | YES |
| 3. Fixed-format text (CPYTOIMPF DTAFMT(*FIXED)) | Character text at DDS geometry | YES |
| 4. Native binary record image | Raw record bytes; packed/zoned intact | YES — preferred for packed data |

The full compatibility matrix, including decoder behaviour per route, is in the
platform's `docs/EXPORT_FORMATS.md`. The format you choose must be declared in the
delivery manifest — the importer decodes strictly under the declared, registered
layout; a text file fed to the binary decoder is refused, by design.

## 2. Metadata first (every file, every delivery)
```
DSPFFD FILE(NEWLIBGAEB/PBLBULDG) OUTPUT(*OUTFILE) OUTFILE(QTEMP/FFDOUT)
DSPFD  FILE(NEWLIBGAEB/PBLBULDG) OUTPUT(*OUTFILE) OUTFILE(QTEMP/FDOUT)
```
Send the outfile contents (or printed output) with the extract. Record for each file:
record format name, record length, file CCSID, any field-level CCSID overrides,
key fields (DSPFD), and the live record count at extraction time.

## 3. Producing the extract
Delimited (route 2):
```
CPYTOIMPF FROMFILE(NEWLIBGAEB/PBLBULDG) TOSTMF('/tmp/pblbuldg.csv') +
          MBROPT(*REPLACE) STMFCODPAG(1256) RCDDLM(*CRLF) +
          DTAFMT(*DLM) STRDLM(") FLDDLM(,) 
```
Fixed text (route 3):
```
CPYTOIMPF FROMFILE(NEWLIBGAEB/PBLBULDG) TOSTMF('/tmp/pblbuldg.txt') +
          MBROPT(*REPLACE) STMFCODPAG(420) RCDDLM(*CRLF) DTAFMT(*FIXED)
```
Notes that decide whether the data survives:
- CPYTOIMPF converts packed/zoned to **text**. It never emits native packed bytes.
- Declare the exact parameters used (delimiters, code page, decimal point) in the
  manifest — the layout is verified against them before loading.
- Arabic: choose the stream code page deliberately (420 keeps EBCDIC semantics;
  1256 is Windows Arabic). Either is decodable; an undeclared mix is not.
- Dates on this system are numeric YYYYMMDD fields; they are validated as real
  calendar dates on import.

Route 4 (native binary): copy the file to a stream file with a tool that does not
convert (e.g. CPYF to a flat physical file, then a binary-mode transfer), and declare
per-field CCSIDs. If unsure which route a tool produces, ask before sending — a
five-minute check beats a corrupted delivery.

## 4. Control totals (at extraction time, on the live system)
For every file: the live record count. For every money field: a SUM over the field.
Record both in `GAEB_Record_Count_Template.csv`. Veebase reconciles to these
figures exactly; deltas must equal the itemized quarantine, or the batch is not
accepted.

## 5. Save objects (route 1) — restore-then-extract
```
SAVOBJ OBJ(PBLBULDG) LIB(NEWLIBGAEB) DEV(*SAVF) SAVF(QGPL/GAEBEXT) TGTRLS(*CURRENT)
```
If GAEB delivers a save file, GAEB (or Veebase on a GAEB-provided IBM i, if ever
agreed) restores it into a scratch library (RSTOBJ), then produces route 2/3/4 from
the restored objects with the metadata of §2. Veebase's importer does not parse save
files, and no tooling claim is made otherwise.

## 6. Large files
Files above ~50 MB: split by a key range (e.g. governorate) into multiple extracts,
each with its own manifest line, count, totals, and checksum. The importer streams
and checkpoints per chunk; a split delivery reconciles per part and in aggregate.

## 7. Integrity + handover
- SHA-256 checksum per delivered file, listed in the manifest.
- Transfer per `GAEB_Data_Transfer_Protocol.md`.
- Extraction timestamp, job, and user recorded per file.
- If direct extraction is ever approved instead of file delivery: a read-only
  profile, authority limited to the named library/files, is all that is requested.
