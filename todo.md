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
- [x] Save dataset-informed upload checkpoint; final authenticated QA remains pending

## Change History

- Initial build scope recorded from the supplied VERIDEX AI frontend brief and expanded full-stack requirements.

## Verification Follow-ups

- [x] Implement the English/Tamil switch for shared navigation, breadcrumb labels, and document language metadata
- [x] Make case-detail decision controls functional with persisted review state or clearly label them as unavailable
- [ ] Perform and document authenticated mobile and accessibility verification for core workspace routes
- [ ] Re-run authenticated visual QA on workspace routes and resolve any issues found
- [x] Scope the English/Tamil switch to shared workspace navigation and breadcrumb labels, with Tamil document language metadata
- [ ] Complete authenticated mobile and route-level visual QA using the signed-in preview session

## Dataset-Informed Upload Update

- [x] Inspect VERIDEX_AI_Synthetic_Dataset_1000.xlsx structure, labels, feature quality, and class balance
- [x] Add the uploaded dataset as a durable server-side project data asset and define a reproducible inference contract
- [x] Implement dataset-informed unseen synthetic prediction with explainable signals and confidence limits
- [x] Add upload parsing and screening API support for XLSX/XLS/CSV/JSON synthetic dataset inputs without exposing raw technical errors
- [x] Connect New Screening upload results to actual parsed/inferred case results instead of fixed demo cases
- [x] Add regression tests for dataset loading, unseen-row inference, malformed input, and safe synthetic-only messaging
- [x] Validate the supplied dataset parsing and unseen-row inference; document model limitations

## Document Photo Screening Update

- [x] Replace workbook-only upload copy with passport, ID, PAN card, licence image upload
- [x] Add secure image upload validation and bounded file handling
- [x] Add OCR/vision extraction for name, date of birth, expiry, document number, document type, and visible tamper cues
- [x] Map extracted fields to the trained synthetic risk model and return explainable risk evidence with confidence limits
- [x] Persist photo-screening cases and expose extracted fields/source metadata in case detail and report data
- [x] Add tests for supported image inputs, extraction failure, malformed files, and synthetic-only privacy messaging
- [ ] Validate the complete photo upload flow with a supplied synthetic document photo and save a new checkpoint

## GitHub Synchronization

- [x] Inspect local Git status, current branch, remotes, and GitHub authentication
- [x] Configure the provided repository as the push target without exposing secrets
- [x] Push the current VERIDEX AI project to the target repository
- [x] Verify the pushed branch and commit on GitHub
