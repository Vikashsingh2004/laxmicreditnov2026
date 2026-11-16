/**
 * Overdraft (OD) Limit Calculation Service
 * 
 * Logic:
 * Same calculation logic as loan eligibility, but filters strictly to 5 institutional partners:
 * 1. Tata Capital ('tata')
 * 2. Aditya Birla Finance / ABFL ('abfl')
 * 3. Kotak Mahindra Bank ('kotak')
 * 4. Cholamandalam Finance ('chola')
 * 5. IDFC FIRST Bank ('idfc')
 * 
 * Formats results as Overdraft Facility (interest charged only on utilized balance, zero EMI on unused limit).
 */

import { calculateLoanEligibility } from './realLoanService.js';

export const OD_ALLOWED_BANKS = [
  { key: 'tata', name: 'Tata Capital' },
  { key: 'abfl', name: 'Aditya Birla Finance' },
  { key: 'kotak', name: 'Kotak Mahindra Bank' },
  { key: 'chola', name: 'Cholamandalam Finance' },
  { key: 'idfc', name: 'IDFC First Bank' }
];

export const calculateODLimitEligibility = async (userData) => {
  console.log('💳 === OD LIMIT SERVICE: STARTING CALCULATION ===');
  console.log('📄 Input received:', userData);

  // Run calculation across the real banking engine
  const allResults = await calculateLoanEligibility({
    ...userData,
    wantsBT: false,
    isBTMode: false
  });

  const isOdBank = (bank) => {
    const bId = String(bank.bankId || bank.id || '').toLowerCase();
    const bName = String(bank.bankName || '').toLowerCase();

    return (
      bId === 'tata' || bName.includes('tata') ||
      bId === 'abfl' || bName.includes('aditya birla') || bName.includes('abfl') ||
      bId === 'kotak' || bName.includes('kotak') ||
      bId === 'chola' || bName.includes('chola') || bName.includes('cholamandalam') ||
      bId === 'idfc' || bName.includes('idfc')
    );
  };

  const odRawResults = allResults.filter(isOdBank);

  // Map to Overdraft-specific details
  const odResults = odRawResults.map(bank => {
    const rate = bank.interestRate || 11.25;
    const limit = bank.eligible ? Math.round(bank.loanAmount || bank.maxEligibleLoan || 0) : 0;

    // Daily & Monthly interest per ₹1,00,000 withdrawn
    const dailyPerLakh = Math.round((100000 * (rate / 100)) / 365);
    const monthlyPerLakh = Math.round((100000 * (rate / 100)) / 12);

    return {
      ...bank,
      isOD: true,
      productType: 'Overdraft Limit',
      odLimit: limit,
      dailyInterestPerLakh: dailyPerLakh,
      monthlyInterestPerLakh: monthlyPerLakh,
      odTerms: {
        interestType: 'Simple Interest on Daily Outstanding',
        billingCycle: 'Monthly Interest Debit',
        drawdownSpeed: 'Instant via Mobile / Net Banking',
        foreclosurePenalty: '0% (Nil Prepayment Charges)'
      },
      facilityFeatures: [
        'Pay interest ONLY on the amount you withdraw',
        'Zero interest on unused credit limit',
        'Instant multi-tranche withdrawals anytime',
        'Repay principal anytime with zero foreclosure charges'
      ]
    };
  });

  console.log(`✅ OD LIMIT RESULT: ${odResults.length} bank(s) formatted.`);
  return odResults;
};
