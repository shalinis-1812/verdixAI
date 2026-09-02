from pathlib import Path
import json
import pandas as pd

path = Path('/home/ubuntu/upload/VERIDEX_AI_Synthetic_Dataset_1000.xlsx')
book = pd.ExcelFile(path)
result = {'sheets': book.sheet_names, 'worksheets': {}}
for sheet in book.sheet_names:
    frame = pd.read_excel(path, sheet_name=sheet)
    info = {
        'shape': list(frame.shape),
        'columns': [str(c) for c in frame.columns],
        'dtypes': {str(c): str(t) for c, t in frame.dtypes.items()},
        'missing': {str(c): int(v) for c, v in frame.isna().sum().items() if int(v)},
        'sample': frame.head(5).fillna('').astype(str).to_dict(orient='records'),
    }
    for col in frame.columns:
        if frame[col].nunique(dropna=True) <= 12:
            info.setdefault('low_cardinality', {})[str(col)] = frame[col].value_counts(dropna=False).to_dict()
    result['worksheets'][sheet] = info
print(json.dumps(result, indent=2, default=str))
