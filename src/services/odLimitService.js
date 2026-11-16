/**
 * Overdraft (OD) Limit Calculation Service
 * 
 * Logic:
 * Standard eligibility calculation engine, filtered strictly to 5 institutional partners:
 * 1. Tata Capital ('tata')
 * 2. Aditya Birla Finance / ABFL ('abfl')
 * 3. Kotak Mahindra Bank ('kotak')
 * 4. Cholamandalam Finance ('chola')
 * 5. IDFC FIRST Bank ('idfc')
 * 
 * BT Logic in OD:
 * When a user opts for Balance Transfer (Takeover) into an Overdraft facility:
 * - Selected running loans / credit card balances are cleared by the OD bank.
 * - The existing loan POS (Principal Outstanding) is deducted from the sanctioned OD limit.
 * - Remaining limit = Sanctioned Limit - Existing POS Cleared (available as 24x7 flexible credit line).
 * - Interest on used limit starts immediately on the utilized POS drawn to clear the debt:
 *     Monthly Interest = (utilizedODLimit * ROI) / 12
 *     Daily Interest   = (utilizedODLimit * ROI) / 365
 * - The customer's previous heavy monthly loan EMI is eliminated, resulting in massive monthly cash flow savings!
 * - Unused limit has ₹0 charges until drawn.
 */

import { calculateLoanEligibility } from './realLoanService.js';

export const OD_ALLOWED_BANKS = [
  { key: 'tata', name: 'Tata Capital', match: (b) => (b.bankId === 'tata' || (b.bankName || '').toLowerCase().includes('tata')) },
  { key: 'abfl', name: 'Aditya Birla Finance', match: (b) => (b.bankId === 'abfl' || (b.bankName || '').toLowerCase().includes('aditya') || (b.bankName || '').toLowerCase().includes('abfl')) },
  { key: 'kotak', name: 'Kotak Mahindra Bank', match: (b) => (b.bankId === 'kotak' || (b.bankName || '').toLowerCase().includes('kotak')) },
  { key: 'chola', name: 'Cholamandalam Finance', match: (b) => (b.bankId === 'chola' || (b.bankName || '').toLowerCase().includes('chola') || (b.bankName || '').toLowerCase().includes('cholamandalam')) },
  { key: 'idfc', name: 'IDFC First Bank', match: (b) => (b.bankId === 'idfc' || (b.bankName || '').toLowerCase().includes('idfc')) }
];

export const calculateODLimitEligibility = async (userData) => {
  console.log('💳 === OD LIMIT SERVICE: STARTING CALCULATION ===');
  console.log('📄 Input received:', userData);

  // Extract selected BT loans / cards if any
  const btLoansList = (userData.loansForBT && userData.loansForBT.length > 0)
    ? userData.loansForBT
    : (userData.selectedLoansForBT && userData.selectedLoansForBT.length > 0)
      ? userData.selectedLoansForBT
      : [];

  const isODBT = Boolean(userData.wantsBT && btLoansList.length > 0);

  let btTotalOutstanding = 0;
  let btTotalEMI = 0;

  if (isODBT) {
    btTotalOutstanding = btLoansList.reduce((sum, loan) => {
      const pos = parseFloat(loan.outstandingAmount || loan.pos || loan.creditLimitUsed || loan.balance || loan.amount || 0);
      return sum + pos;
    }, 0);
    btTotalEMI = btLoansList.reduce((sum, loan) => {
      const emi = parseFloat(loan.monthlyEMI || loan.emi || loan.monthlyPayment || 0);
      return sum + emi;
    }, 0);

    console.log(`💳 OD BT MODE ACTIVATED: ${btLoansList.length} liabilities selected.`);
    console.log(`  - Total POS to clear: ₹${btTotalOutstanding.toLocaleString('en-IN')}`);
    console.log(`  - Total Old EMI to replace: ₹${btTotalEMI.toLocaleString('en-IN')}/mo`);
  }

  // Underwriting calculation:
  // When isODBT is true, selected loans are excluded from external EMI obligations
  const calcUserData = {
    ...userData,
    wantsBT: isODBT,
    isBTMode: isODBT,
    selectedLoansForBT: isODBT ? btLoansList : [],
    loansForBT: isODBT ? btLoansList : [],
    btTotalOutstanding: isODBT ? btTotalOutstanding : 0,
    btTotalEMI: isODBT ? btTotalEMI : 0
  };

  const allResults = await calculateLoanEligibility(calcUserData);

  // Extract strictly the 5 partner banks in specified order
  const odResults = [];

  for (const def of OD_ALLOWED_BANKS) {
    const bank = allResults.find(def.match);
    if (!bank) continue;

    const rate = bank.interestRate || 10.75;
    const totalSanctionedLimit = bank.eligible ? Math.round(bank.loanAmount || bank.maxEligibleLoan || 0) : 0;
    const dailyPerLakh = Math.round((100000 * (rate / 100)) / 365);
    const monthlyPerLakh = Math.round((100000 * (rate / 100)) / 12);

    let eligible = bank.eligible;
    let reason = bank.reason;
    let utilizedODLimit = 0;
    let availableODLimit = totalSanctionedLimit;
    let monthlyInterestOnUsed = 0;
    let dailyInterestOnUsed = 0;
    let monthlyCashflowSavings = 0;

    if (isODBT) {
      if (!bank.eligible) {
        eligible = false;
        reason = bank.reason || 'Underwriting criteria mismatch for OD limit.';
      } else if (totalSanctionedLimit < btTotalOutstanding) {
        eligible = false;
        reason = `Sanctioned OD limit (₹${(totalSanctionedLimit / 100000).toFixed(2)}L) is less than existing loan POS to clear (₹${(btTotalOutstanding / 100000).toFixed(2)}L).`;
      } else {
        utilizedODLimit = btTotalOutstanding;
        availableODLimit = Math.max(0, totalSanctionedLimit - utilizedODLimit);

        // Interest charged strictly on the utilized POS drawn to clear old loan
        monthlyInterestOnUsed = Math.round((utilizedODLimit * (rate / 100)) / 12);
        dailyInterestOnUsed = Math.round((utilizedODLimit * (rate / 100)) / 365);

        // Old loan EMI is cleared, replaced with monthly OD interest on used POS
        monthlyCashflowSavings = Math.max(0, btTotalEMI - monthlyInterestOnUsed);
      }
    }

    odResults.push({
      ...bank,
      eligible,
      reason,
      bankId: def.key,
      isOD: true,
      isODBT: isODBT,
      isBTMode: false, // keep separate from term loan BT blueprint
      btNotAllowed: !eligible,
      productType: isODBT ? 'Overdraft with Balance Transfer' : 'Overdraft Limit',
      loanAmount: isODBT ? availableODLimit : totalSanctionedLimit,
      odLimit: totalSanctionedLimit,
      totalSanctionedLimit: totalSanctionedLimit,
      debtClearedPOS: isODBT ? btTotalOutstanding : 0,
      totalDebtCleared: isODBT ? btTotalOutstanding : 0,
      utilizedODLimit: isODBT ? utilizedODLimit : 0,
      availableODLimit: isODBT ? availableODLimit : totalSanctionedLimit,
      monthlyInterestOnUsed: isODBT ? monthlyInterestOnUsed : 0,
      dailyInterestOnUsed: isODBT ? dailyInterestOnUsed : 0,
      monthlyEMI: isODBT ? monthlyInterestOnUsed : 0, // In OD BT, monthly obligation is the interest on used POS
      oldLoanEMI: isODBT ? btTotalEMI : 0,
      monthlyCashflowSavings: isODBT ? monthlyCashflowSavings : 0,
      dailyInterestPerLakh: dailyPerLakh,
      monthlyInterestPerLakh: monthlyPerLakh,
      loansTransferredCount: isODBT ? btLoansList.length : 0
    });
  }

  console.log(`✅ OD LIMIT RESULT: Returned strictly ${odResults.length} of 5 banks (isODBT: ${isODBT}).`);
  return odResults;
};
