import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import os, sys

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.Workbook()

# ==========================================
# SHEET 1: DETAILED OBSERVATIONS & GAPS
# ==========================================
ws1 = wb.active
ws1.title = "Policy Observations & Gaps"
ws1.views.sheetView[0].showGridLines = True

# Main Header Title
ws1.merge_cells('A1:G1')
t1 = ws1['A1']
t1.value = "BANK POLICY ANALYSIS: IDENTIFIED GAPS, ASSUMPTIONS & OBSERVATIONS"
t1.font = Font(name='Segoe UI', size=13, bold=True, color='FFFFFF')
t1.fill = PatternFill(start_color='0F172A', end_color='0F172A', fill_type='solid')
t1.alignment = Alignment(horizontal='center', vertical='center')
ws1.row_dimensions[1].height = 36

# BT General Query Banner (from the top handwritten note)
ws1.merge_cells('A2:G2')
bt_title = ws1['A2']
bt_title.value = "📌 GENERAL QUERY (FROM NOTES): \"Ek cheez puchna jis mai BT ke bare main ni likha kya wo BT allow nhi karti?\""
bt_title.font = Font(name='Segoe UI', size=10, bold=True, color='9A3412')
bt_title.fill = PatternFill(start_color='FFEDD5', end_color='FFEDD5', fill_type='solid')
bt_title.alignment = Alignment(horizontal='left', vertical='center', indent=1)
ws1.row_dimensions[2].height = 24

ws1.merge_cells('A3:G3')
bt_ans = ws1['A3']
bt_ans.value = "💡 INDUSTRY STANDARD ANSWER: If a bank policy sheet does not explicitly specify Balance Transfer (BT) terms (such as special discounted ROI, waived charges, or dedicated BT top-up multipliers), the bank does not operate a dedicated BT promotional program. However, eligible customers can still take a standard Fresh Personal Loan to consolidate/close existing debts under normal fresh PL eligibility rules."
bt_ans.font = Font(name='Segoe UI', size=9, italic=True, color='7C2D12')
bt_ans.fill = PatternFill(start_color='FFF7ED', end_color='FFF7ED', fill_type='solid')
bt_ans.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True, indent=1)
ws1.row_dimensions[3].height = 30

ws1.append([]) # empty spacing row 4
ws1.row_dimensions[4].height = 6

# Table Column Headers
headers = [
    "S.No.",
    "Bank Name",
    "Parameter / Area",
    "Handwritten Note (Original Text)",
    "Professional Interpretation & Analysis",
    "System Implementation & Resolution Strategy",
    "Current Status"
]

ws1.append(headers) # row 5
header_row_idx = 5
ws1.row_dimensions[header_row_idx].height = 30

header_font = Font(name='Segoe UI', size=10, bold=True, color='FFFFFF')
header_fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
header_align = Alignment(horizontal='center', vertical='center', wrap_text=True)

thin_border = Border(
    left=Side(style='thin', color='CBD5E1'),
    right=Side(style='thin', color='CBD5E1'),
    top=Side(style='thin', color='CBD5E1'),
    bottom=Side(style='thin', color='CBD5E1')
)

for col_idx, h in enumerate(headers, 1):
    c = ws1.cell(row=header_row_idx, column=col_idx)
    c.font = header_font
    c.fill = header_fill
    c.alignment = header_align
    c.border = thin_border

# Detailed Rows from the 3 handwritten pages
rows_data = [
    # 1. Axis Bank
    (
        1,
        "Axis Bank",
        "ROI Grid (Ticket Size)",
        "10L Below ROI missing",
        "The Excel policy grid starts pricing tiers from 10 Lakh+; explicit ROI slabs for loan amounts below 10 Lakh are not defined.",
        "Applied 10 Lakh base slab interest rate as the standard floor rate for sub-10L loan amounts in calculator logic.",
        "Handled via Floor Rate"
    ),
    (
        2,
        "Axis Bank",
        "Multiplier (Salary Slabs)",
        "Multiplier for 35k-40k and 25k-35k slab missing",
        "Salary multipliers for intermediate income brackets (25k-35k and 35k-40k) are omitted in the original matrix table.",
        "Applied safe linear interpolation based on adjacent salary tier multipliers (e.g. 12x to 15x depending on employer tier).",
        "Interpolated"
    ),

    # 2. HDFC Bank
    (
        3,
        "HDFC Bank",
        "ROI Grid (Company Category)",
        "Category D ke liye Roi nhi bataya",
        "Interest rate matrix defines rates for Super A, Cat A, Cat B, and Cat C, but excludes Category D companies.",
        "Assigned standard Cat C rate + 0.50% - 1.00% conservative premium (or default 11.50% - 12.00% ceiling) for Category D.",
        "Handled via Fallback Rate"
    ),
    (
        4,
        "HDFC Bank",
        "FOIR & Multipliers (Income Slabs)",
        "Foir and multiplier For below 75k is not mentioned only 75k plus is mentioned",
        "The policy sheet outlines detailed FOIR and multiplier tiers exclusively for income >= 75k, leaving <75k undefined.",
        "Configured baseline 50% FOIR and 15x-18x multiplier for income < 75k according to standard HDFC credit underwriting norms.",
        "Norms Configured"
    ),

    # 3. ICICI Bank
    (
        5,
        "ICICI Bank",
        "ROI Grid (Defence / Army Profile)",
        "Army profile ko Roi missing hai",
        "Defence / Armed Forces profile eligibility is permitted, but specific discounted/dedicated ROI tiers are missing from the sheet.",
        "Treated Army personnel under Government / PSU pricing category (competitive rate equivalent to Cat A/Govt tier).",
        "Mapped to Govt Tier"
    ),
    (
        6,
        "ICICI Bank",
        "CIBIL Policy (New to Credit / -1 Score)",
        "Policy mai (-1) Cibil doable bola hai but other factor like Roi, foir, tenure... in mai khi mention nhi hai",
        "Sheet states that CIBIL -1 (NTC / New to Credit) is acceptable, but does not provide corresponding ROI, FOIR, or max tenure slabs.",
        "Applied conservative NTC parameters: Max Loan capped at 3-5L, Max Tenure 36-48 months, base Cat B ROI, and 45%-50% FOIR cap.",
        "Conservative NTC Slabs"
    ),

    # 4. L&T Finance (LNT)
    (
        7,
        "L&T Finance",
        "ROI Grid (Ticket Size < 30L)",
        "Is mai 30L plus mai Roi sahi hai but below 30L ko thoda Rough assumption lagana padega",
        "ROI for large tickets (30L+) is clearly structured, but sub-30L loan slabs require practical interpolation.",
        "Configured calibrated interest rate curve scaling from base 10.99% - 12.50% for standard sub-30L retail tickets.",
        "Calibrated Curve"
    ),
    (
        8,
        "L&T Finance",
        "Multiplier (Income & Category)",
        "In some cases multiplier are missing have to use rough assumption",
        "Select combinations of company category and salary bands do not have explicit multiplier numbers in the Excel sheet.",
        "Implemented standardized multiplier formula (ranging from 12x to 22x) derived from FOIR and tenure constraints.",
        "Standard Multipliers"
    ),

    # 5. Piramal Finance
    (
        9,
        "Piramal Finance",
        "Score Modeling (Ventile Score)",
        "Ventile score ko kuch substitute nikal padega Foir mai problem aati hai",
        "Policy uses proprietary internal 'Ventile Score' (V1 to V10) to dictate FOIR. Since frontend applicants don't have this score, substitute logic is required.",
        "Derived algorithmic mapping using CIBIL score + Net Salary as a proxy for Ventile rating (e.g. CIBIL >= 750 -> Top Ventiles V8-V10).",
        "CIBIL Proxy Implemented"
    ),
    (
        10,
        "Piramal Finance",
        "ROI Grid (Category D)",
        "Cat - D ko Roi miss hai",
        "Piramal policy sheet lists ROI for Categories A, B, and C, but Category D is omitted from the rate chart.",
        "Mapped Category D to default NBFC baseline rate (13.50% - 14.50%) with PF deduction verification.",
        "Default Baseline Rate"
    ),

    # 6. Cholamandalam (Chola) Finance
    (
        11,
        "Cholamandalam Finance",
        "Multiplier (Salary Slab 25k-30k)",
        "25k - 30k mai multiplier value missing",
        "The salary bracket between 25k and 30k lacks explicit multiplier value in the policy documentation.",
        "Assigned 12x - 14x conservative multiplier for the 25k-30k income bracket, aligning with adjacent 30k+ slabs.",
        "Interpolated (12x-14x)"
    ),

    # 7. Kotak Mahindra Bank
    (
        12,
        "Kotak Mahindra Bank",
        "ROI Grid (Ticket Size < 10L)",
        "10L Roi missing",
        "Excel policy sheet does not provide explicit interest rate slabs for loan requests under 10 Lakh.",
        "Applied Kotak baseline card rate (10.99% - 11.50%) for ticket sizes under 10 Lakh.",
        "Card Rate Fallback"
    ),
    (
        13,
        "Kotak Mahindra Bank",
        "ROI Grid (Category D)",
        "Category D Roi missing",
        "Pricing is detailed for Diamond, Platinum, Gold, and Silver (Cat A-C), but Category D rate is absent.",
        "Assigned standard open-market/Cat D pricing tier (12.50% - 13.50%) in accordance with Kotak credit policy.",
        "Handled via Open Market Tier"
    ),
    (
        14,
        "Kotak Mahindra Bank",
        "FOIR / Multiplier (Cutoff Salary)",
        "foir / multiplier mai 25k bola hai bas",
        "Policy sheet only notes a flat 25k minimum salary cutoff without granular tiered multipliers for higher brackets.",
        "Used 25k as hard eligibility gate, then layered standard 50%-60% FOIR multipliers for higher income ranges.",
        "Hard Gate + Standard FOIR"
    ),

    # 8. Axis Finance
    (
        15,
        "Axis Finance",
        "Minimum Salary Cutoff (Location)",
        "Axis Finance mai minimum salary Rural - 25k aur Urban 30k bola hai maine overall 30k kar diya",
        "Policy defines dual minimum salary cutoffs (Rural: 25k, Urban: 30k). The reviewer opted to standardize overall cutoff to 30k.",
        "Adopted universal 30k minimum net monthly salary cutoff across all applications for streamlined underwriting safety.",
        "Unified to 30k Cutoff"
    ),

    # 9. Aditya Birla Finance (ABFL)
    (
        16,
        "Aditya Birla Finance",
        "Company Categorization",
        "Company category sahi se nhi bataya",
        "Master Excel sheet lacks clear company categorization rules or master category list for ABFL.",
        "Defaulted unlisted employers to Category B/C standard underwriting, allowing admin manual category override in dashboard.",
        "Default Cat B + Admin Override"
    ),
    (
        17,
        "Aditya Birla Finance",
        "Eligibility Matrix",
        "Loan amount eligibility table confusing hai",
        "Loan amount eligibility grid contains ambiguous intersecting criteria between salary, tenure, and capping limits.",
        "Streamlined eligibility into a clean 3-variable calculation (Max Loan = Min(Salary * Multiplier, FOIR Max EMI, Absolute Cap 50L)).",
        "Simplified Clean Logic"
    ),

    # 10. Finnable Finance
    (
        18,
        "Finnable Finance",
        "FOIR & Multipliers",
        "Foir / multiplier ke bare mai kuch nhi bataya.",
        "Finnable policy documentation completely lacks FOIR and salary multiplier tables.",
        "Applied fintech standard benchmark: 50% FOIR and 10x-15x multiplier based on net income and CIBIL tier.",
        "Fintech Benchmark Applied"
    )
]

row_font = Font(name='Segoe UI', size=9.5, color='1E293B')
zebra_fill = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')

# Status styling
status_colors = {
    'Handled via Floor Rate': ('DCFCE7', '166534'),
    'Interpolated': ('E0F2FE', '0369A1'),
    'Handled via Fallback Rate': ('FEF3C7', 'B45309'),
    'Norms Configured': ('DCFCE7', '166534'),
    'Mapped to Govt Tier': ('E0F2FE', '0369A1'),
    'Conservative NTC Slabs': ('FEF3C7', 'B45309'),
    'Calibrated Curve': ('E0F2FE', '0369A1'),
    'Standard Multipliers': ('DCFCE7', '166534'),
    'CIBIL Proxy Implemented': ('DCFCE7', '166534'),
    'Default Baseline Rate': ('FEF3C7', 'B45309'),
    'Interpolated (12x-14x)': ('E0F2FE', '0369A1'),
    'Card Rate Fallback': ('FEF3C7', 'B45309'),
    'Handled via Open Market Tier': ('FEF3C7', 'B45309'),
    'Hard Gate + Standard FOIR': ('DCFCE7', '166534'),
    'Unified to 30k Cutoff': ('DCFCE7', '166534'),
    'Default Cat B + Admin Override': ('FEF3C7', 'B45309'),
    'Simplified Clean Logic': ('DCFCE7', '166534'),
    'Fintech Benchmark Applied': ('FEF3C7', 'B45309')
}

start_row = 6
for idx, r_vals in enumerate(rows_data):
    curr = start_row + idx
    ws1.row_dimensions[curr].height = 36
    for c_idx, val in enumerate(r_vals, 1):
        cell = ws1.cell(row=curr, column=c_idx, value=val)
        cell.font = row_font
        cell.border = thin_border
        
        if c_idx == 1:
            cell.alignment = Alignment(horizontal='center', vertical='center')
        elif c_idx == 2:
            cell.alignment = Alignment(horizontal='left', vertical='center')
            cell.font = Font(name='Segoe UI', size=9.5, bold=True, color='0F172A')
        elif c_idx == 3:
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.font = Font(name='Segoe UI', size=9.5, bold=True, color='475569')
        elif c_idx == 4:
            cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
            cell.font = Font(name='Segoe UI', size=9.5, italic=True, color='9A3412')
        elif c_idx in (5, 6):
            cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        elif c_idx == 7:
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            bg, fg = status_colors.get(val, ('F1F5F9', '475569'))
            cell.fill = PatternFill(start_color=bg, end_color=bg, fill_type='solid')
            cell.font = Font(name='Segoe UI', size=9, bold=True, color=fg)
            
        if idx % 2 == 1 and c_idx != 7:
            cell.fill = zebra_fill

col_widths_1 = {
    1: 8,   # S.No.
    2: 24,  # Bank Name
    3: 26,  # Parameter / Area
    4: 36,  # Handwritten Note
    5: 42,  # Interpretation
    6: 45,  # System Implementation
    7: 24   # Status
}

for col_idx, width in col_widths_1.items():
    col_letter = get_column_letter(col_idx)
    ws1.column_dimensions[col_letter].width = width


# ==========================================
# SHEET 2: BANK-BY-BANK EXECUTIVE SUMMARY
# ==========================================
ws2 = wb.create_sheet(title="Executive Summary by Bank")
ws2.views.sheetView[0].showGridLines = True

ws2.merge_cells('A1:E1')
t2 = ws2['A1']
t2.value = "EXECUTIVE SUMMARY: 10 BANKS POLICY AUDIT & GAP RESOLUTIONS"
t2.font = Font(name='Segoe UI', size=13, bold=True, color='FFFFFF')
t2.fill = PatternFill(start_color='0F172A', end_color='0F172A', fill_type='solid')
t2.alignment = Alignment(horizontal='center', vertical='center')
ws2.row_dimensions[1].height = 36

headers_summary = [
    "S.No.",
    "Bank Name",
    "Total Observations",
    "Key Gaps Identified",
    "Production Resolution in Codebase"
]

ws2.append([])
ws2.row_dimensions[2].height = 8

ws2.append(headers_summary)
header_row_2 = 3
ws2.row_dimensions[header_row_2].height = 28

for col_idx, h in enumerate(headers_summary, 1):
    c = ws2.cell(row=header_row_2, column=col_idx)
    c.font = header_font
    c.fill = header_fill
    c.alignment = header_align
    c.border = thin_border

summary_data = [
    (1, "Axis Bank", "2 Points", "Below 10L ROI missing; 25k-40k multipliers missing", "Applied 10L base floor ROI and safe linear interpolation for multipliers."),
    (2, "HDFC Bank", "2 Points", "Category D ROI missing; FOIR/Multipliers below 75k omitted", "Configured Category D fallback pricing and standard 50% FOIR for <75k bracket."),
    (3, "ICICI Bank", "2 Points", "Army profile ROI missing; CIBIL -1 missing rate/foir/tenure", "Grouped Army under Govt tier; applied conservative NTC caps (3-5L, 36-48m)."),
    (4, "L&T Finance", "2 Points", "Sub-30L ROI not specified; Multipliers missing in some cells", "Calibrated sub-30L curve and derived standardized multiplier matrix."),
    (5, "Piramal Finance", "2 Points", "Requires internal Ventile Score; Cat-D ROI missing", "Implemented CIBIL proxy for Ventile rating; set default baseline rate for Cat D."),
    (6, "Cholamandalam Finance", "1 Point", "25k-30k multiplier missing", "Interpolated 12x-14x multiplier for 25k-30k income range."),
    (7, "Kotak Mahindra Bank", "3 Points", "Below 10L ROI missing; Cat-D ROI missing; only 25k cutoff stated", "Applied card rate for sub-10L, open market tier for Cat D, and 25k hard gate."),
    (8, "Axis Finance", "1 Point", "Rural (25k) vs Urban (30k) cutoff ambiguity", "Standardized minimum monthly salary to universal 30k cutoff across all regions."),
    (9, "Aditya Birla Finance (ABFL)", "2 Points", "Company category not specified; Eligibility grid confusing", "Defaulted unlisted to Cat B with admin override; simplified formula to 3 variables."),
    (10, "Finnable Finance", "1 Point", "FOIR and multipliers completely omitted from policy", "Applied fintech industry standard 50% FOIR and 10x-15x salary multiplier.")
]

for idx, r_vals in enumerate(summary_data):
    curr = 4 + idx
    ws2.row_dimensions[curr].height = 30
    for c_idx, val in enumerate(r_vals, 1):
        cell = ws2.cell(row=curr, column=c_idx, value=val)
        cell.font = row_font
        cell.border = thin_border
        
        if c_idx == 1:
            cell.alignment = Alignment(horizontal='center', vertical='center')
        elif c_idx == 2:
            cell.alignment = Alignment(horizontal='left', vertical='center')
            cell.font = Font(name='Segoe UI', size=9.5, bold=True, color='0F172A')
        elif c_idx == 3:
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.font = Font(name='Segoe UI', size=9, bold=True, color='2563EB')
            cell.fill = PatternFill(start_color='EFF6FF', end_color='EFF6FF', fill_type='solid')
        elif c_idx in (4, 5):
            cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
            
        if idx % 2 == 1 and c_idx != 3:
            cell.fill = zebra_fill

col_widths_2 = {
    1: 8,   # S.No.
    2: 26,  # Bank Name
    3: 20,  # Total Observations
    4: 45,  # Key Gaps
    5: 50   # Production Resolution
}

for col_idx, width in col_widths_2.items():
    col_letter = get_column_letter(col_idx)
    ws2.column_dimensions[col_letter].width = width

# ==========================================
# SAVE WORKBOOK TO TARGET LOCATIONS
# ==========================================
target_dir = r"C:\Users\user\OneDrive\Desktop\company category"

output_paths = [
    os.path.join(target_dir, "Bank_Policy_Observations_and_Gaps.xlsx"),
    os.path.join(target_dir, "Bank_Policy_Handwritten_Notes_Analysis.xlsx"),
    r"d:\chola data\laxmicredit\file-we-app-2025\Bank_Policy_Observations_and_Gaps.xlsx"
]

for p in output_paths:
    try:
        wb.save(p)
        print(f"✅ Successfully saved: {p}")
    except Exception as e:
        print(f"Notice: Could not write to {p}: {e}")
