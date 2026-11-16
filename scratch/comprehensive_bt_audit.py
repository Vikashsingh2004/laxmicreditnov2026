import openpyxl, os, re, json

wb_bt = openpyxl.load_workbook('BT_Policy_Rules.xlsx', data_only=True)
ws_bt = wb_bt['BT Policy Rules']

excel_bt_rules = {}
for r in range(4, ws_bt.max_row + 1):
    bank = ws_bt.cell(r, 2).value
    summary = ws_bt.cell(r, 3).value
    cc_limit = ws_bt.cell(r, 4).value
    pl_limit = ws_bt.cell(r, 5).value
    notes = ws_bt.cell(r, 6).value
    if bank:
        excel_bt_rules[bank.strip()] = {
            'summary': summary,
            'cc_limit': cc_limit,
            'pl_limit': pl_limit,
            'notes': notes
        }

print("=== 1. EXCEL BT RULES (from BT_Policy_Rules.xlsx) ===")
for b, data in excel_bt_rules.items():
    print(f"{b}: Summary='{data['summary']}', CC='{data['cc_limit']}', PL='{data['pl_limit']}', Notes='{data['notes']}'")

print("\n=== 2. BANK CONFIG SERVICE DEFAULTS (bankConfigService.js) ===")
with open('src/services/bankConfigService.js', 'r', encoding='utf-8') as f:
    bcs_text = f.read()

pattern = re.compile(r"'([^']+)':\s*\{.*?(btConfiguration:\s*\{[^}]+\})", re.DOTALL)
for m in pattern.finditer(bcs_text):
    print(f"Bank: {m.group(1)} -> {m.group(2)}")

print("\n=== 3. ENHANCED LOAN SERVICE (enhancedLoanService.js) BT RESTRICTIONS ===")
with open('src/services/enhancedLoanService.js', 'r', encoding='utf-8') as f:
    els_text = f.read()

# find if checks for specific bank ids
checks = re.findall(r"if\s*\(([^)]*(?:bandhan|indusind|piramal|smfg|kotak|lnt|chola|tata|axis|poonawala|au)[^)]*)\)\s*\{([^}]+(?:return|reject)[^}]+)\}", els_text, re.DOTALL)
for cond, body in checks:
    print(f"Condition: {cond.strip()}")
    # extract reasons
    reasons = re.findall(r"reason:\s*['\"`]([^'\"`]+)['\"`]", body)
    print(f"  Reasons: {reasons}")


print("\n=== 4. HOW BANK CALCULATORS HANDLE isBTMode ===")
banks_dir = 'src/banks'
for b in sorted(os.listdir(banks_dir)):
    calc_path = os.path.join(banks_dir, b, 'calculator.js')
    if os.path.exists(calc_path):
        with open(calc_path, 'r', encoding='utf-8') as f:
            code = f.read()
            # search for isBTMode logic
            bt_blocks = re.findall(r"(?:if\s*\([^)]*isBTMode[^)]*\)|isBTMode\s*\?[^;]+;|\bnumBtTotalEMI\b|\bbtTotalEMI\b|\bbtTotalOutstanding\b)[^\n]*", code)
            if bt_blocks:
                print(f"--- Bank: {b} ---")
                for bl in bt_blocks[:5]:
                    print("  ", bl)
