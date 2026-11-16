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
 * Formats results cleanly as standard eligibility check cards (approved amount, EMI, min ROI, tenure).
 * Never in BT format.
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

  // Standard eligibility calculation (strict non-BT execution)
  const calcUserData = {
    ...userData,
    wantsBT: false,
    isBTMode: false,
    selectedLoansForBT: [],
    loansForBT: []
  };

  const allResults = await calculateLoanEligibility(calcUserData);

  // Extract strictly the 5 partner banks in specified order
  const odResults = [];

  for (const def of OD_ALLOWED_BANKS) {
    const bank = allResults.find(def.match);
    if (!bank) continue;

    const rate = bank.interestRate || 11.25;
    const limit = bank.eligible ? Math.round(bank.loanAmount || bank.maxEligibleLoan || 0) : 0;
    const dailyPerLakh = Math.round((100000 * (rate / 100)) / 365);
    const monthlyPerLakh = Math.round((100000 * (rate / 100)) / 12);

    odResults.push({
      ...bank,
      bankId: def.key,
      isOD: true,
      isBTMode: false,
      btNotAllowed: false,
      productType: 'Overdraft Limit',
      odLimit: limit,
      dailyInterestPerLakh: dailyPerLakh,
      monthlyInterestPerLakh: monthlyPerLakh
    });
  }

  console.log(`✅ OD LIMIT RESULT: Returned strictly ${odResults.length} of 5 banks.`);
  return odResults;
};
