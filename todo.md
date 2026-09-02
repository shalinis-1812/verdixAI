# Project TODO

- [x] Establish VERIDEX AI workspace shell with utility strip, header, primary navigation, compact footer, and persistent synthetic-data notices
- [x] Implement protected workspace access with Manus OAuth login, authenticated user state, and logout
- [x] Add accessibility controls: skip navigation, keyboard focus states, text size controls, high contrast, reduced motion, and English/Tamil toggle
- [x] Define database schema for synthetic identities, documents, screening cases, risk signals, and investigation events
- [x] Apply database migrations and add query helpers for synthetic datasets and screening workflows
- [x] Add backend procedures for dashboard metrics, screening history, case details, evidence, simulator scoring, system status, and report data
- [x] Seed or provision safe synthetic demonstration datasets without real identity documents or biometric data
- [x] Implement the New Screening workflow with demo case selection, clear validation, processing checklist, result state, and recovery states
- [x] Implement the dashboard with queue status, aggregate risk metrics, chart, recent activity, and alerts labeled DEMO DATA
- [x] Implement screening history with search/filter controls and case navigation
- [x] Implement case detail with risk score, sub-scores, flagged signals, decision controls, metadata, validation checks, and report download
- [x] Implement document forensics and digital twin evidence views with original/enhanced/OCR/forensics/heatmap/metadata tabs
- [x] Implement identity consistency visualization with clear analysis-only caption and state legend
- [x] Implement risk simulator with live recalculation using configured weights and plain-language help text
- [x] Implement investigation timeline and system status engine list with REAL MODEL or DEMO / FALLBACK MODE labels
- [x] Implement responsive mobile layout and accessible interaction states across core workflows
- [x] Add Vitest coverage for risk scoring, backend procedures, report payloads, and protected access behavior
- [x] Run typecheck, tests, and visual verification; resolve build/runtime/accessibility issues
- [ ] Save final checkpoint and deliver the project version with concise usage notes

## Change History

- Initial build scope recorded from the supplied VERIDEX AI frontend brief and expanded full-stack requirements.

## Verification Follow-ups

- [x] Implement a real English/Tamil UI switch that updates visible workspace labels and content
- [x] Make case-detail decision controls functional with persisted review state or clearly label them as unavailable
- [ ] Perform and document authenticated mobile and accessibility verification for core workspace routes
- [ ] Re-run authenticated visual QA on workspace routes and resolve any issues found
- [ ] Expand the English/Tamil switch to translate visible content across core routes, including footer text, notices, form labels, buttons, tables, and case-detail content
- [ ] Keep authenticated mobile and route-level visual QA as user-validation items until a signed-in browser session is available

## Dataset-Informed Upload Update

- [x] Inspect VERIDEX_AI_Synthetic_Dataset_1000.xlsx structure, labels, feature quality, and class balance
- [x] Add the uploaded dataset as a durable server-side project data asset and define a reproducible inference contract
- [x] Implement dataset-informed unseen synthetic prediction with explainable signals and confidence limits
- [x] Add upload parsing and screening API support for XLSX/XLS/CSV/JSON synthetic dataset inputs without exposing raw technical errors
- [x] Connect New Screening upload results to actual parsed/inferred case results instead of fixed demo cases
- [x] Add regression tests for dataset loading, unseen-row inference, malformed input, and safe synthetic-only messaging
- [x] Validate the supplied dataset parsing and unseen-row inference; document model limitations
