import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import os, sys

sys.stdout.reconfigure(encoding='utf-8')

target_dir = r"C:\Users\user\OneDrive\Desktop\company category"

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Dashboard Banks Policy Matrix"
ws.views.sheetView[0].showGridLines = True

# Title Banner
ws.merge_cells('A1:E1')
title_cell = ws['A1']
title_cell.value = 'DASHBOARD PARTNER BANKS: COMPANY CATEGORY LIST, PF DEDUCTION & INCENTIVE COUNT'
title_cell.font = Font(name='Calibri', size=13, bold=True, color='FFFFFF')
title_cell.fill = PatternFill(start_color='0F172A', end_color='0F172A', fill_type='solid')
title_cell.alignment = Alignment(horizontal='center', vertical='center')
ws.row_dimensions[1].height = 32

# Headers
headers = [
    'S.No.', 
    'Bank Name', 
    'Company Category List', 
    'PF Deduction', 
    'Incentive Count (Add Incentive in Net Salary)'
]

ws.append([]) # row 2 empty
ws.row_dimensions[2].height = 6

ws.append(headers) # row 3
header_row_idx = 3
ws.row_dimensions[header_row_idx].height = 28

header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
header_fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
header_align = Alignment(horizontal='center', vertical='center', wrap_text=True)

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

inc_text = "Not Mentioned that we will add incentive in net salary"

# ONLY the 17 Partner Banks that are actively configured in the Dashboard
data = [
    (1, 'Kotak Mahindra Bank', 'Available (Have List)', 'Not Mentioned', inc_text),
    (2, 'Tata Capital', 'Available (Have List)', 'Not Mentioned', inc_text),
    (3, 'Poonawala Finance', 'Available (Have List)', 'Not Mentioned', inc_text),
    (4, 'IDFC First Bank', 'Available (Have List)', 'Not Mentioned', inc_text),
    (5, 'HDFC Bank', 'Not Available (Don\'t Have List)', 'Not Mentioned', inc_text),
    (6, 'ICICI Bank', 'Available (Have List)', 'Not Mentioned', inc_text),
    (7, 'Bandhan Bank', 'Available (Have List)', 'Not Mentioned', inc_text),
    (8, 'Cholamandalam (Chola) Finance', 'Not Available (Don\'t Have List)', 'Not Mentioned', inc_text),
    (9, 'Axis Finance', 'Available (Have List)', 'Not Mentioned', inc_text),
    (10, 'IndusInd Bank', 'Available (Have List)', 'Not Mentioned', inc_text),
    (11, 'Piramal Finance', 'Available (Have List)', 'Mentioned (22+PF DEDUCT REQ)', inc_text),
    (12, 'Axis Bank', 'Available (Have List)', 'Not Mentioned', inc_text),
    (13, 'L&T Finance (LNT)', 'Available (Have List)', 'Not Mentioned', inc_text),
    (14, 'SMFG India Credit', 'Available (Have List)', 'Not Mentioned', inc_text),
    (15, 'InCred Finance', 'Not Available (Don\'t Have List)', 'Not Mentioned', inc_text),
    (16, 'AU Small Finance Bank', 'Not Available (Don\'t Have List)', 'Not Mentioned', inc_text),
    (17, 'Aditya Birla Finance (ABFL)', 'Not Available (Don\'t Have List)', 'Not Mentioned', inc_text)
]

row_font = Font(name='Calibri', size=11, color='1E293B')
zebra_fill = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')

# Styling fills
avail_fill = PatternFill(start_color='DCFCE7', end_color='DCFCE7', fill_type='solid')
avail_font = Font(name='Calibri', size=11, bold=True, color='166534')

not_avail_fill = PatternFill(start_color='FEE2E2', end_color='FEE2E2', fill_type='solid')
not_avail_font = Font(name='Calibri', size=11, bold=True, color='991B1B')

piramal_pf_fill = PatternFill(start_color='FEF3C7', end_color='FEF3C7', fill_type='solid')
piramal_pf_font = Font(name='Calibri', size=11, bold=True, color='B45309')

not_mentioned_font = Font(name='Calibri', size=10, italic=True, color='64748B')

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
        elif c_idx == 5:
            cell.alignment = Alignment(horizontal='left', vertical='center')
        else:
            cell.alignment = Alignment(horizontal='center', vertical='center')
            
        if idx % 2 == 1:
            cell.fill = zebra_fill
            
        # Company Category List Column (Column 3)
        if c_idx == 3:
            if 'Available (Have List)' in val:
                cell.fill = avail_fill
                cell.font = avail_font
            else:
                cell.fill = not_avail_fill
                cell.font = not_avail_font
                
        # PF Deduction Column (Column 4)
        if c_idx == 4:
            if 'Mentioned (' in val:
                cell.fill = piramal_pf_fill
                cell.font = piramal_pf_font
            else:
                cell.font = not_mentioned_font
                
        # Incentive Count Column (Column 5)
        if c_idx == 5:
            cell.font = not_mentioned_font

col_widths = {
    1: 8,   # S.No.
    2: 32,  # Bank Name
    3: 34,  # Company Category List
    4: 34,  # PF Deduction
    5: 56   # Incentive Count
}

for col_idx, width in col_widths.items():
    col_letter = get_column_letter(col_idx)
    ws.column_dimensions[col_letter].width = width

target_filenames = [
    'PF_Deduction_and_Incentive_Count.xlsx',
    'Bank_Category_List_and_Policy_Matrix.xlsx',
    'Dashboard_Banks_Policy_Matrix.xlsx'
]

for fname in target_filenames:
    p = os.path.join(target_dir, fname)
    try:
        wb.save(p)
        print(f"✅ Successfully saved: {p}")
    except Exception as e:
        print(f"Notice: Could not write to {p}: {e}")

# Save workspace copy
ws_copy = r"d:\chola data\laxmicredit\file-we-app-2025\PF_Deduction_and_Incentive_Count.xlsx"
wb.save(ws_copy)
print(f"✅ Saved workspace copy: {ws_copy}")
