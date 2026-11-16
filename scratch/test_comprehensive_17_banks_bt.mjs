import { calculateLoanEligibility } from '../src/services/realLoanService.js';

async function testScenario1_PL_Only() {
  console.log('\n============================================================');
  console.log('🧪 SCENARIO 1: PL BT ONLY (2 PL debts: ₹1.5L + ₹1.5L = ₹3L)');
  console.log('============================================================');
  const input = {
    monthlyIncome: 85000,
    cibilScore: 780,
    companyName: 'TCS',
    companyType: 'Listed Public Ltd',
    salaryMode: 'BANK',
    currentObligations: 20000,
    loanTenure: 5,
    wantsBT: true,
    isBTMode: true,
    loansForBT: [
      { id: '1', bank: 'SBI', type: 'Personal Loan', emi: 8000, outstandingAmount: 150000 },
      { id: '2', bank: 'HDFC', type: 'Personal Loan', emi: 8000, outstandingAmount: 150000 }
    ]
  };

  const results = await calculateLoanEligibility(input);
  let failed = 0;
  results.forEach(r => {
    if (r.bankName.includes('Incred')) {
      if (!r.eligible && r.btNotAllowed) {
        console.log(`✅ [EXPECTED REJECT] ${r.bankName}: Not Allowed (Fresh Funding only)`);
      } else {
        console.error(`❌ [FAILURE] ${r.bankName} should be rejected with btNotAllowed: true!`);
        failed++;
      }
    } else {
      if (r.eligible && r.freshAmountDisbursed > 0 && r.totalDebtCleared === 300000) {
        console.log(`✅ [APPROVED] ${r.bankName.padEnd(25)} | Loan: ₹${r.loanAmount} | Debt: ₹${r.totalDebtCleared} | Fresh: ₹${r.freshAmountDisbursed}`);
      } else {
        console.error(`❌ [FAILURE] ${r.bankName.padEnd(25)}: eligible=${r.eligible}, fresh=${r.freshAmountDisbursed}, reason=${r.reason}`);
        failed++;
      }
    }
  });
  return failed;
}

async function testScenario2_CC_Only() {
  console.log('\n============================================================');
  console.log('🧪 SCENARIO 2: CC BT ONLY (1 CC debt: ₹1,50,000)');
  console.log('============================================================');
  const input = {
    monthlyIncome: 85000,
    cibilScore: 780,
    companyName: 'TCS',
    companyType: 'Listed Public Ltd',
    salaryMode: 'BANK',
    currentObligations: 20000,
    loanTenure: 5,
    wantsBT: true,
    isBTMode: true,
    loansForBT: [
      { id: '1', bank: 'HDFC Bank CC', type: 'Credit Card', emi: 7500, outstandingAmount: 150000 }
    ]
  };

  const results = await calculateLoanEligibility(input);
  const prohibitedBanks = ['IndusInd Bank', 'HDFC Bank', 'ICICI Bank', 'Kotak Mahindra Bank', 'Bandhan Bank', 'L&T Finance', 'AU Small Finance Bank', 'Incred Finance', 'Piramal Finance'];
  const allowedBanks = ['Axis Bank', 'IDFC First Bank', 'SMFG India Credit', 'Cholamandalam Finance', 'Axis Finance', 'Tata Capital', 'Poonawala Finance', 'Aditya Birla Finance'];

  let failed = 0;
  results.forEach(r => {
    const isProhibited = prohibitedBanks.some(pb => r.bankName.toLowerCase().includes(pb.toLowerCase()));
    const isAllowed = allowedBanks.some(ab => r.bankName.toLowerCase().includes(ab.toLowerCase()));

    if (isProhibited) {
      if (!r.eligible && r.btNotAllowed) {
        console.log(`✅ [EXPECTED REJECT] ${r.bankName.padEnd(25)}: btNotAllowed=true | Reason: ${r.reason.slice(0, 60)}`);
      } else {
        console.error(`❌ [FAILURE] ${r.bankName} should reject CC BT with btNotAllowed: true!`);
        failed++;
      }
    } else if (isAllowed) {
      if (r.eligible && r.freshAmountDisbursed > 0) {
        console.log(`✅ [APPROVED CC BT]  ${r.bankName.padEnd(25)} | Loan: ₹${r.loanAmount} | Debt: ₹${r.totalDebtCleared} | Fresh: ₹${r.freshAmountDisbursed}`);
      } else {
        console.error(`❌ [FAILURE] ${r.bankName} should allow CC BT! eligible=${r.eligible}, reason=${r.reason}`);
        failed++;
      }
    }
  });
  return failed;
}

async function testScenario3_Mixed_BT() {
  console.log('\n============================================================');
  console.log('🧪 SCENARIO 3: MIXED BT (1 PL ₹2,00,000 + 1 CC ₹1,00,000 = ₹3,00,000)');
  console.log('============================================================');
  const input = {
    monthlyIncome: 85000,
    cibilScore: 780,
    companyName: 'TCS',
    companyType: 'Listed Public Ltd',
    salaryMode: 'BANK',
    currentObligations: 20000,
    loanTenure: 5,
    wantsBT: true,
    isBTMode: true,
    loansForBT: [
      { id: '1', bank: 'SBI', type: 'Personal Loan', emi: 8000, outstandingAmount: 200000 },
      { id: '2', bank: 'ICICI CC', type: 'Credit Card', emi: 5000, outstandingAmount: 100000 }
    ]
  };

  const results = await calculateLoanEligibility(input);
  let failed = 0;
  
  // Piramal allows 1 PL + 1 CC (max 3 debts, max 2 CC, with PL)
  const piramal = results.find(r => r.bankName.includes('Piramal'));
  if (piramal && piramal.eligible && piramal.freshAmountDisbursed > 0) {
    console.log(`✅ [APPROVED PIRAMAL] ${piramal.bankName} approved mixed BT with 1 PL + 1 CC!`);
  } else {
    console.error(`❌ [FAILURE] Piramal should approve 1 PL + 1 CC! Result:`, piramal);
    failed++;
  }

  // CC prohibited banks must still reject
  const hdfc = results.find(r => r.bankName.includes('HDFC'));
  if (hdfc && !hdfc.eligible && hdfc.btNotAllowed) {
    console.log(`✅ [EXPECTED REJECT] HDFC Bank rejected mixed BT due to CC!`);
  } else {
    console.error(`❌ [FAILURE] HDFC Bank should reject mixed BT containing CC!`, hdfc);
    failed++;
  }

  return failed;
}

async function testScenario4_CC_POS_Cap() {
  console.log('\n============================================================');
  console.log('🧪 SCENARIO 4: CC POS CAP EXCEEDED (Salary ₹50k, CC POS ₹3.5L > 6x/4x)');
  console.log('============================================================');
  const input = {
    monthlyIncome: 50000,
    cibilScore: 780,
    companyName: 'TCS',
    companyType: 'Listed Public Ltd',
    salaryMode: 'BANK',
    currentObligations: 5000,
    loanTenure: 5,
    wantsBT: true,
    isBTMode: true,
    loansForBT: [
      { id: '1', bank: 'HDFC CC', type: 'Credit Card', emi: 17500, outstandingAmount: 350000 }
    ]
  };

  const results = await calculateLoanEligibility(input);
  let failed = 0;

  // Poonawalla cap is 4x salary (₹2,00,000)
  const poonawala = results.find(r => r.bankName.includes('Poonawala'));
  if (poonawala && !poonawala.eligible && poonawala.btNotAllowed) {
    console.log(`✅ [EXPECTED REJECT] Poonawalla: ${poonawala.reason.slice(0, 70)}`);
  } else {
    console.error(`❌ [FAILURE] Poonawalla should reject CC POS > 4x salary!`, poonawala);
    failed++;
  }

  // Chola cap is 6x salary (₹3,00,000)
  const chola = results.find(r => r.bankName.includes('Chola'));
  if (chola && !chola.eligible && chola.btNotAllowed) {
    console.log(`✅ [EXPECTED REJECT] Chola: ${chola.reason.slice(0, 70)}`);
  } else {
    console.error(`❌ [FAILURE] Chola should reject CC POS > 6x salary!`, chola);
    failed++;
  }

  // ABFL cap is 6x salary (₹3,00,000)
  const abfl = results.find(r => r.bankName.includes('Aditya'));
  if (abfl && !abfl.eligible && abfl.btNotAllowed) {
    console.log(`✅ [EXPECTED REJECT] ABFL: ${abfl.reason.slice(0, 70)}`);
  } else {
    console.error(`❌ [FAILURE] ABFL should reject CC POS > 6x salary!`, abfl);
    failed++;
  }

  return failed;
}

async function testScenario5_PL_BT_Count_Limits() {
  console.log('\n============================================================');
  console.log('🧪 SCENARIO 5: 4 PL BT LOANS (Tests Bank PL Count Limits: 3 vs 4 vs 5 vs 6+)');
  console.log('============================================================');
  const input = {
    monthlyIncome: 120000,
    cibilScore: 780,
    companyName: 'TCS',
    companyType: 'Listed Public Ltd',
    salaryMode: 'BANK',
    currentObligations: 20000,
    loanTenure: 5,
    wantsBT: true,
    isBTMode: true,
    loansForBT: [
      { id: '1', bank: 'SBI', type: 'Personal Loan', emi: 5000, outstandingAmount: 50000 },
      { id: '2', bank: 'HDFC', type: 'Personal Loan', emi: 5000, outstandingAmount: 50000 },
      { id: '3', bank: 'ICICI', type: 'Personal Loan', emi: 5000, outstandingAmount: 50000 },
      { id: '4', bank: 'Axis', type: 'Personal Loan', emi: 5000, outstandingAmount: 50000 }
    ]
  };

  const results = await calculateLoanEligibility(input);
  let failed = 0;

  // Banks with max 3 PL BT: HDFC, ICICI, Bandhan, AU Bank -> must REJECT
  const max3Banks = ['HDFC Bank', 'ICICI Bank', 'Bandhan Bank', 'AU Small Finance Bank'];
  max3Banks.forEach(bName => {
    const bank = results.find(r => r.bankName.toLowerCase().includes(bName.toLowerCase()));
    if (bank && !bank.eligible && bank.btNotAllowed) {
      console.log(`✅ [EXPECTED REJECT] ${bank.bankName.padEnd(25)} rejected 4 PL BT (Max allowed: 3)`);
    } else {
      console.error(`❌ [FAILURE] ${bName} should reject 4 PL BT!`, bank);
      failed++;
    }
  });

  // Banks with 4+ PL BT: Axis Bank (5), IndusInd (5), L&T (6), Tata (6), Axis Finance (7), Kotak (unlimited), SMFG (unlimited), Chola (4), Poonawalla (5), ABFL (4)
  const allowedBanks = ['Axis Bank', 'IndusInd Bank', 'L&T Finance', 'Tata Capital', 'Axis Finance', 'Kotak Mahindra Bank', 'Cholamandalam Finance', 'Poonawala Finance', 'Aditya Birla Finance'];
  allowedBanks.forEach(bName => {
    const bank = results.find(r => r.bankName.toLowerCase().includes(bName.toLowerCase()));
    if (bank && bank.eligible && bank.freshAmountDisbursed > 0) {
      console.log(`✅ [APPROVED 4 PL]   ${bank.bankName.padEnd(25)} approved 4 PL BT | Fresh: ₹${bank.freshAmountDisbursed}`);
    } else {
      console.error(`❌ [FAILURE] ${bName} should approve 4 PL BT!`, bank);
      failed++;
    }
  });

  return failed;
}

async function main() {
  const f1 = await testScenario1_PL_Only();
  const f2 = await testScenario2_CC_Only();
  const f3 = await testScenario3_Mixed_BT();
  const f4 = await testScenario4_CC_POS_Cap();
  const f5 = await testScenario5_PL_BT_Count_Limits();

  const totalFailed = f1 + f2 + f3 + f4 + f5;
  console.log('\n============================================================');
  if (totalFailed === 0) {
    console.log('🎉 ALL 5 SCENARIOS PASSED WITH 100% ACCURACY ACROSS ALL 17 BANKS! 🎉');
  } else {
    console.error(`⚠️ FAILED TESTS: ${totalFailed}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

