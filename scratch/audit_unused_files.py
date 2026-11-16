import os
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

root_dir = r"d:\chola data\laxmicredit\file-we-app-2025"

def normalize(p):
    return os.path.normpath(p).replace("\\", "/")

all_files = set()
for dirpath, dirnames, filenames in os.walk(root_dir):
    if any(k in dirpath for k in ['node_modules', '.git', 'dist', '.gemini']):
        continue
    for f in filenames:
        rel = normalize(os.path.relpath(os.path.join(dirpath, f), root_dir))
        all_files.add(rel)

# Starting entries for production app
entry_points = ['index.html', 'src/main.jsx', 'src/CustomerFacingApp.jsx', 'src/AdminPortalApp.jsx']

visited = set()
queue = [e for e in entry_points if e in all_files]

# Also check dynamic data files loaded via fetch() in companyDatabaseService / leadService / calculators
dynamic_data_files = [
    'public/data/universal_companies.json',
    'public/data/kotak_companies.json',
    'public/data/tata_companies.json',
    'public/data/poonawala_companies.json',
    'public/data/idfc_companies.json',
    'public/data/hdfc_companies.json',
    'public/data/icici_companies.json',
    'public/data/chola_companies.json',
    'public/data/indusind_companies.json',
    'public/data/bandhan_companies.json',
    'public/data/lt_companies.json',
    'public/data/piramal_companies.json',
    'public/data/smfg_companies.json',
    'public/data/axis_fin_companies.json',
    'public/data/axis_bank_companies.json',
    'public/data/incred_companies.json',
    'public/data/au_bank_companies.json',
    'public/data/abfl_companies.json',
    'public/laxmi-logo.png',
    'public/favicon.png',
    'public/favicon.ico',
    'public/apple-touch-icon.png',
    'public/logo.png',
    'public/founder.jpg',
    'public/incred-model-cutout.png',
    'public/incred-model.png',
    'public/incred-model.jpg'
]

for d in dynamic_data_files:
    if d in all_files:
        queue.append(d)

import_regexes = [
    re.compile(r"""import\s+.*?from\s+['"]([^'"]+)['"]"""),
    re.compile(r"""import\s+['"]([^'"]+)['"]"""),
    re.compile(r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
    re.compile(r"""src=['"]([^'"]+)['"]"""),
    re.compile(r"""href=['"]([^'"]+)['"]""")
]

exts = ['', '.jsx', '.js', '.json', '.css', '.png', '.jpg', '.svg']

while queue:
    curr = queue.pop(0)
    if curr in visited:
        continue
    visited.add(curr)
    
    full_path = os.path.join(root_dir, curr)
    if not os.path.exists(full_path):
        continue
        
    try:
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception:
        continue
        
    dir_of_curr = os.path.dirname(curr)
    
    for regex in import_regexes:
        for ref in regex.findall(content):
            ref = ref.strip()
            if ref.startswith('.') or ref.startswith('/'):
                if ref.startswith('/'):
                    target_rel = ref.lstrip('/')
                else:
                    target_rel = normalize(os.path.join(dir_of_curr, ref))
                
                found = False
                for ext in exts:
                    cand = target_rel + ext if not target_rel.endswith(ext) or ext == '' else target_rel
                    if cand in all_files:
                        if cand not in visited and cand not in queue:
                            queue.append(cand)
                        found = True
                        break
                if not found:
                    for ext in exts:
                        cand = normalize(os.path.join(target_rel, 'index' + ext))
                        if cand in all_files:
                            if cand not in visited and cand not in queue:
                                queue.append(cand)
                            break

unused_files = all_files - visited

print(f"==========================================================================")
print(f"📊 CODEBASE AUDIT SUMMARY")
print(f"==========================================================================")
print(f"• Total Files in Workspace: {len(all_files):,}")
print(f"• Core Production App Files (Participating): {len(visited):,}")
print(f"• Non-Participating / Test / Scratch / Helper Files: {len(unused_files):,}\n")

categories = {
    'scratch_folder': [],
    'test_utils_in_src': [],
    'backend_or_py_helpers': [],
    'standalone_js_tests_in_root': [],
    'obsolete_public_or_data': [],
    'other_standalone': []
}

for f in sorted(unused_files):
    if f.startswith('scratch/'):
        categories['scratch_folder'].append(f)
    elif f.startswith('src/utils/') or 'test' in f.lower() or 'scenario' in f.lower() or 'demo' in f.lower():
        categories['test_utils_in_src'].append(f)
    elif f.startswith('backend/') or f.startswith('bl-backend/') or f.endswith('.py') or f.endswith('.mjs'):
        categories['backend_or_py_helpers'].append(f)
    elif f.endswith('.js') and '/' not in f:
        categories['standalone_js_tests_in_root'].append(f)
    elif f.startswith('public/') or f.startswith('data/'):
        categories['obsolete_public_or_data'].append(f)
    else:
        categories['other_standalone'].append(f)

for cat_name, file_list in categories.items():
    print(f"--------------------------------------------------------------------------")
    print(f"📁 {cat_name.upper().replace('_', ' ')} ({len(file_list)} files)")
    print(f"--------------------------------------------------------------------------")
    for fl in file_list:
        print(f"  • {fl}")
    print()
