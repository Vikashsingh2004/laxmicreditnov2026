import openpyxl

wb = openpyxl.load_workbook(r'c:\Users\user\Downloads\BT_Policy_Rules_Exact.xlsx', data_only=True)
ws = wb['BT Policy Rules']

excel_data = {}
for r in range(4, 21):
    sno = ws.cell(r, 1).value
    name = ws.cell(r, 2).value
    status = ws.cell(r, 3).value
    extra = ws.cell(r, 4).value
    excel_data[int(sno)] = {'name': name, 'status': status, 'extra': extra}

bank_mapping = [
    (1, 'axis-bank', 'Axis Bank'),
    (2, 'indusind', 'IndusInd Bank'),
    (3, 'hdfc', 'HDFC Bank'),
    (4, 'icici', 'ICICI Bank'),
    (5, 'idfc', 'IDFC First Bank'),
    (6, 'lnt', 'L&T Finance'),
    (7, 'piramal', 'Piramal Finance'),
    (8, 'smfg', 'SMFG India Credit'),
    (9, 'cholamandalam', 'Cholamandalam Finance'),
    (10, 'kotak', 'Kotak Mahindra Bank'),
    (11, 'bandhan', 'Bandhan Bank'),
    (12, 'incred', 'Incred Finance'),
    (13, 'au-bank', 'AU Small Finance Bank'),
    (14, 'axis-fin', 'Axis Finance'),
    (15, 'tata', 'Tata Capital'),
    (16, 'poonawala', 'Poonawala Finance'),
    (17, 'abfl', 'Aditya Birla Finance')
]

print(f"{'SNo':3s} | {'Bank ID':14s} | {'Bank Name':24s} | {'Exact Rules (Excel)':46s} | {'Case Capping / Extra'}")
print('-' * 115)
for sno, bid, bname in bank_mapping:
    ex = excel_data[sno]
    st = ex['status'] or 'None'
    ex_note = ex['extra'] or '-'
    print(f"{sno:3d} | {bid:14s} | {bname:24s} | {st:46s} | {ex_note}")

