import pandas as pd
import json
import os

fin_excel = r"C:\Users\user\OneDrive\Desktop\company category\AXIS FINANCE COM LIST.xlsx"
bank_excel = r"C:\Users\user\OneDrive\Desktop\company category\axis com cat.xlsx"

fin_json_path = r"d:\chola data\laxmicredit\file-we-app-2025\public\data\axis_fin_companies.json"
bank_json_path = r"d:\chola data\laxmicredit\file-we-app-2025\public\data\axis_companies.json"

companies = []
seen = set()

# 1. Process Axis Finance
df_fin = pd.read_excel(fin_excel)
print(f"Loaded Axis Finance Excel: {len(df_fin)} rows.")
for idx, row in df_fin.iterrows():
    name = str(row['Employer Name']).strip() if pd.notna(row['Employer Name']) else ""
    cat = str(row['EMP_CAT']).strip() if pd.notna(row['EMP_CAT']) else "UPC-C"
    if name and name.upper() != "NAN":
        key = name.upper()
        if key not in seen:
            companies.append({"companyName": name, "category": cat})
            seen.add(key)

# 2. Process Axis Bank
df_bank = pd.read_excel(bank_excel)
print(f"Loaded Axis Bank Excel: {len(df_bank)} rows.")
for idx, row in df_bank.iterrows():
    name = str(row['EMPLOYERNAME']).strip() if pd.notna(row['EMPLOYERNAME']) else ""
    cat = str(row['EMPLOYER_CATG']).strip() if pd.notna(row['EMPLOYER_CATG']) else "CATGC"
    if name and name.upper() != "NAN":
        key = name.upper()
        if key not in seen:
            companies.append({"companyName": name, "category": cat})
            seen.add(key)

print(f"Total Unique Combined Axis Companies: {len(companies):,}")

os.makedirs(os.path.dirname(fin_json_path), exist_ok=True)
with open(fin_json_path, "w", encoding="utf-8") as f:
    json.dump(companies, f, ensure_ascii=False)

with open(bank_json_path, "w", encoding="utf-8") as f:
    json.dump(companies, f, ensure_ascii=False)

fin_size = os.path.getsize(fin_json_path) / (1024 * 1024)
bank_size = os.path.getsize(bank_json_path) / (1024 * 1024)
print(f"Saved {fin_json_path} ({fin_size:.2f} MB)")
print(f"Saved {bank_json_path} ({bank_size:.2f} MB)")
