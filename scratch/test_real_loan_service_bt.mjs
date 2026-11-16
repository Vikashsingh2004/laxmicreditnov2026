import { calculateLoanEligibility } from '../src/services/realLoanService.js';

async function run() {
  const testInput = {
    monthlyIncome: 85000,
    cibilScore: 780,
    companyName: 'TCS',
    companyType: 'Listed Public Ltd',
    salaryMode: 'BANK',
    currentObligations: 25000,
    loanTenure: 5,
    wantsBT: true,
    isBTMode: true,
    loansForBT: [
      { id: '1', bank: 'SBI', type: 'Personal Loan', emi: 12000, balance: 350000 },
      { id: '2', bank: 'HDFC', type: 'Personal Loan', emi: 8000, balance: 200000 }
    ]
  };

  const results = await calculateLoanEligibility(testInput);
  console.log('\n--- RESULTS SUMMARY (PL BT only: 2 PLs, total 550,000) ---');
  results.forEach(r => {
    console.log(`${r.bankName.padEnd(25)} | Eligible: ${String(r.eligible).padEnd(5)} | btNotAllowed: ${String(r.btNotAllowed || false).padEnd(5)} | Loan: ₹${String(r.loanAmount || 0).padEnd(10)} | Fresh: ₹${String(r.freshAmountDisbursed || 0).padEnd(10)} | Reason: ${(r.reason || '').slice(0, 50)}`);
  });
}

run().catch(console.error);
