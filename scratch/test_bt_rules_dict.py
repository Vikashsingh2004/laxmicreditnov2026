# Test BT rules dictionary for all 17 banks
BT_RULES_17_BANKS = {
    'axis-bank': {
        'name': 'Axis Bank',
        'allowPlBt': True,
        'plBtAllowedCount': 5,
        'allowCcBt': True,
        'ccBtAllowedCount': 5,
        'totalBtCaseCap': 5,
        'maxCcBtSalaryMultiplier': 6,
        'notes': '5 CC BT Allow / PL BT 5 ALLOW (Depend on case)'
    },
    'indusind': {
        'name': 'IndusInd Bank',
        'allowPlBt': True,
        'plBtAllowedCount': 5,
        'allowCcBt': False,
        'ccBtAllowedCount': 0,
        'totalBtCaseCap': 5,
        'maxCcBtSalaryMultiplier': 0,
        'notes': '5 PL BT ALLOW / CC BT NOT ALLOW'
    },
    'hdfc': {
        'name': 'HDFC Bank',
        'allowPlBt': True,
        'plBtAllowedCount': 3,
        'allowCcBt': False,
        'ccBtAllowedCount': 0,
        'totalBtCaseCap': 3,
        'maxCcBtSalaryMultiplier': 0,
        'notes': '3 PL BT ALLOW / CC BT NOT ALLOW'
    },
    'icici': {
        'name': 'ICICI Bank',
        'allowPlBt': True,
        'plBtAllowedCount': 3,
        'allowCcBt': False,
        'ccBtAllowedCount': 0,
        'totalBtCaseCap': 3,
        'maxCcBtSalaryMultiplier': 0,
        'notes': '3 PL BT ALLOW / CC BT NOT ALLOW'
    },
    'idfc': {
        'name': 'IDFC First Bank',
        'allowPlBt': True,
        'plBtAllowedCount': 3,
        'allowCcBt': True,
        'ccBtAllowedCount': 3,
        'totalBtCaseCap': 6,
        'maxCcBtSalaryMultiplier': 6,
        'notes': '3 CC BT ALLOW / 3 PL BT ALLOW (Total 6 in case)'
    },
    'lnt': {
        'name': 'L&T Finance',
        'allowPlBt': True,
        'plBtAllowedCount': 6,
        'allowCcBt': False,
        'ccBtAllowedCount': 0,
        'totalBtCaseCap': 6,
        'maxCcBtSalaryMultiplier': 0,
        'notes': '6 PL BT ALLOW / CC BT NOT ALLOW'
    },
    'piramal': {
        'name': 'Piramal Finance',
        'allowPlBt': True,
        'plBtAllowedCount': 3,
        'allowCcBt': True,
        'ccBtAllowedCount': 2,
        'totalBtCaseCap': 3,
        'requiresPlWithCc': True,
        'maxCcBtSalaryMultiplier': 5,
        'notes': '2 CC BT ALLOW / 3 PL BT ALLOW (Total 3 BT in case)'
    },
    'smfg': {
        'name': 'SMFG India Credit',
        'allowPlBt': True,
        'plBtAllowedCount': 999,
        'allowCcBt': True,
        'ccBtAllowedCount': 2,
        'totalBtCaseCap': 999,
        'maxCcBtSalaryMultiplier': 5,
        'notes': '2 CC BT + AL BT + UNLIMITED PL BT'
    },
    'cholamandalam': {
        'name': 'Cholamandalam Finance',
        'allowPlBt': True,
        'plBtAllowedCount': 4,
        'allowCcBt': True,
        'ccBtAllowedCount': 6,
        'totalBtCaseCap': 6,
        'maxCcBtSalaryMultiplier': 6,
        'notes': '6 CC BT Allow / 4 PL BT ALLOW (6 BT ALLOW IN CASE, POS <= 6x salary)'
    },
    'kotak': {
        'name': 'Kotak Mahindra Bank',
        'allowPlBt': True,
        'plBtAllowedCount': 999,
        'allowCcBt': False,
        'ccBtAllowedCount': 0,
        'totalBtCaseCap': 999,
        'maxCcBtSalaryMultiplier': 0,
        'notes': 'UNLIMITED PL BT / CC BT NOT ALLOW'
    },
    'bandhan': {
        'name': 'Bandhan Bank',
        'allowPlBt': True,
        'plBtAllowedCount': 3,
        'allowCcBt': False,
        'ccBtAllowedCount': 0,
        'totalBtCaseCap': 3,
        'maxCcBtSalaryMultiplier': 0,
        'notes': '3 PL BT ALLOW / CC BT NOT ALLOW'
    },
    'incred': {
        'name': 'Incred Finance',
        'allowPlBt': False,
        'plBtAllowedCount': 0,
        'allowCcBt': False,
        'ccBtAllowedCount': 0,
        'totalBtCaseCap': 0,
        'maxCcBtSalaryMultiplier': 0,
        'isFreshOnly': True,
        'notes': 'ONLY FRESH FUNDING'
    },
    'au-bank': {
        'name': 'AU Small Finance Bank',
        'allowPlBt': True,
        'plBtAllowedCount': 3,
        'allowCcBt': False,
        'ccBtAllowedCount': 0,
        'totalBtCaseCap': 3,
        'maxCcBtSalaryMultiplier': 0,
        'notes': '3 PL BT ALLOW / CC BT NOT ALLOW'
    },
    'axis-fin': {
        'name': 'Axis Finance',
        'allowPlBt': True,
        'plBtAllowedCount': 7,
        'allowCcBt': True,
        'ccBtAllowedCount': 7,
        'totalBtCaseCap': 7,
        'maxCcBtSalaryMultiplier': 6,
        'ccBtRoi': 18.0,
        'notes': '7 CC BT Allow / 7 PL BT ALLOW (7 BT ALLOW IN CASE, CC BT ROI 18%)'
    },
    'tata': {
        'name': 'Tata Capital',
        'allowPlBt': True,
        'plBtAllowedCount': 6,
        'allowCcBt': True,
        'ccBtAllowedCount': 6,
        'totalBtCaseCap': 6,
        'maxCcBtSalaryMultiplier': 6,
        'notes': '6 CC BT Allow / PL BT 6 ALLOW (6 BT ALLOW IN CASE)'
    },
    'poonawala': {
        'name': 'Poonawala Finance',
        'allowPlBt': True,
        'plBtAllowedCount': 5,
        'allowCcBt': True,
        'ccBtAllowedCount': 6,
        'allowAppLoanBt': True,
        'maxAppLoanBtCount': 3,
        'totalBtCaseCap': 8,
        'maxCcBtSalaryMultiplier': 4,
        'notes': '6 CC BT Allow / PL BT 5 ALLOW / 3 APP LOAN BT ALLOW (8 BT ALLOW IN CASE, POS <= 4x salary)'
    },
    'abfl': {
        'name': 'Aditya Birla Finance',
        'allowPlBt': True,
        'plBtAllowedCount': 4,
        'allowCcBt': True,
        'ccBtAllowedCount': 5,
        'totalBtCaseCap': 6,
        'maxCcBtSalaryMultiplier': 6,
        'paperlessBtPremium': 1.0,
        'notes': '5 CC BT ALLOW / 4 PL BT ALLOW (6 BT ALLOW IN CASE, POS <= 6x salary)'
    }
}

print(f"Total defined banks: {len(BT_RULES_17_BANKS)}")
for k, v in BT_RULES_17_BANKS.items():
    print(f"{k:15s}: PL={v['plBtAllowedCount']} (Allowed={v['allowPlBt']}), CC={v['ccBtAllowedCount']} (Allowed={v['allowCcBt']}), Cap={v['totalBtCaseCap']}")

