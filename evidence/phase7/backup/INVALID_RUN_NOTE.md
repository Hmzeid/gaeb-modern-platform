# Invalid physical-restore comparison (Phase 7, discarded)

The first Phase 7 base backup was started BEFORE the full test suite ran
against the same cluster. The suite mutates gaeb_test, so comparing the
(point-in-time) backup against the post-suite live database mismatched on
13 active tables — a methodology error in the comparison, not a backup
defect (the Phase 6 execution of the identical procedure on a quiescent
database passed, and the Phase 7 logical re-run passed minutes earlier).
The backup was discarded and the procedure re-executed against a quiescent
database; see pg-physical-restore.log (final).
