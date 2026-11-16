import pandas as pd
import json
import os

filepath = r"C:\Users\user\OneDrive\Desktop\company category\axis com cat.xlsx"
df = pd.read_excel(filepath)

print("Columns:", df.columns.tolist())
print("Total rows:", len(df))
print("\nSample 5 rows:")
print(df.head())

category_col = None
for col in df.columns:
    if 'cat' in col.lower() or 'tier' in col.lower() or 'list' in col.lower():
        category_col = col
        break

if not category_col and len(df.columns) > 1:
    category_col = df.columns[1]

if category_col:
    print(f"\nUsing category column: '{category_col}'")
    print(df[category_col].value_counts(dropna=False).head(20))
