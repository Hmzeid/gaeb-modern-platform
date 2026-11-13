# Phase 11 — Accessibility Validation (Workstream J)

## Status
**Screen-reader validation: NOT VERIFIED (external gate).**
NVDA and VoiceOver cannot execute in the build sandbox, and this
phase does not infer compliance from automated results.

## What is executed (automated scope)
axe-core: zero violations of any severity on all 11 views
(Phase 9, re-verified in the Phase 11 baseline E2E) · heading
outline and landmarks verified · drawer focus contract unit-tested
and browser-verified · keyboard-only workflow executed in E2E
(Tab → rail link → Enter) · Arabic/RTL rendering covered by E2E +
13 Arabic visual baselines. These establish the structural basis
for a screen-reader pass; they are not a substitute for one.

## Ready-to-run external package
`docs/phase10-pilot-package/ACCESSIBILITY_EXTERNAL_VALIDATION.md`:
tool matrix (NVDA/Windows, VoiceOver/macOS, VoiceOver/iOS), a
six-flow script (sign-in & landmarks, tender creation, drawer
behavior, Arabic School Map search, Arabic Migration Center,
overview figures as text), WCAG 2.2 AA pass criteria per flow, and
the reviewer record form. It is ready to hand to GAEB's reviewer
or an external specialist unchanged. Estimated execution: half a
day including the record.

## Pilot placement
The validation is scheduled as a pilot-parallel activity (not a
pilot entry condition, since the demo environment suffices to run
it) and is a **production gate**: Gate G4 does not close without it.
