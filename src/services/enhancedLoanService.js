// Import all bank calculators
import { calculateKotakEligibility } from '../banks/kotak/calculator.js';
import { calculateHdfcEligibility } from '../banks/hdfc/calculator.js';
import { calculateIciciEligibility } from '../banks/icici/calculator.js';
import { calculateBandhanEligibility } from '../banks/bandhan/calculator.js';
import { calculateCholaEligibility } from '../banks/chola/calculator.js';
import { calculateTataEligibility } from '../banks/tata/calculator.js';
import { calculatePoonawalaEligibility } from '../banks/poonawala/calculator.js';
import { calculateAxisFinEligibility } from '../banks/axis-fin/calculator.js';
import { calculateIndusindEligibility } from '../banks/indusind/calculator.js';
import { calculateIdfcEligibility } from '../banks/idfc/calculator.js';
import { calculateShriRamEligibility } from '../banks/shri-ram/calculator.js';
import { calculatePiramalEligibility } from '../banks/piramal/calculator.js';
import { calculateAxisBankEligibility } from '../banks/axis-bank/calculator.js';

// Import bank configuration service for logic bridge
import { getBankConfig, getAllBankConfig } from './bankConfigService.js';
import { calculateUnifiedBankEligibility } from './realLoanService.js';

/**
 * Calculate EMI for a given loan amount, interest rate, and tenure
 * @param {number} principal - Loan amount
 * @param {number} annualInterestRate - Annual interest rate (percentage)
 * @param {number} tenureInYears - Loan tenure in years
 * @returns {number} Monthly EMI
 */
const calculateEMI = (principal, annualInterestRate, tenureInYears) => {
  const monthlyInterestRate = annualInterestRate / 12 / 100;
  const numberOfMonths = tenureInYears * 12;

  if (monthlyInterestRate === 0) {
    return principal / numberOfMonths;
  }

  const emi = principal * monthlyInterestRate *
    Math.pow(1 + monthlyInterestRate, numberOfMonths) /
    (Math.pow(1 + monthlyInterestRate, numberOfMonths) - 1);

  return Math.round(emi);
};

// Global bank list for internal mapping (20 Lending Institutions)
const allBanks = [
  // 12 Core Banks
  { id: 'kotak', name: 'Kotak Mahindra Bank', calculator: calculateKotakEligibility },
  { id: 'hdfc', name: 'HDFC Bank', calculator: calculateHdfcEligibility },
  { id: 'icici', name: 'ICICI Bank', calculator: calculateIciciEligibility },
  { id: 'bandhan', name: 'Bandhan Bank', calculator: calculateBandhanEligibility },
  { id: 'chola', name: 'Cholamandalam Finance', calculator: calculateCholaEligibility },
  { id: 'tata', name: 'Tata Capital', calculator: calculateTataEligibility },
  { id: 'poonawala', name: 'Poonawala Finance', calculator: calculatePoonawalaEligibility },
  { id: 'axisfin', name: 'Axis Finance', calculator: calculateAxisFinEligibility },
  { id: 'indusind', name: 'IndusInd Bank', calculator: calculateIndusindEligibility },
  { id: 'idfc', name: 'IDFC First Bank', calculator: calculateIdfcEligibility },
  { id: 'piramal', name: 'Piramal Finance', calculator: calculatePiramalEligibility },

  // Additional Banks & NBFCs from Master Excel Policy
  { id: 'axis-bank', name: 'Axis Bank', calculator: calculateAxisBankEligibility },
  { id: 'lnt', name: 'L&T Finance', calculator: calculateUnifiedBankEligibility },
  { id: 'smfg', name: 'SMFG India Credit', calculator: calculateUnifiedBankEligibility },
  { id: 'incred', name: 'Incred Finance', calculator: calculateUnifiedBankEligibility },
  { id: 'au-bank', name: 'AU Small Finance Bank', calculator: calculateUnifiedBankEligibility },
  { id: 'abfl', name: 'Aditya Birla Finance', calculator: calculateUnifiedBankEligibility }
];

/**
 * Calculate Fresh Loan Eligibility (without BT)
 */
export const calculateFreshLoan = async (customerInfo) => {
  const { state, city } = customerInfo;
  
  const calculatorInput = {
    desiredLoanAmount: customerInfo.desiredLoanAmount ? parseFloat(customerInfo.desiredLoanAmount) : null,
    loanTenure: customerInfo.loanTenure ? parseInt(customerInfo.loanTenure) : 5,
    monthlyIncome: customerInfo.monthlyIncome ? parseFloat(customerInfo.monthlyIncome) : 0,
    existingEMI: customerInfo.existingEMI || 0,
    companyName: customerInfo.companyName || '',
    category: customerInfo.category || 'A',
    creditScore: 850, // CIBIL bypassed
    employmentType: customerInfo.employmentType || 'salaried',
    state: state || '',
    city: city || ''
  };

  const results = allBanks.map(({ name, calculator }) => {
    try {
      const adminAllConfig = getAllBankConfig(name, { state, city });
      const config = adminAllConfig.bankConfig;
      const result = calculator(calculatorInput, config); // Pass merged config to calculator
      return {
        ...result,
        loanCappedByBank: result.loanCappedByBank,
        calculatedLoanBeforeCap: result.calculatedLoanBeforeCap,
        bachelorCapped: result.bachelorCapped,
        regularMaxLoan: result.regularMaxLoan,
        bachelorMaxLoanAmount: result.bachelorMaxLoanAmount,
        adminApplied: true
      };
    } catch (error) {
      console.error(`Error calculating fresh loan for ${name}:`, error);
      return { bankName: name, eligible: false, reason: 'System calculation error' };
    }
  });

  return results;
};

/**
 * Calculate Full Balance Transfer (all existing loans)
 */
export const calculateFullBT = async (customerInfo, existingLiabilities) => {
  const { state, city } = customerInfo;
  
  // Separate loans and credit cards
  const activeLiabilities = existingLiabilities.filter(l => 
    l.outstandingAmount && parseFloat(l.outstandingAmount) > 0
  );

  if (activeLiabilities.length === 0) return await calculateFreshLoan(customerInfo);

  const totalPOS = activeLiabilities.reduce((sum, l) => sum + parseFloat(l.outstandingAmount), 0);
  const totalExistingEMI = activeLiabilities.reduce((sum, l) => sum + (parseFloat(l.monthlyPayment) || 0), 0);

  // In Full BT, all provided liabilities are considered for transfer
  const btInput = {
    ...customerInfo,
    desiredLoanAmount: null,
    existingEMI: customerInfo.existingEMI !== undefined ? customerInfo.existingEMI : totalExistingEMI, 
    creditCardObligation: customerInfo.creditCardObligation !== undefined ? customerInfo.creditCardObligation : 0, 
    totalPOS: totalPOS,
    isBTMode: true,
    loansForBT: activeLiabilities,
    btTotalEMI: totalExistingEMI,
    btTotalOutstanding: totalPOS
  };

  const results = allBanks.map(({ id, name, calculator }) => {
    try {
      const adminAllConfig = getAllBankConfig(name, { state, city });
      const btConfig = adminAllConfig.btConfiguration || {};
      const config = adminAllConfig.bankConfig || {};

      // Check if EXPLICITLY disabled in Admin or InCred (Fresh Only)
      if (btConfig.enabled === false || id === 'incred' || name.toLowerCase().includes('incred')) {
        return { 
          bankName: name, 
          eligible: false, 
          isBTMode: true,
          btNotAllowed: true,
          reason: `${name} policy: Fresh Funding only (Balance Transfer is Not Allowed).` 
        };
      }

      const ccBt = activeLiabilities.filter(l => l.type === 'Credit Card' || l.type === 'credit_card');
      const plBt = activeLiabilities.filter(l => l.type !== 'Credit Card' && l.type !== 'credit_card' && !String(l.type || '').toLowerCase().includes('app'));
      const appBt = activeLiabilities.filter(l => String(l.type || '').toLowerCase().includes('app'));
      const numCcBt = ccBt.length;
      const numPlBt = plBt.length;
      const numAppBt = appBt.length;
      const totalBt = activeLiabilities.length;

      // 1. Credit Card BT Strictly Prohibited Banks (IndusInd, HDFC, ICICI, Kotak, Bandhan, L&T, AU Bank)
      const isCcProhibited = ['indusind', 'hdfc', 'icici', 'kotak', 'bandhan', 'lnt', 'au-bank'].includes(id) ||
        name === 'IndusInd Bank' || name === 'HDFC Bank' || name === 'ICICI Bank' || 
        name.toLowerCase().includes('kotak') || name.toLowerCase().includes('bandhan') || 
        name.toLowerCase().includes('l&t') || name.toLowerCase().includes('au ') || btConfig.allowCcBt === false;

      if (numCcBt > 0 && isCcProhibited) {
        return {
          bankName: name,
          eligible: false,
          isBTMode: true,
          btNotAllowed: true,
          reason: `Credit Card Balance Transfer is Not Allowed for ${name} (Only Personal Loan BT Allowed as per policy).`
        };
      }

      // 2. PL BT Limits
      const maxPl = btConfig.maxPlBtCount ?? (id === 'kotak' || id === 'smfg' ? 999 : (id === 'axisfin' ? 7 : (id === 'tata' || id === 'lnt' ? 6 : (id === 'axis-bank' || id === 'indusind' || id === 'poonawala' ? 5 : (id === 'chola' || id === 'abfl' ? 4 : 3)))));
      if (numPlBt > maxPl) {
        return {
          bankName: name,
          eligible: false,
          isBTMode: true,
          btNotAllowed: true,
          reason: `${name} allows maximum ${maxPl} Personal Loan(s) for Balance Transfer (${numPlBt} selected).`
        };
      }

      // 3. CC BT Limits
      const maxCc = btConfig.maxCcBtCount ?? (id === 'axisfin' ? 7 : (id === 'tata' || id === 'chola' || id === 'poonawala' ? 6 : (id === 'axis-bank' || id === 'abfl' ? 5 : (id === 'idfc' ? 3 : (id === 'piramal' || id === 'smfg' ? 2 : 0)))));
      if (numCcBt > maxCc) {
        return {
          bankName: name,
          eligible: false,
          isBTMode: true,
          btNotAllowed: true,
          reason: `${name} allows maximum ${maxCc} Credit Card(s) for Balance Transfer (${numCcBt} selected).`
        };
      }

      // 4. Total Combined BT Case Cap
      const maxTotal = btConfig.totalBtCaseCap ?? (id === 'kotak' || id === 'smfg' ? 999 : (id === 'poonawala' ? 8 : (id === 'axisfin' ? 7 : (id === 'tata' || id === 'chola' || id === 'idfc' || id === 'abfl' || id === 'lnt' ? 6 : (id === 'axis-bank' || id === 'indusind' ? 5 : 3)))));
      if (totalBt > maxTotal) {
        return {
          bankName: name,
          eligible: false,
          isBTMode: true,
          btNotAllowed: true,
          reason: `${name} allows maximum ${maxTotal} total liabilities for Balance Transfer (${totalBt} selected).`
        };
      }

      // 5. Piramal Standalone CC BT Prohibited
      if ((id === 'piramal' || name.toLowerCase().includes('piramal')) && numCcBt > 0 && numPlBt === 0) {
        return {
          bankName: name,
          eligible: false,
          isBTMode: true,
          btNotAllowed: true,
          reason: 'Piramal Finance allows Credit Card BT only WITH at least 1 Personal Loan BT (Standalone CC BT is Not Allowed as per policy).'
        };
      }

      // 6. Credit Card POS Limits (Poonawalla <= 4x, Chola <= 6x, ABFL <= 6x)
      const ccPos = ccBt.reduce((sum, l) => sum + (parseFloat(l.outstandingAmount) || 0), 0);
      const mIncome = parseFloat(customerInfo.monthlyIncome || 0);
      if (mIncome > 0) {
        if ((id === 'poonawala' || name.toLowerCase().includes('poonawala')) && ccPos > (mIncome * 4)) {
          return {
            bankName: name,
            eligible: false,
            isBTMode: true,
            btNotAllowed: true,
            reason: `Poonawalla policy restricts Credit Card Outstanding exceeding 4x monthly income.`
          };
        }
        if ((id === 'chola' || name.toLowerCase().includes('chola')) && ccPos > (mIncome * 6)) {
          return {
            bankName: name,
            eligible: false,
            isBTMode: true,
            btNotAllowed: true,
            reason: `Chola Finance policy restricts Credit Card Outstanding exceeding 6x monthly income.`
          };
        }
        if ((id === 'abfl' || name.toLowerCase().includes('abfl')) && ccPos > (mIncome * 6)) {
          return {
            bankName: name,
            eligible: false,
            isBTMode: true,
            btNotAllowed: true,
            reason: `Aditya Birla Finance restricts Credit Card Outstanding exceeding 6x monthly income.`
          };
        }
      }

      const result = calculator(btInput, adminAllConfig.bankConfig);
      
      if (!result.eligible) return { bankName: name, ...result };

      const maxLoan = result.loanAmount || result.maxLoanAmount;
      const freshAmount = maxLoan - totalPOS;

      if (freshAmount <= 0) {
        return { bankName: name, eligible: false, reason: `Outstanding POS (₹${totalPOS.toLocaleString()}) exceeds max limit.` };
      }

      return {
        ...result,
        bankName: name,
        eligible: true,
        isBTMode: true,
        btType: 'BT_WITH_PERSONAL_LOANS',
        calculationMethod: 'BT Calculation',
        loanAmount: maxLoan,
        totalDebtCleared: totalPOS,
        freshAmountDisbursed: freshAmount,
        totalExistingEMI: totalExistingEMI,
        loanCappedByBank: result.loanCappedByBank,
        calculatedLoanBeforeCap: result.calculatedLoanBeforeCap,
        bachelorCapped: result.bachelorCapped,
        regularMaxLoan: result.regularMaxLoan,
        bachelorMaxLoanAmount: result.bachelorMaxLoanAmount,
        adminApplied: true
      };
    } catch (err) {
      return { bankName: name, eligible: false, reason: 'BT logic error' };
    }
  });

  return results;
};

/**
 * Calculate Partial Balance Transfer
 */
export const calculatePartialBT = async (customerInfo, existingLiabilities, selectedLiabilityIds) => {
  const { state, city } = customerInfo;
  
  const selectedLiabilities = existingLiabilities.filter(l => selectedLiabilityIds.includes(l.id));
  const nonSelectedLiabilities = existingLiabilities.filter(l => !selectedLiabilityIds.includes(l.id));

  const selectedPOS = selectedLiabilities.reduce((sum, l) => sum + (parseFloat(l.outstandingAmount) || 0), 0);
  const selectedEMI = selectedLiabilities.reduce((sum, l) => sum + (parseFloat(l.monthlyPayment) || 0), 0);
  
  const nonSelectedEMI = nonSelectedLiabilities.filter(l => l.type !== 'Credit Card').reduce((sum, l) => sum + (parseFloat(l.monthlyPayment) || 0), 0);
  const nonSelectedCCOutstanding = nonSelectedLiabilities.filter(l => l.type === 'Credit Card').reduce((sum, l) => sum + (parseFloat(l.outstandingAmount) || 0), 0);
  const ccObligation = Math.round(nonSelectedCCOutstanding * 0.05); // 5% of non-BT credit card balance

  const btInput = {
    ...customerInfo,
    desiredLoanAmount: null,
    existingEMI: selectedEMI + nonSelectedEMI,
    creditCardObligation: ccObligation,
    totalPOS: selectedPOS,
    isBTMode: true,
    loansForBT: selectedLiabilities,
    btTotalEMI: selectedEMI,
    btTotalOutstanding: selectedPOS
  };

  const results = allBanks.map(({ id, name, calculator }) => {
    try {
      const adminAllConfig = getAllBankConfig(name, { state, city });
      const btConfig = adminAllConfig.btConfiguration || {};
      const config = adminAllConfig.bankConfig || {};

      if (btConfig.enabled === false || id === 'incred' || name.toLowerCase().includes('incred')) {
        return { 
          bankName: name, 
          eligible: false, 
          isBTMode: true,
          btNotAllowed: true,
          reason: `${name} policy: Fresh Funding only (Balance Transfer is Not Allowed).` 
        };
      }

      const ccBt = selectedLiabilities.filter(l => l.type === 'Credit Card' || l.type === 'credit_card');
      const plBt = selectedLiabilities.filter(l => l.type !== 'Credit Card' && l.type !== 'credit_card' && !String(l.type || '').toLowerCase().includes('app'));
      const numCcBt = ccBt.length;
      const numPlBt = plBt.length;
      const totalBt = selectedLiabilities.length;

      // 1. CC BT Prohibited Banks
      const isCcProhibited = ['indusind', 'hdfc', 'icici', 'kotak', 'bandhan', 'lnt', 'au-bank'].includes(id) ||
        name === 'IndusInd Bank' || name === 'HDFC Bank' || name === 'ICICI Bank' || 
        name.toLowerCase().includes('kotak') || name.toLowerCase().includes('bandhan') || 
        name.toLowerCase().includes('l&t') || name.toLowerCase().includes('au ') || btConfig.allowCcBt === false;

      if (numCcBt > 0 && isCcProhibited) {
        return {
          bankName: name,
          eligible: false,
          isBTMode: true,
          btNotAllowed: true,
          reason: `Credit Card Balance Transfer is Not Allowed for ${name} (Only Personal Loan BT Allowed as per policy).`
        };
      }

      // 2. PL BT Limits
      const maxPl = btConfig.maxPlBtCount ?? (id === 'kotak' || id === 'smfg' ? 999 : (id === 'axisfin' ? 7 : (id === 'tata' || id === 'lnt' ? 6 : (id === 'axis-bank' || id === 'indusind' || id === 'poonawala' ? 5 : (id === 'chola' || id === 'abfl' ? 4 : 3)))));
      if (numPlBt > maxPl) {
        return {
          bankName: name,
          eligible: false,
          isBTMode: true,
          btNotAllowed: true,
          reason: `${name} allows maximum ${maxPl} Personal Loan(s) for Balance Transfer (${numPlBt} selected).`
        };
      }

      // 3. CC BT Limits
      const maxCc = btConfig.maxCcBtCount ?? (id === 'axisfin' ? 7 : (id === 'tata' || id === 'chola' || id === 'poonawala' ? 6 : (id === 'axis-bank' || id === 'abfl' ? 5 : (id === 'idfc' ? 3 : (id === 'piramal' || id === 'smfg' ? 2 : 0)))));
      if (numCcBt > maxCc) {
        return {
          bankName: name,
          eligible: false,
          isBTMode: true,
          btNotAllowed: true,
          reason: `${name} allows maximum ${maxCc} Credit Card(s) for Balance Transfer (${numCcBt} selected).`
        };
      }

      // 4. Total Combined BT Case Cap
      const maxTotal = btConfig.totalBtCaseCap ?? (id === 'kotak' || id === 'smfg' ? 999 : (id === 'poonawala' ? 8 : (id === 'axisfin' ? 7 : (id === 'tata' || id === 'chola' || id === 'idfc' || id === 'abfl' || id === 'lnt' ? 6 : (id === 'axis-bank' || id === 'indusind' ? 5 : 3)))));
      if (totalBt > maxTotal) {
        return {
          bankName: name,
          eligible: false,
          isBTMode: true,
          btNotAllowed: true,
          reason: `${name} allows maximum ${maxTotal} total liabilities for Balance Transfer (${totalBt} selected).`
        };
      }

      // 5. Piramal Standalone CC BT Prohibited
      if ((id === 'piramal' || name.toLowerCase().includes('piramal')) && numCcBt > 0 && numPlBt === 0) {
        return {
          bankName: name,
          eligible: false,
          isBTMode: true,
          btNotAllowed: true,
          reason: 'Piramal Finance allows Credit Card BT only WITH at least 1 Personal Loan BT (Standalone CC BT is Not Allowed as per policy).'
        };
      }

      if (btConfig.enabled === undefined && config.btConfig && !config.btConfig.isAvailable) {
        return { bankName: name, eligible: false, reason: `${name} does not offer BT facility.` };
      }

      const result = calculator(btInput, adminAllConfig.bankConfig);
      if (!result.eligible) return { bankName: name, ...result };

      const maxLoan = result.loanAmount || result.maxLoanAmount;
      const freshAmount = maxLoan - selectedPOS;

      if (freshAmount <= 0) {
        return { bankName: name, eligible: false, reason: `Selected POS exceeds max limit.` };
      }

      return {
        ...result,
        bankName: name,
        eligible: true,
        isBTMode: true,
        btType: 'PARTIAL_BT',
        calculationMethod: 'BT Calculation (Partial)',
        loanAmount: maxLoan,
        totalDebtCleared: selectedPOS,
        freshAmountDisbursed: freshAmount,
        selectedPOS: selectedPOS,
        nonSelectedEMI: nonSelectedEMI,
        ccObligation: ccObligation,
        loanCappedByBank: result.loanCappedByBank,
        calculatedLoanBeforeCap: result.calculatedLoanBeforeCap,
        bachelorCapped: result.bachelorCapped,
        regularMaxLoan: result.regularMaxLoan,
        bachelorMaxLoanAmount: result.bachelorMaxLoanAmount,
        adminApplied: true
      };
    } catch (err) {
      return { bankName: name, eligible: false, reason: 'Partial BT logic error' };
    }
  });

  return results;
};

export const calculateAllScenarios = async (formData) => {
  const { customerInfo, existingLiabilities, selectedLiabilities } = formData;
  try {
    const [fresh, full, partial] = await Promise.all([
      calculateFreshLoan(customerInfo),
      calculateFullBT(customerInfo, existingLiabilities),
      calculatePartialBT(customerInfo, existingLiabilities, selectedLiabilities)
    ]);
    return { freshLoan: fresh, fullBT: full, partialBT: partial };
  } catch (error) {
    throw new Error('Failed to calculate loan scenarios');
  }
};