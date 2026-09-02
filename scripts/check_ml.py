import importlib.util
for name in ['pandas', 'numpy', 'sklearn', 'openpyxl']:
    print(name, bool(importlib.util.find_spec(name)))
