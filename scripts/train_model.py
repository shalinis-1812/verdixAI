from pathlib import Path
import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import train_test_split

SOURCE = Path('/home/ubuntu/veridex-ai/server/data/VERIDEX_AI_Synthetic_Dataset_1000.xlsx')
OUTPUT = Path('/home/ubuntu/veridex-ai/server/data/synthetic_model.json')
SUMMARY = Path('/home/ubuntu/veridex-ai/server/data/synthetic_dataset_summary.json')
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

frame = pd.read_excel(SOURCE, sheet_name='Synthetic Dataset')
feature_columns = [
    'document_type', 'ocr_match', 'mrz_match', 'data_consistency',
    'face_match_percent', 'document_integrity_score', 'identity_confidence_score',
    'data_consistency_score', 'forensic_confidence_score'
]
label_column = 'tampering_detected'
frame = frame.dropna(subset=feature_columns + [label_column]).copy()
frame['target'] = frame[label_column].map({'Yes': 1, 'No': 0}).astype(int)
frame['ocr_match_num'] = frame['ocr_match'].map({'Yes': 1, 'No': 0}).astype(int)
frame['mrz_match_num'] = frame['mrz_match'].map({'Yes': 1, 'No': 0}).astype(int)
frame['data_consistency_num'] = frame['data_consistency'].map({'Yes': 1, 'No': 0}).astype(int)
num_columns = ['ocr_match_num', 'mrz_match_num', 'data_consistency_num', 'face_match_percent', 'document_integrity_score', 'identity_confidence_score', 'data_consistency_score', 'forensic_confidence_score']
doc_types = sorted(frame['document_type'].astype(str).unique())
encoded = pd.DataFrame(index=frame.index)
for col in num_columns:
    encoded[col] = pd.to_numeric(frame[col], errors='coerce').fillna(0.0)
for doc_type in doc_types:
    encoded[f'document_type={doc_type}'] = (frame['document_type'].astype(str) == doc_type).astype(float)
encoded = encoded.fillna(0.0)
X = encoded.to_numpy(dtype=float)
y = frame['target'].to_numpy(dtype=int)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
means = X_train.mean(axis=0)
stds = X_train.std(axis=0)
stds[stds == 0] = 1.0
X_train_scaled = (X_train - means) / stds
X_test_scaled = (X_test - means) / stds
model = LogisticRegression(max_iter=2000, class_weight='balanced', random_state=42)
model.fit(X_train_scaled, y_train)
prob = model.predict_proba(X_test_scaled)[:, 1]
pred = (prob >= 0.5).astype(int)
artifact = {
    'artifactVersion': 'veridex-synthetic-logistic-v1',
    'trainedFrom': 'VERIDEX_AI_Synthetic_Dataset_1000.xlsx / Synthetic Dataset',
    'trainingRows': int(len(frame)),
    'label': 'tampering_detected',
    'positiveClass': 'Yes',
    'featureNames': list(encoded.columns),
    'numericFeatures': num_columns,
    'documentTypes': doc_types,
    'means': means.tolist(),
    'stds': stds.tolist(),
    'weights': model.coef_[0].tolist(),
    'intercept': float(model.intercept_[0]),
    'decisionThreshold': 0.5,
    'holdoutAccuracy': float(accuracy_score(y_test, pred)),
    'holdoutAuc': float(roc_auc_score(y_test, prob)),
    'classBalance': { 'notTampered': int((y == 0).sum()), 'tampered': int((y == 1).sum()) },
}
summary = {
    'sourceFile': SOURCE.name,
    'rows': int(len(frame)),
    'columns': [str(c) for c in pd.read_excel(SOURCE, sheet_name='Synthetic Dataset', nrows=0).columns],
    'riskLevels': frame['risk_level'].value_counts().to_dict(),
    'manipulationTypes': frame['manipulation_type'].value_counts().to_dict(),
    'documentTypes': frame['document_type'].value_counts().to_dict(),
    'model': { 'artifactVersion': artifact['artifactVersion'], 'holdoutAccuracy': artifact['holdoutAccuracy'], 'holdoutAuc': artifact['holdoutAuc'] },
}
OUTPUT.write_text(json.dumps(artifact, indent=2))
SUMMARY.write_text(json.dumps(summary, indent=2, default=int))
print(json.dumps(summary, indent=2, default=int))
