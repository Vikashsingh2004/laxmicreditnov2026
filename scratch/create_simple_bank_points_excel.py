import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import os, sys

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.Workbook()

# ==============================================================
# SHEET 1: SIMPLE BANK NAME & POINTS (1 ROW PER BANK)
# ==============================================================
ws1 = wb.active
ws1.title = "Bank Name & Points"
ws1.views.sheetView[0].showGridLines = True

# Title Banner
ws1.merge_cells('A1:C1')
t1 = ws1['A1']
t1.value = "BANK POLICY OBSERVATIONS & POINTS"
t1.font = Font(name='Calibri', size=13, bold=True, color='FFFFFF')
t1.fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
t1.alignment = Alignment(horizontal='center', vertical='center')
ws1.row_dimensions[1].height = 32

# BT Query Banner
ws1.merge_cells('A2:C2')
t2 = ws1['A2']
t2.value = 'General Query (Note): "Ek cheez puchna jis mai BT ke bare main ni likha kya wo BT allow nhi karti"'
t2.font = Font(name='Calibri', size=10, bold=True, italic=True, color='9A3412')
t2.fill = PatternFill(start_color='FFEDD5', end_color='FFEDD5', fill_type='solid')
t2.alignment = Alignment(horizontal='left', vertical='center', indent=1)
ws1.row_dimensions[2].height = 24

# Header Row
headers1 = ["S.No.", "Bank Name", "Points"]
ws1.append([]) # row 3 spacer
ws1.row_dimensions[3].height = 6

ws1.append(headers1) # row 4
header_row_idx = 4
ws1.row_dimensions[header_row_idx].height = 26

header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
header_fill = PatternFill(start_color='0F172A', end_color='0F172A', fill_type='solid')
header_align = Alignment(horizontal='center', vertical='center')

thin_border = Border(
    left=Side(style='thin', color='CBD5E1'),
    right=Side(style='thin', color='CBD5E1'),
    top=Side(style='thin', color='CBD5E1'),
    bottom=Side(style='thin', color='CBD5E1')
)

for col_idx, h in enumerate(headers1, 1):
    c = ws1.cell(row=header_row_idx, column=col_idx)
    c.font = header_font
    c.fill = header_fill
    c.alignment = header_align
    c.border = thin_border

# Simple Bank Data
bank_data = [
    (
        1,
        "Axis Bank",
        "1. 10L Below ROI missing\n2. Multiplier for 35k-40k and 25k-35k slab missing",
        45
    ),
    (
        2,
        "HDFC",
        "1. Category D ke liye Roi nhi bataya\n2. Foir and multiplier for below 75k is not mentioned only 75k plus is mentioned",
        45
    ),
    (
        3,
        "ICICI",
        "1. Army profile to Roi missing hai\n2. Policy mai (-1) Cibil doable bola hai but other factor like Roi, foir, tenure... in mai khi mention nhi hai",
        50
    ),
    (
        4,
        "LNT",
        "1. Is mai 30L plus mai Roi sahi hai but below 30L to thoda Rough assumption lagana padega\n2. In some cases multiplier are missing have to use rough assumption",
        50
    ),
    (
        5,
        "Piramal",
        "1. Ventile score ko kuch substitute nikal padega Foir mai problem aati hai\n2. Cat - D ko Roi miss hai",
        45
    ),
    (
        6,
        "Chola",
        "1. 25k - 30k mai multiplier value missing",
        30
    ),
    (
        7,
        "Kotak",
        "1. 10L Roi missing\n2. Category D Roi missing\n3. foir / multiplier mai 25k bola hai bas",
        60
    ),
    (
        8,
        "Axis Finance",
        "1. Axis Finance mai minimum salary Rural - 25k aur Urban 30k bola hai maine overall 30k kar diya",
        36
    ),
    (
        9,
        "ABFL",
        "1. Company category sahi se nhi bataya\n2. Loan amount eligibility table confusing hai",
        45
    ),
    (
        10,
        "Finnable",
        "1. Foir / multiplier ke bare mai kuch nhi bataya",
        30
    )
]

row_font_sno = Font(name='Calibri', size=11, bold=True, color='334155')
row_font_bank = Font(name='Calibri', size=11, bold=True, color='0F172A')
row_font_points = Font(name='Calibri', size=10.5, color='1E293B')
zebra_fill = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')

start_row = 5
for idx, (sno, bname, points_str, r_height) in enumerate(bank_data):
    curr = start_row + idx
    ws1.row_dimensions[curr].height = r_height
    
    c1 = ws1.cell(row=curr, column=1, value=sno)
    c1.font = row_font_sno
    c1.alignment = Alignment(horizontal='center', vertical='center')
    c1.border = thin_border
    
    c2 = ws1.cell(row=curr, column=2, value=bname)
    c2.font = row_font_bank
    c2.alignment = Alignment(horizontal='left', vertical='center', indent=1)
    c2.border = thin_border
    
    c3 = ws1.cell(row=curr, column=3, value=points_str)
    c3.font = row_font_points
    c3.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True, indent=1)
    c3.border = thin_border
    
    if idx % 2 == 1:
        c1.fill = zebra_fill
        c2.fill = zebra_fill
        c3.fill = zebra_fill

ws1.column_dimensions['A'].width = 8
ws1.column_dimensions['B'].width = 20
ws1.column_dimensions['C'].width = 85


# ==============================================================
# SHEET 2: POINT BY ROW (FLAT LIST)
# ==============================================================
ws2 = wb.create_sheet(title="Points By Row")
ws2.views.sheetView[0].showGridLines = True

headers2 = ["S.No.", "Bank Name", "Point"]
ws2.append(headers2)
ws2.row_dimensions[1].height = 26

for col_idx, h in enumerate(headers2, 1):
    c = ws2.cell(row=1, column=col_idx)
    c.font = header_font
    c.fill = header_fill
    c.alignment = header_align
    c.border = thin_border

individual_points = [
    ("Axis Bank", "10L Below ROI missing"),
    ("Axis Bank", "Multiplier for 35k-40k and 25k-35k slab missing"),
    ("HDFC", "Category D ke liye Roi nhi bataya"),
    ("HDFC", "Foir and multiplier for below 75k is not mentioned only 75k plus is mentioned"),
    ("ICICI", "Army profile to Roi missing hai"),
    ("ICICI", "Policy mai (-1) Cibil doable bola hai but other factor like Roi, foir, tenure... in mai khi mention nhi hai"),
    ("LNT", "Is mai 30L plus mai Roi sahi hai but below 30L to thoda Rough assumption lagana padega"),
    ("LNT", "In some cases multiplier are missing have to use rough assumption"),
    ("Piramal", "Ventile score ko kuch substitute nikal padega Foir mai problem aati hai"),
    ("Piramal", "Cat - D ko Roi miss hai"),
    ("Chola", "25k - 30k mai multiplier value missing"),
    ("Kotak", "10L Roi missing"),
    ("Kotak", "Category D Roi missing"),
    ("Kotak", "foir / multiplier mai 25k bola hai bas"),
    ("Axis Finance", "Axis Finance mai minimum salary Rural - 25k aur Urban 30k bola hai maine overall 30k kar diya"),
    ("ABFL", "Company category sahi se nhi bataya"),
    ("ABFL", "Loan amount eligibility table confusing hai"),
    ("Finnable", "Foir / multiplier ke bare mai kuch nhi bataya")
]

for idx, (bname, pt) in enumerate(individual_points, 1):
    r_idx = 1 + idx
    ws2.row_dimensions[r_idx].height = 24
    
    c1 = ws2.cell(row=r_idx, column=1, value=idx)
    c1.font = row_font_sno
    c1.alignment = Alignment(horizontal='center', vertical='center')
    c1.border = thin_border
    
    c2 = ws2.cell(row=r_idx, column=2, value=bname)
    c2.font = row_font_bank
    c2.alignment = Alignment(horizontal='left', vertical='center', indent=1)
    c2.border = thin_border
    
    c3 = ws2.cell(row=r_idx, column=3, value=pt)
    c3.font = row_font_points
    c3.alignment = Alignment(horizontal='left', vertical='center', indent=1)
    c3.border = thin_border
    
    if idx % 2 == 0:
        c1.fill = zebra_fill
        c2.fill = zebra_fill
        c3.fill = zebra_fill

ws2.column_dimensions['A'].width = 8
ws2.column_dimensions['B'].width = 20
ws2.column_dimensions['C'].width = 85

# ==============================================================
# SAVE WORKBOOK
# ==============================================================
target_dir = r"C:\Users\user\OneDrive\Desktop\company category"

output_paths = [
    os.path.join(target_dir, "Bank_Policy_Points.xlsx"),
    os.path.join(target_dir, "Bank_Name_and_Points.xlsx"),
    r"d:\chola data\laxmicredit\file-we-app-2025\Bank_Policy_Points.xlsx",
    os.path.join(target_dir, "Bank_Policy_Observations_and_Gaps.xlsx") # try overwrite
]

for p in output_paths:
    try:
        wb.save(p)
        print(f"✅ Successfully saved: {p}")
    except Exception as e:
        print(f"Notice: Could not write to {p}: {e}")
