import pandas as pd
import json
import os

excel_path = r"C:\Users\user\OneDrive\Desktop\company category\L&T COM LIST.xlsx"
json_out_path = r"d:\chola data\laxmicredit\file-we-app-2025\public\data\lt_companies.json"

df = pd.read_excel(excel_path)
print(f"Loaded {len(df)} rows from Excel.")

company_col = 'COMPANY_NAME'
cat_col = 'FINAL_CATEGORY'

companies = []
for idx, row in df.iterrows():
    name = str(row[company_col]).strip() if pd.notna(row[company_col]) else ""
    cat = str(row[cat_col]).strip() if pd.notna(row[cat_col]) else "CAT D"
    if name and name.upper() != "NAN":
        companies.append({
            "companyName": name,
            "category": cat
        })

print(f"Cleaned {len(companies)} company entries.")

os.makedirs(os.path.dirname(json_out_path), exist_ok=True)
with open(json_out_path, "w", encoding="utf-8") as f:
    json.dump(companies, f, ensure_ascii=False)

file_size_mb = os.path.getsize(json_out_path) / (1024 * 1024)
print(f"Successfully saved {json_out_path} ({file_size_mb:.2f} MB)")
