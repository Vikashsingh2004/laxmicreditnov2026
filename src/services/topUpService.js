/**
 * Top-Up Loan Calculation Service
 * 
 * Logic:
 * In top-up, customer provides existing running loan details (bank, running outstanding/POS, monthly EMI).
 * Multiple running loans from dashboard banks can be evaluated.
 * Total Top-Up Amount = Maximum Eligible Bank Capacity (E) - Current Running Loan Balance (L).
 * Example: If customer is eligible for ₹20 Lakhs and currently ₹5 Lakhs is running, Top-Up is ₹15 Lakhs.
 * ONLY the bank results matching the user's running loan(s) are returned. Absolutely NO other banks.
 */

import { calculateLoanEligibility } from './realLoanService.js';

export const DASHBOARD_BANKS = [
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
  { id: 'bandhan', name: 'Bandhan Bank' }
];

export const calculateTopUpEligibility = async (userData) => {
  console.log('⚡ === TOP-UP SERVICE: STARTING CALCULATION ===');
  console.log('📄 Input received:', userData);

  // 1. Gather all running loans for top-up
  let loans = [];
  if (Array.isArray(userData.topUpLoans) && userData.topUpLoans.length > 0) {
    loans = userData.topUpLoans;
  } else if (userData.topUpBank || userData._metadata?.topUpBank) {
    loans = [{
      bank: userData.topUpBank || userData._metadata?.topUpBank,
      runningAmount: parseFloat(userData.topUpRunningAmount || userData._metadata?.topUpRunningAmount || 0),
      runningEMI: parseFloat(userData.topUpRunningEMI || userData._metadata?.topUpRunningEMI || 0),
      tenurePassed: userData.topUpTenurePassed || '6_to_12m'
    }];
  }

  // Filter out any entries where bank is empty
  const validLoans = loans.filter(l => l && String(l.bank || '').trim() !== '');

  if (validLoans.length === 0) {
    console.warn('⚠️ No valid top-up loans provided.');
    return [];
  }

  const topUpResults = [];

  // 2. Evaluate top-up for each bank the user specified
  for (const loan of validLoans) {
    const rawBankName = String(loan.bank || '').trim();
    const runningLoanOutstanding = parseFloat(loan.runningAmount || 0);
    const runningLoanEMI = parseFloat(loan.runningEMI || 0);

    // Other loans outside this specific bank count as external monthly EMI obligations
    const outsideLoans = validLoans.filter(l => l !== loan);
    const outsideLoansEMI = outsideLoans.reduce((sum, l) => sum + (parseFloat(l.runningEMI) || 0), 0);

    const calcUserData = {
      ...userData,
      hasExistingLoans: outsideLoansEMI > 0,
      existingEMI: outsideLoansEMI,
      existingLoans: outsideLoans.map((l, idx) => ({
        id: `outside_${idx}`,
        lender: l.bank,
        monthlyEMI: l.runningEMI,
        outstandingAmount: l.runningAmount
      })),
      hasCreditCards: false,
      creditCards: [],
      wantsBT: false,
      isBTMode: false
    };

    // Run the institutional bank calculation
    const allResults = await calculateLoanEligibility(calcUserData);

    // Match strictly to this bank
    const match = allResults.find(b => {
      const bId = String(b.bankId || b.id || '').toLowerCase();
      const bName = String(b.bankName || '').toLowerCase();
      const target = rawBankName.toLowerCase();

      return (
        bName === target ||
        bId === target ||
        bName.includes(target) ||
        target.includes(bName) ||
        (target.includes('kotak') && bName.includes('kotak')) ||
        (target.includes('tata') && bName.includes('tata')) ||
        (target.includes('hdfc') && bName.includes('hdfc')) ||
        (target.includes('icici') && bName.includes('icici')) ||
        (target.includes('idfc') && bName.includes('idfc')) ||
        (target.includes('chola') && bName.includes('chola')) ||
        (target.includes('aditya') && (bName.includes('aditya') || bName.includes('birla') || bName.includes('abfl'))) ||
        (target.includes('abfl') && (bName.includes('aditya') || bName.includes('birla') || bName.includes('abfl'))) ||
        (target.includes('axis') && !target.includes('finance') && bName === 'axis bank') ||
        (target.includes('axis finance') && bName.includes('finance')) ||
        (target.includes('poonawala') && bName.includes('poonawala')) ||
        (target.includes('indusind') && bName.includes('indusind')) ||
        (target.includes('piramal') && bName.includes('piramal')) ||
        (target.includes('l&t') && bName.includes('l&t')) ||
        (target.includes('smfg') && bName.includes('smfg')) ||
        (target.includes('incred') && bName.includes('incred')) ||
        (target.includes('au ') && bName.includes('au ')) ||
        (target.includes('bandhan') && bName.includes('bandhan'))
      );
    });

    if (!match) {
      console.warn(`Bank "${rawBankName}" not found in calculation engine.`);
      continue;
    }

    if (!match.eligible) {
      topUpResults.push({
        ...match,
        isTopUp: true,
        productType: 'Top-Up Loan',
        eligible: false,
        totalCapacity: 0,
        runningLoanOutstanding,
        runningLoanEMI,
        loanAmount: 0,
        reason: match.reason || 'Underwriting criteria mismatch for top-up'
      });
      continue;
    }

    // Top-Up Amount = Bank Capacity (E) - Running Loan Balance (L)
    const totalEligibleCapacity = Math.round(match.loanAmount || match.maxEligibleLoan || 0);
    const netTopUpAmount = Math.max(0, totalEligibleCapacity - runningLoanOutstanding);
    const isTopUpEligible = netTopUpAmount > 0;

    const rate = match.interestRate || 10.75;
    const tenureYears = match.loanTenure || 5;
    const tenureMonths = tenureYears * 12;
    const monthlyRate = rate / 12 / 100;
    const topUpEMI = isTopUpEligible && monthlyRate > 0
      ? Math.round((netTopUpAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1))
      : 0;

    topUpResults.push({
      ...match,
      isTopUp: true,
      eligible: isTopUpEligible,
      productType: 'Top-Up Loan',
      totalCapacity: totalEligibleCapacity,
      runningLoanOutstanding,
      runningLoanEMI,
      loanAmount: netTopUpAmount,
      monthlyEMI: topUpEMI,
      interestRate: rate,
      loanTenure: tenureYears,
      reason: isTopUpEligible
        ? null
        : `Current running loan balance (₹${runningLoanOutstanding.toLocaleString('en-IN')}) equals or exceeds your total bank capacity ceiling (₹${totalEligibleCapacity.toLocaleString('en-IN')}) with ${match.bankName}.`
    });
  }

  console.log(`✅ TOP-UP RESULT: Returned strictly ${topUpResults.length} bank(s) matching user loans.`);
  return topUpResults;
};
