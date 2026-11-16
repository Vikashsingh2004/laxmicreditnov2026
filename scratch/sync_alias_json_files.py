import shutil
import os

public_data = r"d:\chola data\laxmicredit\file-we-app-2025\public\data"

copies = [
    ("lt_companies.json", "lnt_companies.json"),
    ("axis_fin_companies.json", "axis-fin_companies.json"),
    ("axis_fin_companies.json", "axis_bank_companies.json"),
    ("axis_fin_companies.json", "axis-bank_companies.json"),
]

for src, dst in copies:
    src_path = os.path.join(public_data, src)
    dst_path = os.path.join(public_data, dst)
    if os.path.exists(src_path):
        shutil.copyfile(src_path, dst_path)
        size_mb = os.path.getsize(dst_path) / (1024 * 1024)
        print(f"Copied {src} -> {dst} ({size_mb:.2f} MB)")
    else:
        print(f"Source file {src} does not exist!")
