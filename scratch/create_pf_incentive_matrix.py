import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import os, sys

sys.stdout.reconfigure(encoding='utf-8')

target_dir = r"C:\Users\user\OneDrive\Desktop\company category"
target_file = os.path.join(target_dir, "Bank_PF_and_Incentive_Policy_Matrix.xlsx")

wb = openpyxl.Workbook()

# =========================================================================
# SHEET 1: Summary Table
# =========================================================================
ws1 = wb.active
ws1.title = "PF & Incentive Policy"
ws1.views.sheetView[0].showGridLines = True

# Title banner
ws1.merge_cells('A1:I1')
t1 = ws1['A1']
t1.value = 'PARTNER BANKS & NBFCs: PF DEDUCTION & INCENTIVE COUNT IN NET SALARY MATRIX'
t1.font = Font(name='Calibri', size=14, bold=True, color='FFFFFF')
t1.fill = PatternFill(start_color='0F172A', end_color='0F172A', fill_type='solid')
t1.alignment = Alignment(horizontal='center', vertical='center')
ws1.row_dimensions[1].height = 36

# Subtitle
ws1.merge_cells('A2:I2')
t2 = ws1['A2']
t2.value = 'Comparative Analysis of Master Policy (BANKS POLICYS.xlsx) & Admin Dashboard Engine'
t2.font = Font(name='Calibri', size=10, italic=True, color='E2E8F0')
t2.fill = PatternFill(start_color='1E293B', end_color='1E293B', fill_type='solid')
t2.alignment = Alignment(horizontal='center', vertical='center')
ws1.row_dimensions[2].height = 20

# Header Row
headers = [
    'S.No.',
    'Bank / Lending Institution',
    'Institution Type',
    'Salary Slip PF (Provident Fund) Deduction Requirement',
    'Incentive Count in Net Salary (%)',
    'Incentive Period',
    'Incentive & Net Salary Policy Rules (Excel & Dashboard)',
    'Loan Processing Fee (PF) Deduction (%)',
    'Minimum Net Salary Requirement'
]

ws1.append([]) # row 3 blank spacing
ws1.row_dimensions[3].height = 6

ws1.append(headers) # row 4
header_row_idx = 4
ws1.row_dimensions[header_row_idx].height = 30

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
    c = ws1.cell(row=header_row_idx, column=col_num)
    c.font = header_font
    c.fill = header_fill
    c.alignment = header_align
    c.border = thin_border

# Data Rows (Covering all 19 banks in Master Policy & Dashboard)
data_rows = [
    (
        1,
        'Piramal Finance',
        'NBFC',
        'MANDATORY (22+PF DEDUCT REQ)',
        '100%',
        'Last 3 Months',
        '100% of average 3-month incentive added to net salary. Policy strictly mandates PF deduction for salary verification.',
        '0.75% to 1.50% + GST',
        '₹22,000 (with PF deduction)'
    ),
    (
        2,
        'SMFG India Credit',
        'NBFC',
        'ZERO DEDUCTION ALLOWED (25K+ SALARY WITH 0 DEDUCTION)',
        '0% (Not Counted)',
        'N/A',
        'Incentive not added to basic salary. Uniquely accepts applicant payslips with 0 deductions / no PF deduction if net salary >= ₹25,000.',
        '2.00% to 3.00% + GST',
        '₹25,000'
    ),
    (
        3,
        'Cholamandalam (Chola) Finance',
        'NBFC',
        'Standard Salary Credit (PF preferred for Cat C/D)',
        '0% (STRICTLY EXCLUDED)',
        'N/A',
        'Excel explicitly specifies: "25K AND BANKS AND NBFCS 30K WITHOUT INSENTIVE". Incentives strictly excluded from base net salary eligibility.',
        '1.50% to 2.50% + GST',
        '₹25,000 (₹30,000 for Bank/NBFC employees)'
    ),
    (
        4,
        'AU Small Finance Bank',
        'Private Bank',
        'Standard Salary Credit (PF required for unlisted/private)',
        '0% (EXCLUDED / DEDUCTED)',
        'N/A',
        'Net salary considered after all deductions. Policy notes: Variable pay (Incentives, Bonus, Overtime allowances) is deducted/excluded.',
        '1.00% to 2.00% + GST',
        'Listed: ₹20,000 | Unlisted: ₹25,000 | -1 CIBIL: ₹30,000'
    ),
    (
        5,
        'Aditya Birla Finance (ABFL)',
        'NBFC',
        'Standard Salary Credit',
        '0% (EXCLUDED FROM BASE BAND)',
        'N/A',
        'Excel Row 17 explicitly notes: "Income band (Eligible income Prior Annual bonus)". Annual bonus and incentives are excluded from FOIR income band.',
        '1.50% to 2.50% + GST',
        'Tier 4: ₹20k | Tier 3: ₹25k | Tier 2: ₹35k | Tier 1: ₹40k'
    ),
    (
        6,
        'Finnable Finance',
        'Fintech / NBFC',
        'CONDITIONAL PF RULES (3 credits with PF vs 6 credits without PF)',
        '0% (Not Counted)',
        'N/A',
        'Pvt/Public Ltd with PF: 3 salary credits from 2 companies. Without PF: 3 credits from same company. Sole Prop/Partnership without PF: 6 salary credits required.',
        '2.00% to 6.00% + GST (Excel: 2% to 6%)',
        'Tier 1: ₹20,000 | Tier 2: ₹15,000'
    ),
    (
        7,
        'HDFC Bank',
        'Private Bank',
        'Standard Salary Credit (PF / Form 16 for unlisted)',
        '50%',
        'Last 3 Months',
        'Dashboard & Calculator factors 50% of the 3-month average incentive into net salary eligibility calculation.',
        '0.50% to 2.50% + GST (Code Rack: 0.50%)',
        '₹25,000+'
    ),
    (
        8,
        'IDFC First Bank',
        'Private Bank',
        'Standard Salary Credit',
        '100%',
        'Last 3 Months',
        'Dashboard & Calculator factors 100% of average 3-month incentive into net salary (NTH Band multiplier).',
        '1.20% to 2.50% + GST (Code Rack: 1.20%)',
        '₹20,000'
    ),
    (
        9,
        'IndusInd Bank',
        'Private Bank',
        'Standard Salary Credit',
        '100%',
        'Last 3 Months',
        'Dashboard & Calculator factors 100% of average 3-month regular incentive into net monthly take-home salary.',
        '1.00% to 2.50% + GST (Code Rack: 1.00%)',
        '₹25,000'
    ),
    (
        10,
        'L&T Finance (LNT)',
        'NBFC',
        'Standard Salary Credit (6 months bank statement)',
        '100%',
        'Last 3 Months',
        'Dashboard & Calculator factors 100% of average incentive when supported by regular salary credit slips.',
        '2.00% + GST',
        '₹25,000'
    ),
    (
        11,
        'Poonawalla Fincorp',
        'NBFC',
        'Standard Salary Credit',
        '25%',
        'Last 3 Months',
        'Dashboard & Calculator factors 25% of average 3-month incentive into monthly net income. PF deduction rack applicable per Row 55-58.',
        '1.50% to 2.50% + GST (Additional PF per policy)',
        '₹30,000'
    ),
    (
        12,
        'ICICI Bank',
        'Private Bank',
        'Standard Salary Credit',
        '0% (Fixed Net Salary Only)',
        '0 Months',
        'Incentives / Variable pay are excluded from base monthly salary for standard multiplier calculation.',
        '0.80% to 2.25% + GST (Code Rack: 0.80%)',
        'Govt: ₹25,000 | Pvt: ₹30,000 | Open Market: ₹75,000'
    ),
    (
        13,
        'Kotak Mahindra Bank',
        'Private Bank',
        'Standard Salary Credit (Min 1 month exp)',
        '0% (Configurable via Admin)',
        'Last 3 Months',
        'Default calculation uses fixed net salary for FOIR & multiplier; Master Stroke Admin editor allows custom incentive % override.',
        '1.00% to 2.00% + GST',
        '₹25,000'
    ),
    (
        14,
        'Tata Capital',
        'NBFC',
        'Standard Salary Credit (12M stability / CIBIL norm)',
        '0% (Configurable via Admin)',
        'Last 3 Months',
        'Default calculation uses fixed net salary for multiplier table; Master Stroke Admin editor allows custom incentive % override.',
        '1.50% to 2.50% + GST',
        '₹25,000'
    ),
    (
        15,
        'Axis Bank',
        'Private Bank',
        'Standard Salary Credit (Overall 1 year exp)',
        '0% (Fixed Net Salary Only)',
        'N/A',
        'Fixed net monthly take-home is used for salary multiplier & FOIR thresholds. Variable incentives not included in standard base.',
        '1.00% to 2.00% + GST (Fallback: 1.50%)',
        '₹25,000'
    ),
    (
        16,
        'Axis Finance',
        'NBFC',
        'Standard Salary Credit (Min 6 months exp)',
        '0% (Fixed Net Salary Only)',
        'N/A',
        'Fixed net salary used for multiplier tiers (<=50k: 24x, 50k-75k: 26x, 75k+: 28x). Incentives not counted in base multiplier.',
        '1.50% to 2.00% + GST',
        'Urban: ₹30,000 | Rural: ₹25,000'
    ),
    (
        17,
        'Bandhan Bank',
        'Private Bank',
        'Standard Salary Credit (Current 1M, Overall 1Y)',
        '0% (Configurable via Admin)',
        'Last 3 Months',
        'Uses monthly net income range slabs (<=30k: 50% FOIR, 30k-50k: 60%, 50k-75k: 65%, 75k+: 70%). Incentives not added to base net.',
        '1.00% to 2.00% + GST',
        'Cat A/B/C: ₹25,000 | Cat D: ₹40,000'
    ),
    (
        18,
        'InCred Finance',
        'NBFC',
        'Standard Salary Credit (Min 3 months exp)',
        '0% (Fixed Net Salary Only)',
        'N/A',
        'Excel Row 6 explicitly lists: "PF | 2% To 5 %". Fixed salary brackets (15-20k, 20-30k, 30-40k, >40k) used for FOIR. Variable excluded.',
        '2.00% to 5.00% + GST (Excel Row 6: 2% to 5%)',
        '₹15,000'
    ),
    (
        19,
        'Bajaj Finance',
        'NBFC',
        'Standard Salary Credit',
        '0% (Fixed Net Salary Only)',
        'N/A',
        'Fixed salary based (Sal Lite Program / Offer based). Variable incentives not included in primary eligibility criteria.',
        '1.50% to 3.00% + GST',
        'Listed: ₹27,000 | Unlisted: ₹30,000'
    )
]

row_font = Font(name='Calibri', size=10, color='1E293B')
zebra_fill = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')

# Color fills for Incentive %
incentive_fills = {
    '100%': PatternFill(start_color='DCFCE7', end_color='DCFCE7', fill_type='solid'), # light green
    '50%': PatternFill(start_color='E0F2FE', end_color='E0F2FE', fill_type='solid'),  # light blue
    '25%': PatternFill(start_color='FEF3C7', end_color='FEF3C7', fill_type='solid'),  # light yellow
    '0% (Not Counted)': PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid'),
    '0% (STRICTLY EXCLUDED)': PatternFill(start_color='FEE2E2', end_color='FEE2E2', fill_type='solid'),
    '0% (EXCLUDED / DEDUCTED)': PatternFill(start_color='FEE2E2', end_color='FEE2E2', fill_type='solid'),
    '0% (EXCLUDED FROM BASE BAND)': PatternFill(start_color='FEE2E2', end_color='FEE2E2', fill_type='solid'),
    '0% (Fixed Net Salary Only)': PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid'),
    '0% (Configurable via Admin)': PatternFill(start_color='EDE9FE', end_color='EDE9FE', fill_type='solid')
}

incentive_fonts = {
    '100%': Font(name='Calibri', size=10, bold=True, color='166534'),
    '50%': Font(name='Calibri', size=10, bold=True, color='0369A1'),
    '25%': Font(name='Calibri', size=10, bold=True, color='B45309'),
    '0% (STRICTLY EXCLUDED)': Font(name='Calibri', size=10, bold=True, color='B91C1C'),
    '0% (EXCLUDED / DEDUCTED)': Font(name='Calibri', size=10, bold=True, color='B91C1C'),
    '0% (EXCLUDED FROM BASE BAND)': Font(name='Calibri', size=10, bold=True, color='B91C1C'),
    '0% (Configurable via Admin)': Font(name='Calibri', size=10, bold=True, color='6D28D9'),
    '0% (Not Counted)': Font(name='Calibri', size=10, bold=False, color='64748B'),
    '0% (Fixed Net Salary Only)': Font(name='Calibri', size=10, bold=False, color='64748B')
}

start_row = 5
for idx, r_data in enumerate(data_rows):
    curr_row = start_row + idx
    ws1.row_dimensions[curr_row].height = 28
    for col_idx, val in enumerate(r_data, 1):
        cell = ws1.cell(row=curr_row, column=col_idx, value=val)
        cell.font = row_font
        cell.border = thin_border
        
        # Alignment
        if col_idx in [1, 3, 5, 6, 8]:
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        elif col_idx in [2, 9]:
            cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        else:
            cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
            
        # Alternating background
        if idx % 2 == 1:
            cell.fill = zebra_fill
            
        # Special highlight for Incentive % column
        if col_idx == 5 and val in incentive_fills:
            cell.fill = incentive_fills[val]
            cell.font = incentive_fonts[val]
            
        # Highlight PF column if mandatory or zero deduction
        if col_idx == 4:
            if 'MANDATORY' in val:
                cell.fill = PatternFill(start_color='FFEDD5', end_color='FFEDD5', fill_type='solid')
                cell.font = Font(name='Calibri', size=10, bold=True, color='C2410C')
            elif 'ZERO DEDUCTION' in val:
                cell.fill = PatternFill(start_color='DCFCE7', end_color='DCFCE7', fill_type='solid')
                cell.font = Font(name='Calibri', size=10, bold=True, color='15803D')
            elif 'CONDITIONAL' in val:
                cell.fill = PatternFill(start_color='FEF9C3', end_color='FEF9C3', fill_type='solid')
                cell.font = Font(name='Calibri', size=10, bold=True, color='A16207')

# Column dimensions
col_widths = {
    1: 8,   # S.No.
    2: 26,  # Bank Name
    3: 16,  # Type
    4: 36,  # PF Deduction Salary
    5: 22,  # Incentive %
    6: 16,  # Incentive Period
    7: 50,  # Policy Rules
    8: 24,  # Processing Fee (PF)
    9: 30   # Min Salary
}

for col_idx, w in col_widths.items():
    ws1.column_dimensions[get_column_letter(col_idx)].width = w

# =========================================================================
# SHEET 2: Quick Lookup / Comparison Table
# =========================================================================
ws2 = wb.create_sheet(title='Incentive Comparison')
ws2.views.sheetView[0].showGridLines = True

ws2.merge_cells('A1:E1')
t2_1 = ws2['A1']
t2_1.value = 'INCENTIVE CONSIDERATION COMPARISON: HIGHEST TO LOWEST'
t2_1.font = Font(name='Calibri', size=13, bold=True, color='FFFFFF')
t2_1.fill = PatternFill(start_color='0F172A', end_color='0F172A', fill_type='solid')
t2_1.alignment = Alignment(horizontal='center', vertical='center')
ws2.row_dimensions[1].height = 32

headers2 = ['S.No.', 'Bank / Institution', 'Incentive % Counted in Net Salary', 'How It Impacts Eligibility', 'PF Deduction / Payslip Check']
ws2.append([])
ws2.row_dimensions[2].height = 6

ws2.append(headers2)
ws2.row_dimensions[3].height = 26

for col_num, h in enumerate(headers2, 1):
    c = ws2.cell(row=3, column=col_num)
    c.font = header_font
    c.fill = PatternFill(start_color='0369A1', end_color='0369A1', fill_type='solid')
    c.alignment = header_align
    c.border = thin_border

# Sorted by incentive %
inc_sorted = [
    (1, 'IDFC First Bank', '100% of 3-month average', 'Adds 100% of average incentive to base salary -> Higher eligibility & multiplier', 'Standard corporate salary credits'),
    (2, 'IndusInd Bank', '100% of 3-month average', 'Adds 100% of regular incentive to net take-home -> Increases max loan amount', 'Standard corporate salary credits'),
    (3, 'L&T Finance (LNT)', '100% of 3-month average', 'Adds 100% of incentive to net monthly income when reflected in salary slips', 'Requires 6 months salary credit history'),
    (4, 'Piramal Finance', '100% of 3-month average', 'Adds 100% of incentive, but applicant must meet strict PF deduction requirement', 'MANDATORY: Salary must have PF deduction (22+PF DEDUCT REQ)'),
    (5, 'HDFC Bank', '50% of 3-month average', 'Adds 50% of average incentive to net monthly income -> Balanced boost', 'Standard corporate salary credits; Form 16 / PF for unlisted'),
    (6, 'Poonawalla Fincorp', '25% of 3-month average', 'Adds 25% of average incentive to monthly salary -> Conservative boost', 'Standard corporate salary credits; Additional PF rack applies'),
    (7, 'Kotak Mahindra Bank', '0% Default (Admin Configurable)', 'Default multiplier uses fixed salary; Admin dashboard can customize incentive %', 'Standard salary credit; minimum 1 month experience'),
    (8, 'Tata Capital', '0% Default (Admin Configurable)', 'Default multiplier uses fixed salary; Admin dashboard can customize incentive %', 'Standard salary credit; 12 months stability norm'),
    (9, 'Bandhan Bank', '0% Default (Admin Configurable)', 'FOIR income slabs use fixed salary; Admin dashboard can customize incentive %', 'Standard salary credit; Cat D requires 40k salary'),
    (10, 'Axis Bank', '0% (Fixed Net Salary Only)', 'Fixed monthly salary used for FOIR & Multipliers; Variable excluded from base', 'Standard salary credit; minimum 1 year overall experience'),
    (11, 'Axis Finance', '0% (Fixed Net Salary Only)', 'Fixed salary used for multiplier tiers (24x to 30x); Incentives not counted', 'Standard salary credit; minimum 6 months current stability'),
    (12, 'ICICI Bank', '0% (Fixed Net Salary Only)', 'Fixed monthly take-home salary used for multiplier; Incentives not counted in base', 'Standard salary credit; Open market requires 75k salary'),
    (13, 'SMFG India Credit', '0% (Fixed Net Salary Only)', 'Fixed net salary used for risk ROI slabs; Incentives not counted in base', 'ALLOWS 0 DEDUCTIONS: 25k+ salary accepted without PF deduction'),
    (14, 'InCred Finance', '0% (Fixed Net Salary Only)', 'Fixed salary slabs (15-20k, 20-30k, 30-40k, >40k) used for FOIR; Variable excluded', 'Standard salary credit; Loan processing fee: 2% to 5%'),
    (15, 'Bajaj Finance', '0% (Fixed Net Salary Only)', 'Fixed salary based (Sal Lite Program / Offer based); Variable not counted', 'Standard salary credit; Listed 27k, Unlisted 30k'),
    (16, 'Finnable Finance', '0% (Fixed Net Salary Only)', 'Fixed net salary used; Variable excluded from credit verification', 'CONDITIONAL PF: 3 credits with PF vs 6 credits without PF'),
    (17, 'Cholamandalam (Chola)', '0% (STRICTLY EXCLUDED)', 'Strictly excluded: Minimum salary must be ₹25k / ₹30k WITHOUT INCENTIVE', 'Standard salary credit; RM/SM/SO/SFE designations not allowed'),
    (18, 'AU Small Finance Bank', '0% (EXCLUDED / DEDUCTED)', 'Variable pay (Incentives, Bonus, Allowances) is deducted from gross income', 'Standard salary credit; Metro: 30k, Non-metro: 20k'),
    (19, 'Aditya Birla Finance (ABFL)', '0% (EXCLUDED FROM BASE BAND)', 'Income band evaluated Prior to Annual Bonus/Incentives', 'Standard salary credit; Tier 1: 40k down to Tier 4: 20k')
]

for idx, r in enumerate(inc_sorted):
    curr = 4 + idx
    ws2.row_dimensions[curr].height = 24
    for c_i, v in enumerate(r, 1):
        cell = ws2.cell(row=curr, column=c_i, value=v)
        cell.font = row_font
        cell.border = thin_border
        if c_i in [1, 3]:
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        else:
            cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        if idx % 2 == 1:
            cell.fill = zebra_fill
            
        if c_i == 3:
            if '100%' in v:
                cell.fill = PatternFill(start_color='DCFCE7', end_color='DCFCE7', fill_type='solid')
                cell.font = Font(name='Calibri', size=10, bold=True, color='166534')
            elif '50%' in v:
                cell.fill = PatternFill(start_color='E0F2FE', end_color='E0F2FE', fill_type='solid')
                cell.font = Font(name='Calibri', size=10, bold=True, color='0369A1')
            elif '25%' in v:
                cell.fill = PatternFill(start_color='FEF3C7', end_color='FEF3C7', fill_type='solid')
                cell.font = Font(name='Calibri', size=10, bold=True, color='B45309')
            elif 'EXCLUDED' in v:
                cell.fill = PatternFill(start_color='FEE2E2', end_color='FEE2E2', fill_type='solid')
                cell.font = Font(name='Calibri', size=10, bold=True, color='B91C1C')
            elif 'Configurable' in v:
                cell.fill = PatternFill(start_color='EDE9FE', end_color='EDE9FE', fill_type='solid')
                cell.font = Font(name='Calibri', size=10, bold=True, color='6D28D9')

ws2.column_dimensions['A'].width = 8
ws2.column_dimensions['B'].width = 28
ws2.column_dimensions['C'].width = 32
ws2.column_dimensions['D'].width = 54
ws2.column_dimensions['E'].width = 46

# Save to destination
wb.save(target_file)
print(f"Successfully saved target Excel file: {target_file}")

# Also save copy in workspace for safety
ws_copy = r"d:\chola data\laxmicredit\file-we-app-2025\Bank_PF_and_Incentive_Policy_Matrix.xlsx"
wb.save(ws_copy)
print(f"Successfully saved workspace copy: {ws_copy}")
