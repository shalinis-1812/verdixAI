# VERIDEX AI synthetic model data

The durable workbook `VERIDEX_AI_Synthetic_Dataset_1000.xlsx` is the supplied synthetic training source. The `Synthetic Dataset` worksheet contains 1,000 labeled rows across four document types: Passport, PAN Card, Driving Licence, and National ID. The target label is `tampering_detected`; `Yes` means the source row represents a manipulated synthetic document, and `No` means the source row represents a genuine synthetic example.

`scripts/train_model.py` converts the labeled fields into a logistic-regression artifact at `synthetic_model.json`. The artifact is used for inference by `server/inference.ts`; the deployed application does not train on every request. Retraining is explicit and reproducible from the durable workbook.

The upload path currently accepts XLSX, XLS, CSV, and JSON files containing structured synthetic rows. The New Screening page scores the first row by default, and the backend can select another row with `rowIndex`. An image or PDF is not silently treated as structured data: the current prototype returns a plain-language unsupported-format message until a real OCR/document extraction service is added.

The model is a demonstration classifier, not an identity-verification authority. Its holdout metrics are measured on synthetic data drawn from the same supplied dataset and should not be interpreted as real-world accuracy. Unseen inputs that differ materially from the training schema may be rejected or produce low-confidence results. Every result remains synthetic-only, requires human review, and must not be used as an official, legal, academic, professional, immigration, or government verification decision.
