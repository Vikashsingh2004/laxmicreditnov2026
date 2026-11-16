import re, os, json, openpyxl

print("--- 1. bankConfigService.js btConfiguration ---")
with open('src/services/bankConfigService.js', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = re.compile(r"'([^']+)':\s*\{.*?(btConfiguration:\s*\{[^}]+\})", re.DOTALL)
for m in pattern.finditer(text):
    print(f"Bank: {m.group(1)}")
    print(f"  {m.group(2)}\n")

print("\n--- 2. BT mentions in src/config/*BankPolicy.js ---")
for fname in sorted(os.listdir('src/config')):
    if fname.endswith('Policy.js'):
        fpath = os.path.join('src/config', fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'BT' in content or 'bt' in content.lower() or 'balance transfer' in content.lower():
                bt_lines = [line.strip() for line in content.split('\n') if any(k in line.lower() for k in ['bt', 'balance transfer', 'card bt', 'pl bt'])]
                print(f"File: {fname} (matches: {len(bt_lines)})")
                for l in bt_lines[:6]:
                    print(f"   {l}")


print("\n--- 3. UnifiedBankPolicyManager.jsx tabs and sections ---")
with open('src/components/admin/UnifiedBankPolicyManager.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

tabs = re.findall(r"activeTab\s*===\s*['\"]([^'\"]+)['\"]", text)
print("Unique activeTabs:", set(tabs))

subtabs = re.findall(r"activeSubTab\s*===\s*['\"]([^'\"]+)['\"]", text)
print("Unique activeSubTabs:", set(subtabs))

menu_items = re.findall(r"id:\s*['\"]([^'\"]+)['\"],\s*label:\s*['\"]([^'\"]+)['\"]", text)
print("Menu items / submenus:", menu_items[:20])

print("\n--- 4. Search for 'bt' or 'balance transfer' in UnifiedBankPolicyManager state/inputs ---")
input_matches = re.findall(r"<input[^>]+(?:bt|balance)[^>]+>", text, re.IGNORECASE)
print(f"Direct BT inputs in UnifiedBankPolicyManager: {len(input_matches)}")
for inp in input_matches[:10]:
    print("  ", inp)

