/**
 * Top-Up Loan Calculation Service
 * 
 * Logic:
 * In top-up, customer provides existing running loan details (bank, running outstanding/POS, monthly EMI).
 * Total Top-Up Amount = Maximum Eligible Bank Capacity (E) - Current Running Loan Balance (L).
 * Example: If customer is eligible for ₹20 Lakhs and currently ₹5 Lakhs is running, Top-Up is ₹15 Lakhs.
 * Only the bank results matching the user's running loan are displayed.
 */

import { calculateLoanEligibility } from './realLoanService.js';

export const PARTNER_TOPUP_BANKS = [
  { id: 'kotak', name: 'Kotak Mahindra Bank' },
  { id: 'tata', name: 'Tata Capital' },
  { id: 'hdfc', name: 'HDFC Bank' },
  { id: 'icici', name: 'ICICI Bank' },
  { id: 'idfc', name: 'IDFC First Bank' },
  { id: 'chola', name: 'Cholamandalam Finance' },
  { id: 'abfl', name: 'Aditya Birla Finance' },
  { id: 'axis-bank', name: 'Axis Bank' },
  { id: 'axis', name: 'Axis Finance' },
  { id: 'poonawala', name: 'Poonawala Finance' },
  { id: 'indusind', name: 'IndusInd Bank' },
  { id: 'piramal', name: 'Piramal Finance' },
  { id: 'lnt', name: 'L&T Finance' },
  { id: 'smfg', name: 'SMFG India Credit' },
  { id: 'incred', name: 'Incred Finance' },
  { id: 'au-bank', name: 'AU Small Finance Bank' },
  { id: 'bandhan', name: 'Bandhan Bank' },
  { id: 'other', name: 'Other Bank / NBFC' }
];

export const calculateTopUpEligibility = async (userData) => {
  console.log('⚡ === TOP-UP SERVICE: STARTING CALCULATION ===');
  console.log('📄 Input received:', userData);

  const selectedBankKey = String(userData.topUpBank || userData.existingLoanBank || '').trim().toLowerCase();
  const runningLoanOutstanding = parseFloat(userData.topUpRunningAmount || userData.runningLoanOutstanding || userData.existingRunningAmount || 0);
  const runningLoanEmi = parseFloat(userData.topUpRunningEMI || userData.runningLoanEmi || userData.existingRunningEMI || 0);

  // In top-up with the same bank, the running loan's EMI is being topped up/consolidated.
  // Other outside obligations (if any) remain in FOIR.
  const outsideLoans = (userData.existingLoans || []).filter(loan => {
    const lName = String(loan.lender || loan.bankName || '').toLowerCase();
    return !lName.includes(selectedBankKey) && !selectedBankKey.includes(lName);
  });
  const outsideLoansEMI = outsideLoans.reduce((sum, l) => sum + (parseFloat(l.monthlyEMI) || parseFloat(l.emi) || 0), 0);

  const calculatorUserData = {
    ...userData,
    existingEMI: outsideLoansEMI,
    hasExistingLoans: outsideLoans.length > 0,
    existingLoans: outsideLoans,
    wantsBT: false,
    isBTMode: false
  };

  // Run institutional calculation across banks
  const allResults = await calculateLoanEligibility(calculatorUserData);

  // Filter to the bank which the user specified
  const isTargetBank = (bank) => {
    if (selectedBankKey === 'other' || selectedBankKey === '') {
      return true; // Show top institutional partners offering parallel top-up if 'Other'
    }
    const bId = String(bank.bankId || bank.id || '').toLowerCase();
    const bName = String(bank.bankName || '').toLowerCase();

    return (
      bId === selectedBankKey ||
      bName.includes(selectedBankKey) ||
      selectedBankKey.includes(bId) ||
      selectedBankKey.includes(bName) ||
      (selectedBankKey.includes('kotak') && bName.includes('kotak')) ||
      (selectedBankKey.includes('tata') && bName.includes('tata')) ||
      (selectedBankKey.includes('hdfc') && bName.includes('hdfc')) ||
      (selectedBankKey.includes('icici') && bName.includes('icici')) ||
      (selectedBankKey.includes('idfc') && bName.includes('idfc')) ||
      (selectedBankKey.includes('chola') && bName.includes('chola')) ||
      (selectedBankKey.includes('abfl') && (bName.includes('aditya') || bName.includes('birla'))) ||
      (selectedBankKey.includes('axis') && bName.includes('axis')) ||
      (selectedBankKey.includes('poonawala') && bName.includes('poonawala')) ||
      (selectedBankKey.includes('indusind') && bName.includes('indusind')) ||
      (selectedBankKey.includes('piramal') && bName.includes('piramal')) ||
      (selectedBankKey.includes('lnt') && bName.includes('l&t')) ||
      (selectedBankKey.includes('smfg') && bName.includes('smfg')) ||
      (selectedBankKey.includes('incred') && bName.includes('incred')) ||
      (selectedBankKey.includes('au') && bName.includes('au ')) ||
      (selectedBankKey.includes('bandhan') && bName.includes('bandhan'))
    );
  };

  let matchingBanks = allResults.filter(isTargetBank);

  // Fallback: If 'other' was selected, show top 3 banks offering top-up lines
  if (matchingBanks.length === 0) {
    matchingBanks = allResults.slice(0, 3);
  }

  // Apply Top-Up deduction logic:
  // Top-Up Amount = Maximum Eligible Capacity (E) - Running Loan Outstanding (L)
  const topUpResults = matchingBanks.map(bank => {
    if (!bank.eligible) {
      return {
        ...bank,
        isTopUp: true,
        eligible: false,
        productType: 'Top-Up Loan',
        totalCapacity: 0,
        runningLoanOutstanding,
        topUpAmount: 0,
        reason: bank.reason || 'Not eligible under bank underwriting policy'
      };
    }

    const totalEligibleCapacity = Math.round(bank.loanAmount || bank.maxEligibleLoan || 0);
    const netTopUpAmount = Math.max(0, totalEligibleCapacity - runningLoanOutstanding);
    const isTopUpEligible = netTopUpAmount > 0;

    // Monthly EMI on net top-up amount
    const rate = bank.interestRate || 11.5;
    const tenureYears = bank.loanTenure || 5;
    const monthlyRate = rate / 12 / 100;
    const tenureMonths = tenureYears * 12;
    const topUpEmi = netTopUpAmount > 0 && monthlyRate > 0
      ? Math.round((netTopUpAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1))
      : 0;

    return {
      ...bank,
      isTopUp: true,
      productType: 'Top-Up Loan',
      eligible: isTopUpEligible,
      loanAmount: netTopUpAmount, // Disbursed Top-Up Cash in Hand
      topUpAmount: netTopUpAmount,
      totalCapacity: totalEligibleCapacity,
      runningLoanOutstanding: runningLoanOutstanding,
      runningLoanEmi: runningLoanEmi,
      monthlyEMI: topUpEmi,
      interestRate: rate,
      loanTenure: tenureYears,
      reason: isTopUpEligible
        ? null
        : `Current running loan (₹${runningLoanOutstanding.toLocaleString('en-IN')}) meets or exceeds maximum eligible ceiling (₹${totalEligibleCapacity.toLocaleString('en-IN')}) with ${bank.bankName}.`,
      topUpHighlights: [
        `₹${netTopUpAmount.toLocaleString('en-IN')} Instant Cash Disbursal`,
        `Existing ₹${runningLoanOutstanding.toLocaleString('en-IN')} Loan Retained / Integrated`,
        `Low Interest Rate starting @ ${rate}% p.a.`,
        'Minimal Documentation & Fast Track Approval'
      ]
    };
  });

  console.log(`✅ TOP-UP RESULT: ${topUpResults.length} bank(s) formatted.`);
  return topUpResults;
};
