import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import os, sys

sys.stdout.reconfigure(encoding='utf-8')

target_dir = r"C:\Users\user\OneDrive\Desktop\company category"
target_file = os.path.join(target_dir, "Bank_PF_and_Incentive_Policy_Matrix.xlsx")
workspace_file = r"d:\chola data\laxmicredit\file-we-app-2025\Bank_PF_and_Incentive_Policy_Matrix.xlsx"

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "PF & Incentive Policy"
ws.views.sheetView[0].showGridLines = True

# Title Banner
ws.merge_cells('A1:D1')
title_cell = ws['A1']
title_cell.value = 'BANK POLICY: PF DEDUCTION & INCENTIVE COUNT MATRIX'
title_cell.font = Font(name='Calibri', size=13, bold=True, color='FFFFFF')
title_cell.fill = PatternFill(start_color='0F172A', end_color='0F172A', fill_type='solid')
title_cell.alignment = Alignment(horizontal='center', vertical='center')
ws.row_dimensions[1].height = 32

# Headers (Strictly Bank Name, PF Deduction, Incentive Count)
headers = ['S.No.', 'Bank Name', 'PF Deduction', 'Incentive Count']
ws.append([]) # row 2 empty
ws.row_dimensions[2].height = 6

ws.append(headers) # row 3
header_row_idx = 3
ws.row_dimensions[header_row_idx].height = 26

header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
header_fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
header_align = Alignment(horizontal='center', vertical='center')

thin_border = Border(
    left=Side(style='thin', color='CBD5E1'),
    right=Side(style='thin', color='CBD5E1'),
    top=Side(style='thin', color='CBD5E1'),
    bottom=Side(style='thin', color='CBD5E1')
)

for col_num, h in enumerate(headers, 1):
    c = ws.cell(row=header_row_idx, column=col_num)
    c.font = header_font
    c.fill = header_fill
    c.alignment = header_align
    c.border = thin_border

# All 17 Partner Banks present in Dashboard
data = [
    (1, 'Axis Bank', 'Not Mentioned', 'Not Mentioned'),
    (2, 'Axis Finance', 'Not Mentioned', 'Not Mentioned'),
    (3, 'IndusInd Bank', 'Not Mentioned', 'Not Mentioned'),
    (4, 'HDFC Bank', 'Not Mentioned', 'Not Mentioned'),
    (5, 'ICICI Bank', 'Not Mentioned', 'Not Mentioned'),
    (6, 'IDFC First Bank', 'Not Mentioned', 'Not Mentioned'),
    (7, 'Kotak Mahindra Bank', 'Not Mentioned', 'Not Mentioned'),
    (8, 'Tata Capital', 'Not Mentioned', 'Not Mentioned'),
    (9, 'Poonawala Finance', 'Not Mentioned', 'Not Mentioned'),
    (10, 'Bandhan Bank', 'Not Mentioned', 'Not Mentioned'),
    (11, 'Cholamandalam (Chola) Finance', 'Not Mentioned', 'Not Mentioned'),
    (12, 'Piramal Finance', 'Mentioned (22+PF DEDUCT REQ)', 'Not Mentioned'),
    (13, 'L&T Finance (LNT)', 'Not Mentioned', 'Not Mentioned'),
    (14, 'SMFG India Credit', 'Not Mentioned', 'Not Mentioned'),
    (15, 'InCred Finance', 'Not Mentioned', 'Not Mentioned'),
    (16, 'AU Small Finance Bank', 'Not Mentioned', 'Not Mentioned'),
    (17, 'Aditya Birla Finance (ABFL)', 'Not Mentioned', 'Not Mentioned'),
    (18, 'Bajaj Finance', 'Not Mentioned', 'Not Mentioned'),
    (19, 'Finnable Finance', 'Not Mentioned', 'Not Mentioned')
]

row_font = Font(name='Calibri', size=11, color='1E293B')
zebra_fill = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')

piramal_pf_fill = PatternFill(start_color='DCFCE7', end_color='DCFCE7', fill_type='solid') # soft green
piramal_pf_font = Font(name='Calibri', size=11, bold=True, color='166534')

not_mentioned_font = Font(name='Calibri', size=10, italic=True, color='64748B')
not_mentioned_fill = PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid')

start_row = 4
for idx, r_vals in enumerate(data):
    curr = start_row + idx
    ws.row_dimensions[curr].height = 24
    for c_idx, val in enumerate(r_vals, 1):
        cell = ws.cell(row=curr, column=c_idx, value=val)
        cell.font = row_font
        cell.border = thin_border
        
        if c_idx == 1:
            cell.alignment = Alignment(horizontal='center', vertical='center')
        elif c_idx == 2:
            cell.alignment = Alignment(horizontal='left', vertical='center')
        else:
            cell.alignment = Alignment(horizontal='center', vertical='center')
            
        if idx % 2 == 1:
            cell.fill = zebra_fill
            
        # Specific styling for PF deduction
        if c_idx == 3:
            if 'Mentioned (' in val:
                cell.fill = piramal_pf_fill
                cell.font = piramal_pf_font
            else:
                cell.font = not_mentioned_font
                
        # Specific styling for Incentive Count
        if c_idx == 4:
            cell.font = not_mentioned_font

col_widths = {
    1: 8,   # S.No.
    2: 32,  # Bank Name
    3: 34,  # PF Deduction
    4: 25   # Incentive Count
}

for col_idx, width in col_widths.items():
    col_letter = get_column_letter(col_idx)
    ws.column_dimensions[col_letter].width = width

try:
    wb.save(target_file)
    print(f"✅ Saved to: {target_file}")
except Exception as e:
    print(f"Error saving to {target_file}: {e}")

try:
    wb.save(workspace_file)
    print(f"✅ Saved copy to: {workspace_file}")
except Exception as e:
    print(f"Error saving to {workspace_file}: {e}")
