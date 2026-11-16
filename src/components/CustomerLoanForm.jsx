import { useState, useEffect } from 'react';
import './CustomerLoanForm.css';
import { loadUniversalCompanies, getCompanySuggestions, initializeBankDatabases } from '../services/companyDatabaseService.js';
import { indianStates, stateCityData } from '../data/locationData.js';

export const LENDER_OPTIONS = [
  { value: "kotak mahindra bank", label: "Kotak Mahindra Bank" },
  { value: "hdfc bank", label: "HDFC Bank" },
  { value: "icici bank", label: "ICICI Bank" },
  { value: "sbi cards / sbi bank", label: "State Bank of India (SBI)" },
  { value: "axis bank", label: "Axis Bank" },
  { value: "indusind bank", label: "IndusInd Bank" },
  { value: "idfc bank", label: "IDFC First Bank" },
  { value: "rbl bank", label: "RBL Bank" },
  { value: "standard chartered bank", label: "Standard Chartered Bank" },
  { value: "hsbc bank", label: "HSBC Bank" },
  { value: "bandhan bank", label: "Bandhan Bank" },
  { value: "cholamandalam finance", label: "Cholamandalam Finance" },
  { value: "tata capital", label: "Tata Capital" },
  { value: "poonawala finance", label: "Poonawala Finance" },
  { value: "axis finance", label: "Axis Finance" },
  { value: "piramal finance", label: "Piramal Finance" },
  { value: "l&t finance", label: "L&T Finance" },
  { value: "smfg india credit", label: "SMFG India Credit" },
  { value: "incred finance", label: "Incred Finance" },
  { value: "au small finance bank", label: "AU Small Finance Bank" },
  { value: "aditya birla finance", label: "Aditya Birla Finance" },
  { value: "other", label: "Other Bank / NBFC (Not Listed)" }
];

const CustomerLoanForm = ({ onSubmit, loading, onBackToHome, initialData, mode = 'pl' }) => {
  const [formData, setFormData] = useState(() => {
    let saved = null;
    if (initialData && Object.keys(initialData).length > 0) {
      saved = initialData;
    } else {
      try {
        const cached = localStorage.getItem('laxmi_last_form_data');
        if (cached) saved = JSON.parse(cached);
      } catch (e) {}
    }

    // Support migrating any previous cached format
    const rawLoans = Array.isArray(saved?.existingLoans) ? saved.existingLoans : [];
    const initialLoans = rawLoans
      .filter(l => l.type !== 'Credit Card')
      .map(l => ({
        id: l.id || Date.now() + Math.random(),
        loanType: l.loanType || (l.type === 'Home Loan' ? 'hl' : (l.type === 'Other Loan' ? 'other' : 'pl')),
        outstandingAmount: l.outstandingAmount || '',
        monthlyEMI: l.monthlyEMI || '',
        lender: l.lender || ''
      }));

    const initialCards = Array.isArray(saved?.creditCards) && saved.creditCards.length > 0
      ? saved.creditCards
      : rawLoans
          .filter(l => l.type === 'Credit Card')
          .map(c => ({
            id: c.id || Date.now() + Math.random(),
            lender: c.lender || '',
            creditLimit: c.creditLimit || '',
            creditLimitUsed: c.creditLimitUsed || ''
          }));

    const isNewCreditSaved = saved?.isNewToCredit !== undefined
      ? saved.isNewToCredit
      : (saved?.creditScore === -1 || saved?.creditScore === '-1');

    return {
      customerName: saved?.customerName || '',
      mobileNumber: saved?.mobileNumber || '',
      basicSalary: saved?.basicSalary || '',
      incentiveMonth1: saved?.incentiveMonth1 || '',
      incentiveMonth2: saved?.incentiveMonth2 || '',
      incentiveMonth3: saved?.incentiveMonth3 || '',
      age: saved?.age || '',
      creditScore: isNewCreditSaved ? '-1' : (saved?.creditScore !== undefined ? String(saved.creditScore) : '750'),
      isNewToCredit: isNewCreditSaved,
      category: saved?.category || 'B',
      employmentType: saved?.employmentType || 'salaried',
      salaryMode: saved?.salaryMode || 'bank',
      hasPpfDeduction: saved?.hasPpfDeduction !== undefined ? saved.hasPpfDeduction : (saved?.hasPfDeduction !== undefined ? saved.hasPfDeduction : true),
      hasPfDeduction: saved?.hasPfDeduction !== undefined ? saved.hasPfDeduction : (saved?.hasPpfDeduction !== undefined ? saved.hasPpfDeduction : true),
      companyName: saved?.companyName || '',
      hasExistingLoans: saved?.hasExistingLoans !== undefined ? saved.hasExistingLoans : (initialLoans.length > 0),
      existingLoans: initialLoans,
      hasCreditCards: saved?.hasCreditCards !== undefined ? saved.hasCreditCards : (initialCards.length > 0),
      creditCards: initialCards,
      wantsBT: saved?.wantsBT || false,
      selectedLoansForBT: saved?.selectedLoansForBT || [],
      topUpBank: saved?.topUpBank || '',
      topUpRunningAmount: saved?.topUpRunningAmount || '',
      topUpRunningEMI: saved?.topUpRunningEMI || '',
      topUpTenurePassed: saved?.topUpTenurePassed || '6_to_12m',
      state: saved?.state || '',
      city: saved?.city || '',
      maritalStatus: saved?.maritalStatus || '',
      livingStatus: saved?.livingStatus || '',
      workExperience: saved?.workExperience || 'above_24m'
    };
  });

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const rawLoans = Array.isArray(initialData.existingLoans) ? initialData.existingLoans : [];
      const initialLoans = rawLoans
        .filter(l => l.type !== 'Credit Card')
        .map(l => ({
          id: l.id || Date.now() + Math.random(),
          outstandingAmount: l.outstandingAmount || '',
          monthlyEMI: l.monthlyEMI || '',
          lender: l.lender || ''
        }));

      const initialCards = Array.isArray(initialData.creditCards) && initialData.creditCards.length > 0
        ? initialData.creditCards
        : rawLoans
            .filter(l => l.type === 'Credit Card')
            .map(c => ({
              id: c.id || Date.now() + Math.random(),
              lender: c.lender || '',
              creditLimit: c.creditLimit || '',
              creditLimitUsed: c.creditLimitUsed || ''
            }));

      const isNewInit = initialData.isNewToCredit !== undefined
        ? initialData.isNewToCredit
        : (initialData.creditScore === -1 || initialData.creditScore === '-1');

      setFormData(prev => ({
        ...prev,
        ...initialData,
        creditScore: isNewInit ? '-1' : (initialData.creditScore !== undefined ? String(initialData.creditScore) : (prev.creditScore || '750')),
        isNewToCredit: isNewInit !== undefined ? isNewInit : (prev.isNewToCredit || false),
        hasExistingLoans: initialData.hasExistingLoans !== undefined ? initialData.hasExistingLoans : (initialLoans.length > 0 || prev.hasExistingLoans),
        existingLoans: initialLoans.length > 0 ? initialLoans : prev.existingLoans,
        hasCreditCards: initialData.hasCreditCards !== undefined ? initialData.hasCreditCards : (initialCards.length > 0 || prev.hasCreditCards),
        creditCards: initialCards.length > 0 ? initialCards : prev.creditCards,
        hasPpfDeduction: initialData.hasPpfDeduction !== undefined ? initialData.hasPpfDeduction : (initialData.hasPfDeduction !== undefined ? initialData.hasPfDeduction : (prev.hasPpfDeduction !== undefined ? prev.hasPpfDeduction : true)),
        hasPfDeduction: initialData.hasPfDeduction !== undefined ? initialData.hasPfDeduction : (initialData.hasPpfDeduction !== undefined ? initialData.hasPpfDeduction : (prev.hasPfDeduction !== undefined ? prev.hasPfDeduction : true))
      }));
    }
  }, [initialData]);

  // Continuously sync all input changes to localStorage so going back always has all form data
  useEffect(() => {
    try {
      localStorage.setItem('laxmi_last_form_data', JSON.stringify(formData));
    } catch (e) {}
  }, [formData]);

  const [companySuggestions, setCompanySuggestions] = useState([]);

  // Load company databases on mount
  useEffect(() => {
    const loadDatabases = async () => {
      await loadUniversalCompanies();
      await initializeBankDatabases();
      console.log('✅ Company databases ready');
    };
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    loadDatabases();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Pure typed numeric inputs: allow ONLY digits, prevent any stepper/range shifts
    const numericFields = ['basicSalary', 'incentiveMonth1', 'incentiveMonth2', 'incentiveMonth3', 'age', 'creditScore', 'topUpRunningAmount', 'topUpRunningEMI'];
    let finalValue = value;
    if (numericFields.includes(name)) {
      finalValue = value.replace(/[^0-9]/g, '');
    }

    // Debug logging for salary input
    if (name === 'basicSalary') {
      console.log('💰 Salary Input Changed:', {
        rawValue: finalValue,
        type: typeof finalValue,
        parsed: parseFloat(finalValue)
      });
    }

    // Handle company name autocomplete
    if (name === 'companyName') {
      const suggestions = getCompanySuggestions(finalValue);
      setCompanySuggestions(suggestions);
    }

    // Auto-initialize first item if user checks the box and list is empty
    if (name === 'hasExistingLoans' && checked && formData.existingLoans.length === 0) {
      setFormData(prev => ({
        ...prev,
        hasExistingLoans: true,
        existingLoans: [{ id: Date.now(), lender: '', outstandingAmount: '', monthlyEMI: '' }]
      }));
      return;
    }

    if (name === 'hasCreditCards' && checked && (!formData.creditCards || formData.creditCards.length === 0)) {
      setFormData(prev => ({
        ...prev,
        hasCreditCards: true,
        creditCards: [{ id: Date.now(), lender: '', creditLimit: '', creditLimitUsed: '' }]
      }));
      return;
    }

    if (name === 'wantsBT') {
      setFormData(prev => ({
        ...prev,
        wantsBT: checked,
        selectedLoansForBT: []
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : finalValue
    }));
  };

  const handleToggleNewToCredit = (e) => {
    const checked = e.target.checked;
    setFormData(prev => ({
      ...prev,
      isNewToCredit: checked,
      creditScore: checked ? '-1' : (prev.creditScore === '-1' ? '750' : prev.creditScore)
    }));
  };

  const handleTogglePpfDeduction = (e) => {
    const checked = e.target.checked;
    setFormData(prev => ({
      ...prev,
      hasPpfDeduction: checked,
      hasPfDeduction: checked
    }));
  };

  const handleAddLoan = () => {
    setFormData(prev => ({
      ...prev,
      hasExistingLoans: true,
      existingLoans: [
        ...prev.existingLoans,
        {
          id: Date.now() + Math.random(),
          loanType: 'pl',
          outstandingAmount: '',
          monthlyEMI: '',
          lender: ''
        }
      ]
    }));
  };

  const handleRemoveLoan = (id) => {
    setFormData(prev => ({
      ...prev,
      existingLoans: prev.existingLoans.filter(loan => loan.id !== id),
      selectedLoansForBT: prev.selectedLoansForBT.filter(loanId => loanId !== id)
    }));
  };

  const handleLoanChange = (id, field, value) => {
    const numericLoanFields = ['monthlyEMI', 'outstandingAmount'];
    let finalValue = value;
    if (numericLoanFields.includes(field)) {
      finalValue = value.replace(/[^0-9]/g, '');
    }

    setFormData(prev => ({
      ...prev,
      existingLoans: prev.existingLoans.map(loan => {
        if (loan.id === id) {
          return { ...loan, [field]: finalValue };
        }
        return loan;
      })
    }));
  };

  const handleAddCreditCard = () => {
    setFormData(prev => ({
      ...prev,
      hasCreditCards: true,
      creditCards: [
        ...(prev.creditCards || []),
        {
          id: Date.now() + Math.random(),
          lender: '',
          creditLimit: '',
          creditLimitUsed: ''
        }
      ]
    }));
  };

  const handleRemoveCreditCard = (id) => {
    setFormData(prev => ({
      ...prev,
      creditCards: (prev.creditCards || []).filter(card => card.id !== id),
      selectedLoansForBT: prev.selectedLoansForBT.filter(loanId => loanId !== id)
    }));
  };

  const handleCreditCardChange = (id, field, value) => {
    const numericCardFields = ['creditLimit', 'creditLimitUsed'];
    let finalValue = value;
    if (numericCardFields.includes(field)) {
      finalValue = value.replace(/[^0-9]/g, '');
    }

    setFormData(prev => ({
      ...prev,
      creditCards: (prev.creditCards || []).map(card => {
        if (card.id === id) {
          return { ...card, [field]: finalValue };
        }
        return card;
      })
    }));
  };

  const handleBTToggle = (id) => {
    setFormData(prev => {
      const isSelected = prev.selectedLoansForBT.includes(id);
      return {
        ...prev,
        selectedLoansForBT: isSelected
          ? prev.selectedLoansForBT.filter(item => item !== id)
          : [...prev.selectedLoansForBT, id]
      };
    });
  };

  const hasBTObligations = (formData.hasExistingLoans && formData.existingLoans?.length > 0) ||
    (formData.hasCreditCards && formData.creditCards?.length > 0);
  const isBTSelectionPending = mode === 'pl' && hasBTObligations && Boolean(formData.wantsBT) && (!formData.selectedLoansForBT || formData.selectedLoansForBT.length === 0);

  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    // ── Guard: BT Selection Required if user chose Balance Transfer ─────────
    if (isBTSelectionPending) {
      setValidationError('Please select at least one loan or credit card for Balance Transfer, or uncheck "Yes, I want to do Balance Transfer".');
      return;
    }

    // ── Guard: Top-Up specific validations ─────────────────────────────────
    if (mode === 'topup') {
      if (!formData.topUpBank) {
        setValidationError('Please select the bank where your existing loan is currently active.');
        document.getElementById('topUpBank')?.focus();
        return;
      }
      const runningAmt = parseFloat(formData.topUpRunningAmount) || 0;
      if (runningAmt <= 0) {
        setValidationError('Please enter your current running loan balance/outstanding amount.');
        document.getElementById('topUpRunningAmount')?.focus();
        return;
      }
    }

    // ── Guard: Name & Mobile required ──────────────────────────────────────
    if (!formData.customerName.trim()) {
      setValidationError('Please enter your full name to continue.');
      document.getElementById('customerName')?.focus();
      return;
    }
    const mobileRegex = /^[6-9][0-9]{9}$/;
    if (!mobileRegex.test(formData.mobileNumber)) {
      setValidationError('Please enter a valid 10-digit mobile number to continue.');
      document.getElementById('mobileNumber')?.focus();
      return;
    }

    // ── Guard: Edge Case Mathematical Boundaries ───────────────────────────
    const parsedAge = parseInt(formData.age);
    if (!parsedAge || parsedAge < 21 || parsedAge > 65) {
      setValidationError(`Age must be between 21 and 65. You entered ${formData.age || 'nothing'}.`);
      document.getElementById('age')?.focus();
      return;
    }
    
    const parsedSalary = parseFloat(formData.basicSalary) || 0;
    if (parsedSalary < 5000) {
      setValidationError(`Basic salary must be at least ₹5,000 to process through the institutional banking engine.`);
      document.getElementById('basicSalary')?.focus();
      return;
    }
    
    // Security Hook: Prevent any negative numbers from breaking FOIR math
    const financialFields = [
      { name: 'Basic Salary', value: parsedSalary },
      { name: 'Current Month Incentive', value: parseFloat(formData.incentiveMonth1) || 0 },
      { name: 'Last Month Incentive', value: parseFloat(formData.incentiveMonth2) || 0 },
      { name: '2 Months Ago Incentive', value: parseFloat(formData.incentiveMonth3) || 0 }
    ];
    
    for (const field of financialFields) {
      if (field.value < 0) {
        setValidationError(`Security Error: ${field.name} cannot be a negative mathematical value.`);
        return;
      }
    }
    
    // Security Hook: Negative numbers on Liabilities
    if (formData.hasExistingLoans) {
      for (let i = 0; i < formData.existingLoans.length; i++) {
        const loan = formData.existingLoans[i];
        if (
          (parseFloat(loan.monthlyEMI) < 0) || 
          (parseFloat(loan.outstandingAmount) < 0)
        ) {
          setValidationError(`Security Error: Loan parameters cannot be negative numbers (Review Loan ${i + 1}).`);
          return;
        }
      }
    }
    if (formData.hasCreditCards && formData.creditCards) {
      for (let i = 0; i < formData.creditCards.length; i++) {
        const card = formData.creditCards[i];
        if (
          (parseFloat(card.creditLimit) < 0) || 
          (parseFloat(card.creditLimitUsed) < 0)
        ) {
          setValidationError(`Security Error: Credit card parameters cannot be negative numbers (Review Credit Card ${i + 1}).`);
          return;
        }
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    // Parse data EXACTLY as backend expects
    const basicSalary = parseFloat(formData.basicSalary) || 0;

    // Calculate average incentive from last 3 months
    const incentiveMonth1 = parseFloat(formData.incentiveMonth1) || 0;
    const incentiveMonth2 = parseFloat(formData.incentiveMonth2) || 0;
    const incentiveMonth3 = parseFloat(formData.incentiveMonth3) || 0;
    const averageIncentive = (incentiveMonth1 + incentiveMonth2 + incentiveMonth3) / 3;

    // Total monthly income = basic + incentive (frontend provides total, banks apply their %)
    const totalMonthlyIncome = basicSalary + averageIncentive;

    // Calculate total existing EMI (from active loans)
    const totalExistingEMI = formData.hasExistingLoans
      ? formData.existingLoans.reduce((sum, loan) => sum + (parseFloat(loan.monthlyEMI) || 0), 0)
      : 0;

    // Directly use credit card obligation internally (5% of credit limit used)
    const activeCreditCards = (formData.hasCreditCards && Array.isArray(formData.creditCards))
      ? formData.creditCards
      : [];
    const totalCreditCardObligation = activeCreditCards.reduce((sum, card) => {
      // If credit card is selected for BT, don't count it as active monthly obligation
      if (formData.wantsBT && formData.selectedLoansForBT.includes(card.id)) return sum;
      const creditLimitUsed = parseFloat(card.creditLimitUsed) || 0;
      return sum + (creditLimitUsed * 0.05);
    }, 0);

    // Extract existing loan bank names and loan types
    const activeLoans = formData.hasExistingLoans ? formData.existingLoans : [];
    const existingLoanBanks = activeLoans
      .filter(loan =>
        loan.lender &&
        loan.lender.trim() !== '' &&
        loan.lender !== 'other' // Exclude "Other Bank (Not Listed)"
      )
      .map(loan => loan.lender.trim().toLowerCase());

    const existingLoanTypes = activeLoans.map(loan => {
      if (loan.loanType === 'hl' || loan.type === 'Home Loan') return 'Home Loan';
      if (loan.loanType === 'other' || loan.type === 'Other Loan') return 'Other Loan';
      return 'Personal Loan';
    });

    const hasHlOrLap = activeLoans.some(loan => loan.loanType === 'hl' || loan.type === 'Home Loan');

    // Prepare loans and credit cards selected for Balance Transfer
    const selectedLoans = activeLoans
      .filter(loan => formData.selectedLoansForBT.includes(loan.id))
      .map(loan => ({ 
        ...loan, 
        type: loan.loanType === 'hl' ? 'Home Loan' : (loan.loanType === 'other' ? 'Other Loan' : 'Personal Loan')
      }));

    const selectedCards = activeCreditCards
      .filter(card => formData.selectedLoansForBT.includes(card.id))
      .map(card => ({
        ...card,
        type: 'Credit Card',
        outstandingAmount: parseFloat(card.creditLimitUsed || 0)
      }));

    const loansForBT = formData.wantsBT ? [...selectedLoans, ...selectedCards] : [];

    // DEBUG: Log extracted bank names
    console.log('='.repeat(80));
    console.log('🔍 EXISTING LIABILITIES CHECK:');
    console.log('Existing loans count:', activeLoans.length);
    console.log('Credit cards count:', activeCreditCards.length);
    console.log('Total Existing EMI (Loans):', totalExistingEMI);
    console.log('Internal CC Obligation (5%):', Math.round(totalCreditCardObligation));
    console.log('Existing Loan Types:', existingLoanTypes);
    console.log('Has Home Loan / LAP:', hasHlOrLap);
    console.log('Loans/Cards selected for BT:', loansForBT.length);
    console.log('='.repeat(80));

    // Prepare data EXACTLY as realLoanService expects
    const submissionData = {
      basicSalary: basicSalary,
      averageIncentive: averageIncentive,
      monthlyIncome: totalMonthlyIncome,
      age: parseInt(formData.age),
      category: formData.employmentType === 'government' ? 'GOVT' : formData.category,
      employmentType: formData.employmentType,
      companyName: formData.companyName,
      hasExistingLoans: Boolean(formData.hasExistingLoans),
      hasCreditCards: Boolean(formData.hasCreditCards),
      existingEMI: totalExistingEMI,
      creditCardObligation: Math.round(totalCreditCardObligation), // Directly computed 5% internally
      creditCards: activeCreditCards.map(card => ({
        id: card.id,
        cardName: card.lender || 'Credit Card',
        lender: card.lender || 'Credit Card',
        outstandingAmount: parseFloat(card.creditLimitUsed || 0),
        creditLimit: parseFloat(card.creditLimit || 0),
        creditLimitUsed: parseFloat(card.creditLimitUsed || 0),
        isBT: formData.wantsBT && formData.selectedLoansForBT.includes(card.id)
      })),
      existingLoanBanks: existingLoanBanks,
      existingLoanTypes: existingLoanTypes,
      hasHlOrLap: hasHlOrLap,
      existingLoans: activeLoans.map(loan => ({
        ...loan,
        loanType: loan.loanType || 'pl',
        type: loan.loanType === 'hl' ? 'Home Loan' : (loan.loanType === 'other' ? 'Other Loan' : 'Personal Loan')
      })),
      wantsBT: formData.wantsBT,
      selectedLoansForBT: formData.wantsBT ? formData.selectedLoansForBT : [],
      loansForBT: loansForBT,
      creditScore: (formData.isNewToCredit || formData.creditScore === '-1' || formData.creditScore === -1)
        ? -1
        : (formData.creditScore ? parseInt(formData.creditScore, 10) : 750),
      cibilScore: (formData.isNewToCredit || formData.creditScore === '-1' || formData.creditScore === -1)
        ? -1
        : (formData.creditScore ? parseInt(formData.creditScore, 10) : 750),
      isNewToCredit: Boolean(formData.isNewToCredit || formData.creditScore === '-1' || formData.creditScore === -1),
      state: formData.state,
      city: formData.city,
      salaryMode: formData.salaryMode || 'bank',
      hasPpfDeduction: Boolean(formData.hasPpfDeduction),
      hasPfDeduction: Boolean(formData.hasPpfDeduction),
      maritalStatus: formData.maritalStatus,
      livingStatus: formData.livingStatus,
      workExperience: formData.workExperience || 'above_24m',
      workExperienceMonths: formData.workExperience === 'below_3m' ? 2 : (formData.workExperience === '3m_to_24m' ? 12 : 25),
      totalWorkExperience: formData.workExperience === 'below_3m' ? 2 : (formData.workExperience === '3m_to_24m' ? 12 : 25),
      currentCompanyExperience: formData.workExperience === 'below_3m' ? 2 : (formData.workExperience === '3m_to_24m' ? 12 : 25),
      productMode: mode,
      topUpBank: formData.topUpBank,
      topUpRunningAmount: parseFloat(formData.topUpRunningAmount || 0),
      topUpRunningEMI: parseFloat(formData.topUpRunningEMI || 0),
      topUpTenurePassed: formData.topUpTenurePassed || '6_to_12m',

      // Additional data for display purposes
      _metadata: {
        productMode: mode,
        topUpBank: formData.topUpBank,
        topUpRunningAmount: parseFloat(formData.topUpRunningAmount || 0),
        topUpRunningEMI: parseFloat(formData.topUpRunningEMI || 0),
        topUpTenurePassed: formData.topUpTenurePassed || '6_to_12m',
        customerName: formData.customerName,
        mobileNumber: formData.mobileNumber,
        companyName: formData.companyName,
        category: formData.employmentType === 'government' ? 'GOVT' : formData.category,
        basicSalary: basicSalary,
        averageIncentive: averageIncentive,
        incentiveMonth1: incentiveMonth1,
        incentiveMonth2: incentiveMonth2,
        incentiveMonth3: incentiveMonth3,
        existingLoans: formData.existingLoans,
        creditCards: formData.creditCards,
        wantsBT: formData.wantsBT,
        selectedLoansForBT: formData.selectedLoansForBT,
        state: formData.state,
        city: formData.city,
        age: formData.age,
        creditScore: (formData.isNewToCredit || formData.creditScore === '-1' || formData.creditScore === -1)
          ? -1
          : (formData.creditScore ? parseInt(formData.creditScore, 10) : 750),
        cibilScore: (formData.isNewToCredit || formData.creditScore === '-1' || formData.creditScore === -1)
          ? -1
          : (formData.creditScore ? parseInt(formData.creditScore, 10) : 750),
        isNewToCredit: Boolean(formData.isNewToCredit || formData.creditScore === '-1' || formData.creditScore === -1),
        employmentType: formData.employmentType,
        salaryMode: formData.salaryMode,
        hasPpfDeduction: Boolean(formData.hasPpfDeduction),
        hasPfDeduction: Boolean(formData.hasPpfDeduction),
        maritalStatus: formData.maritalStatus,
        livingStatus: formData.livingStatus,
        workExperience: formData.workExperience || 'above_24m',
        workExperienceMonths: formData.workExperience === 'below_3m' ? 2 : (formData.workExperience === '3m_to_24m' ? 12 : 25)
      }
    };

    // Pass submissionData to loan engine AND raw formData to lead service
    onSubmit(submissionData, formData);
  };

  return (
    <form onSubmit={handleSubmit} className="customer-loan-form" autoComplete="off">
      <div className="form-header">
        <h2 style={{
          fontFamily: 'Outfit, "Plus Jakarta Sans", Inter, sans-serif',
          fontStyle: 'normal',
          fontWeight: 750,
          color: 'rgb(66, 66, 66)',
          fontSize: 'clamp(28px, 4vw, 43px)',
          lineHeight: '54px',
          margin: '0 0 8px 0'
        }}>
          {mode === 'topup' ? (
            <>Existing Loan <span style={{ color: '#1E40AF' }}>Top-Up Application</span></>
          ) : mode === 'od' ? (
            <>Overdraft (OD) <span style={{ color: '#059669' }}>Limit Application</span></>
          ) : (
            <>Personal Loan <span style={{ color: '#F58220' }}>Eligibility Application</span></>
          )}
        </h2>
        <div style={{
          width: '42px',
          height: '3.5px',
          backgroundColor: mode === 'topup' ? '#1E40AF' : (mode === 'od' ? '#059669' : '#F58220'),
          borderRadius: '2px',
          margin: '0 auto 12px'
        }} />
        <p>
          {mode === 'topup' ? (
            'Enter your details and existing running loan parameters to calculate your instant net cash top-up limit with zero bureau inquiry.'
          ) : mode === 'od' ? (
            'Calculate your pre-approved Overdraft credit lines across 5 leading institutions: Tata Capital, ABFL, Kotak Mahindra Bank, Cholamandalam, and IDFC FIRST Bank.'
          ) : (
            'Enter your details to discover instant pre-approved personal loan offers tailored to your profile with zero impact on CIBIL score.'
          )}
        </p>
      </div>

      {/* Mode-specific Banner */}
      {mode === 'topup' && (
        <div style={{
          width: '100%',
          padding: '14px 20px',
          marginBottom: '20px',
          background: '#EFF6FF',
          border: '1.5px solid #93C5FD',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#1E40AF'
        }}>
          <span style={{ fontSize: '1.6rem' }}>⚡</span>
          <div>
            <strong style={{ fontSize: '1rem', display: 'block' }}>Loan Top-Up Calculator ($E - L$ Formula)</strong>
            <span style={{ fontSize: '0.88rem', color: '#1E3A8A' }}>
              We evaluate your bank's total sanction ceiling and subtract your running loan balance ($E - L$). The net cash difference is your disbursed top-up amount!
            </span>
          </div>
        </div>
      )}

      {mode === 'od' && (
        <div style={{
          width: '100%',
          padding: '14px 20px',
          marginBottom: '20px',
          background: '#ECFDF5',
          border: '1.5px solid #6EE7B7',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#065F46'
        }}>
          <span style={{ fontSize: '1.6rem' }}>💳</span>
          <div>
            <strong style={{ fontSize: '1rem', display: 'block' }}>Institutional Overdraft (OD) Facility</strong>
            <span style={{ fontSize: '0.88rem', color: '#047857' }}>
              Assessing approved limits across <strong>Tata Capital, Aditya Birla Finance, Kotak Mahindra Bank, Cholamandalam, and IDFC FIRST Bank</strong>. Pay interest ONLY when you withdraw funds.
            </span>
          </div>
        </div>
      )}

      {/* Personal Details */}
      <div className="form-section">
        <h3>Personal Identification</h3>
        <div className="form-row-two">
          <div className="form-group">
            <label htmlFor="customerName">
              Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              required
              autoComplete="off"
              style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="mobileNumber">
              Mobile Number <span className="required">*</span>
            </label>
            <input
              type="tel"
              id="mobileNumber"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleInputChange}
              placeholder="10-digit mobile number"
              required
              maxLength={10}
              autoComplete="off"
              pattern="[6-9][0-9]{9}"
              title="Enter a valid 10-digit Indian mobile number"
              inputMode="numeric"
              style={{
                color: '#111827',
                WebkitTextFillColor: '#111827',
                backgroundColor: '#ffffff',
                fontWeight: 600,
                ...(formData.mobileNumber.length > 0 && formData.mobileNumber.length < 10
                  ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.2)' }
                  : {})
              }}
            />
            {/* Live validation feedback */}
            {formData.mobileNumber.length > 0 && formData.mobileNumber.length < 10 && (
              <small style={{ color: '#f87171', fontWeight: '600', marginTop: '4px', display: 'block' }}>
                ⚠️ Mobile number must be exactly 10 digits ({10 - formData.mobileNumber.length} more needed)
              </small>
            )}
            {formData.mobileNumber.length === 10 && (
              <small className="help-text" style={{ color: '#00ff88', fontWeight: '600' }}>
                ✓ Valid mobile number
              </small>
            )}
          </div>
        </div>

        <div className="form-row-two" style={{ marginTop: '20px' }}>
          <div className="form-group">
            <label htmlFor="state">
              State <span className="required">*</span>
            </label>
            <select
              id="state"
              name="state"
              value={formData.state}
              onChange={(e) => {
                const newState = e.target.value;
                setFormData(prev => ({ ...prev, state: newState, city: '' }));
              }}
              required
              style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
            >
              <option value="">-- Select State --</option>
              {indianStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="city">
              City <span className="required">*</span>
            </label>
            <select
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              required
              disabled={!formData.state}
              style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
            >
              <option value="">-- Select City --</option>
              {formData.state && stateCityData[formData.state]?.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div style={{
          width: '100%',
          padding: '14px 18px',
          marginBottom: '8px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderLeft: '3px solid #ef4444',
          borderRadius: '8px',
          color: '#fca5a5',
          fontSize: '0.92rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          Attention: {validationError}
        </div>
      )}

      {/* Salary Information */}
      <div className="form-section">
        <h3>Financial Compensation</h3>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <label htmlFor="basicSalary" style={{ margin: 0, fontWeight: 700, color: '#1f2937' }}>
              Monthly Basic / In-Hand Salary <span className="required">*</span>
            </label>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '12.5px',
              fontWeight: 700,
              color: formData.hasPpfDeduction ? '#047857' : '#4b5563',
              margin: 0,
              backgroundColor: formData.hasPpfDeduction ? '#ecfdf5' : '#f3f4f6',
              padding: '4px 10px',
              borderRadius: '6px',
              border: formData.hasPpfDeduction ? '1.5px solid #10b981' : '1px solid #d1d5db',
              transition: 'all 0.2s ease'
            }}>
              <input
                type="checkbox"
                id="hasPpfDeductionToggle"
                checked={Boolean(formData.hasPpfDeduction)}
                onChange={handleTogglePpfDeduction}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981' }}
              />
              PF / PPF Deducted in Salary
            </label>
          </div>
          <input
            type="text"
            id="basicSalary"
            name="basicSalary"
            value={formData.basicSalary}
            onChange={handleInputChange}
            onWheel={(e) => e.target.blur()}
            placeholder="₹ 50,000"
            required
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', gap: '6px' }}>
            {formData.basicSalary && (
              <small className="help-text" style={{ color: '#27ae60', fontWeight: '600' }}>
                Value stored: ₹{parseFloat(formData.basicSalary).toLocaleString('en-IN')}
              </small>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="averageIncentive">
            Monthly Incentive Details <span className="optional">(optional)</span>
          </label>
          <small className="help-text" style={{ display: 'block', marginBottom: '10px' }}>
            Enter your incentive/variable pay for the last 3 months. Different banks consider different percentages (25%, 50%, or 100%).
          </small>

          <div className="incentive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <div>
              <label htmlFor="incentiveMonth1" style={{ fontSize: '0.9em', fontWeight: '600', color: '#555' }}>
                Current Month
              </label>
              <input
                type="text"
                id="incentiveMonth1"
                name="incentiveMonth1"
                value={formData.incentiveMonth1}
                onChange={handleInputChange}
                onWheel={(e) => e.target.blur()}
                placeholder="₹ 0"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                style={{ marginTop: '5px', color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
              />
            </div>

            <div>
              <label htmlFor="incentiveMonth2" style={{ fontSize: '0.9em', fontWeight: '600', color: '#555' }}>
                Last Month
              </label>
              <input
                type="text"
                id="incentiveMonth2"
                name="incentiveMonth2"
                value={formData.incentiveMonth2}
                onChange={handleInputChange}
                onWheel={(e) => e.target.blur()}
                placeholder="₹ 0"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                style={{ marginTop: '5px', color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
              />
            </div>

            <div>
              <label htmlFor="incentiveMonth3" style={{ fontSize: '0.9em', fontWeight: '600', color: '#555' }}>
                2 Months Ago
              </label>
              <input
                type="text"
                id="incentiveMonth3"
                name="incentiveMonth3"
                value={formData.incentiveMonth3}
                onChange={handleInputChange}
                onWheel={(e) => e.target.blur()}
                placeholder="₹ 0"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                style={{ marginTop: '5px', color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
              />
            </div>
          </div>
        </div>

        {(formData.incentiveMonth1 || formData.incentiveMonth2 || formData.incentiveMonth3) && (
          <div className="incentive-summary" style={{
            marginTop: '15px',
            padding: '15px',
            background: '#f0f7ff',
            borderRadius: '8px',
            borderLeft: '4px solid #2196f3'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Incentive Summary:</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.9em' }}>
              <div>
                <span style={{ color: '#666' }}>Total (3 months):</span>
                <strong style={{ marginLeft: '8px' }}>
                  ₹{((parseFloat(formData.incentiveMonth1) || 0) +
                    (parseFloat(formData.incentiveMonth2) || 0) +
                    (parseFloat(formData.incentiveMonth3) || 0)).toLocaleString('en-IN')}
                </strong>
              </div>
              <div>
                <span style={{ color: '#666' }}>Average per month:</span>
                <strong style={{ marginLeft: '8px' }}>
                  ₹{(((parseFloat(formData.incentiveMonth1) || 0) +
                    (parseFloat(formData.incentiveMonth2) || 0) +
                    (parseFloat(formData.incentiveMonth3) || 0)) / 3).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </strong>
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.85em', fontStyle: 'italic', color: '#555' }}>
              Note: Banks will apply their own percentage (25%-100%) to this average based on their policies.
            </div>
          </div>
        )}

        {(formData.basicSalary || formData.incentiveMonth1 || formData.incentiveMonth2 || formData.incentiveMonth3) && (
          <div className="total-income-display">
            <strong>Total Monthly Income (Basic + Avg Incentive):</strong> ₹{(
              (parseFloat(formData.basicSalary) || 0) +
              ((parseFloat(formData.incentiveMonth1) || 0) +
                (parseFloat(formData.incentiveMonth2) || 0) +
                (parseFloat(formData.incentiveMonth3) || 0)) / 3
            ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        )}
      </div>

      {/* Personal & Employment Details */}
      <div className="form-section">
        <h3>Employment & Personal Profile</h3>

        <div className="form-group">
          <label htmlFor="age">
            Current Age <span className="required">*</span>
          </label>
          <input
            type="text"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleInputChange}
            onWheel={(e) => e.target.blur()}
            placeholder="30"
            required
            maxLength={2}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
          />
          <small className="help-text">
            Banks use age to decide maximum loan tenure (retirement age limit)
          </small>
        </div>

        {/* CIBIL Score & New To Credit (-1) Toggle */}
        <div className="form-group" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <label htmlFor="creditScore" style={{ margin: 0, fontWeight: 700, color: '#1f2937' }}>
              CIBIL / Credit Score <span className="required">*</span>
            </label>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '12.5px',
              fontWeight: 700,
              color: (formData.isNewToCredit || formData.creditScore === '-1') ? '#1d4ed8' : '#4b5563',
              margin: 0,
              backgroundColor: (formData.isNewToCredit || formData.creditScore === '-1') ? '#eff6ff' : '#f3f4f6',
              padding: '4px 10px',
              borderRadius: '6px',
              border: (formData.isNewToCredit || formData.creditScore === '-1') ? '1.5px solid #3b82f6' : '1px solid #d1d5db',
              transition: 'all 0.2s ease'
            }}>
              <input
                type="checkbox"
                id="isNewToCreditToggle"
                checked={Boolean(formData.isNewToCredit || formData.creditScore === '-1')}
                onChange={handleToggleNewToCredit}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
              New to Credit / No CIBIL (-1)
            </label>
          </div>

          {(formData.isNewToCredit || formData.creditScore === '-1') ? (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#eff6ff',
              border: '2px dashed #3b82f6',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600,
              color: '#1d4ed8'
            }}>
              <span>🌟 First Time Borrower / New to Credit</span>
              <span style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800 }}>
                Score: -1
              </span>
            </div>
          ) : (
            <input
              type="text"
              id="creditScore"
              name="creditScore"
              value={formData.creditScore}
              onChange={handleInputChange}
              onWheel={(e) => e.target.blur()}
              placeholder="e.g. 750"
              maxLength={3}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              required={!formData.isNewToCredit}
              style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
            />
          )}
          <small className="help-text">
            Enter CIBIL score (300-900) or check toggle if customer has no past credit history (-1)
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="maritalStatus">
            Marital Status <span className="required">*</span>
          </label>
          <select
            id="maritalStatus"
            name="maritalStatus"
            value={formData.maritalStatus}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, maritalStatus: e.target.value, livingStatus: '' }));
            }}
            required
            style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
          >
            <option value="">-- Select Status --</option>
            <option value="single">Single / Unmarried</option>
            <option value="married">Married</option>
          </select>
        </div>

        {formData.maritalStatus && (
          <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <label htmlFor="livingStatus">
              Current Living Arrangement <span className="required">*</span>
            </label>
            <select
              id="livingStatus"
              name="livingStatus"
              value={formData.livingStatus}
              onChange={handleInputChange}
              required
              style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
            >
              <option value="">-- Select Living Arrangement --</option>
              <option value="rented">Rented / Living Alone / Flatmates</option>
              <option value="family">Living with Family (Parents/Relatives)</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="employmentType">
            Employment Type <span className="required">*</span>
          </label>
          <select
            id="employmentType"
            name="employmentType"
            value={formData.employmentType}
            onChange={handleInputChange}
            required
            style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
          >
            <option value="salaried">Private</option>
            <option value="government">Government Employee</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="workExperience">
            Total Work Experience <span className="required">*</span>
          </label>
          <select
            id="workExperience"
            name="workExperience"
            value={formData.workExperience || 'above_24m'}
            onChange={handleInputChange}
            required
            style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
          >
            <option value="below_3m">Less than 3 Months</option>
            <option value="3m_to_24m">3 Months to 2 Years</option>
            <option value="above_24m">&gt; 2 Years</option>
          </select>
        </div>

        {formData.employmentType === 'salaried' && (
          <div className="form-group">
            <label htmlFor="companyName">
              Company Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              onBlur={() => setTimeout(() => setCompanySuggestions([]), 200)}
              placeholder="Start typing company name..."
              required={formData.employmentType === 'salaried'}
              autoComplete="off"
              style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
            />
            {companySuggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {companySuggestions.map((company, idx) => (
                  <div
                    key={idx}
                    className="autocomplete-item"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur from firing before click
                      console.log('🏢 Company Selected:', company);
                      setFormData(prev => ({ ...prev, companyName: company }));
                      setCompanySuggestions([]);
                    }}
                  >
                    {company}
                  </div>
                ))}
              </div>
            )}
            <small className="help-text">
              Type your company name. We'll check each bank's database for your category.
            </small>
          </div>
        )}

        {/* String 8: Salary Mode Selection */}
        <div className="form-group">
          <label htmlFor="salaryMode">
            Salary Received In <span className="required">*</span>
          </label>
          <select
            id="salaryMode"
            name="salaryMode"
            value={formData.salaryMode || 'bank'}
            onChange={handleInputChange}
            required
            className="salary-mode-select"
            style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
          >
            <option value="bank">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
          </select>
          <small className="help-text" style={{ display: 'block', marginTop: '5px', fontSize: '0.85em', color: '#666' }}>
            Most institutional banks strictly required a "Bank Transfer" salary.
          </small>
        </div>
      </div>

      {/* Top-Up Running Loan Section (Top-Up Mode Only) */}
      {mode === 'topup' && (
        <div className="form-section" style={{ background: '#F0F9FF', borderLeft: '4px solid #0284C7', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ color: '#0369A1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡</span> Existing Running Loan for Top-Up
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '18px', lineHeight: '1.5' }}>
            Provide details of the running personal loan on which you want to calculate your additional top-up limit. Your top-up is computed as <strong>Total Bank Eligibility Capacity ($E$) minus Current Running Loan Balance ($L$)</strong>.
          </p>

          <div className="form-row-two">
            <div className="form-group">
              <label htmlFor="topUpBank" style={{ fontWeight: 700, color: '#1E293B' }}>
                Bank / Lender of Running Loan <span className="required">*</span>
              </label>
              <select
                id="topUpBank"
                name="topUpBank"
                value={formData.topUpBank || ''}
                onChange={handleInputChange}
                required
                style={{
                  fontWeight: 600,
                  color: '#1E293B',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '12px 14px'
                }}
              >
                <option value="">-- Select Your Existing Bank --</option>
                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                <option value="Tata Capital">Tata Capital</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="IDFC First Bank">IDFC FIRST Bank</option>
                <option value="Cholamandalam Finance">Cholamandalam Finance (Chola)</option>
                <option value="Aditya Birla Finance">Aditya Birla Finance (ABFL)</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Axis Finance">Axis Finance</option>
                <option value="Poonawala Finance">Poonawalla Fincorp</option>
                <option value="IndusInd Bank">IndusInd Bank</option>
                <option value="Piramal Finance">Piramal Finance</option>
                <option value="L&T Finance">L&T Finance</option>
                <option value="SMFG India Credit">SMFG India Credit</option>
                <option value="Incred Finance">Incred Finance</option>
                <option value="AU Small Finance Bank">AU Small Finance Bank</option>
                <option value="Bandhan Bank">Bandhan Bank</option>
                <option value="other">Other Bank / NBFC</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="topUpRunningAmount" style={{ fontWeight: 700, color: '#1E293B' }}>
                Current Running Loan Balance / POS (₹) <span className="required">*</span>
              </label>
              <input
                type="text"
                id="topUpRunningAmount"
                name="topUpRunningAmount"
                value={formData.topUpRunningAmount || ''}
                onChange={handleInputChange}
                placeholder="e.g. 500000"
                required
                inputMode="numeric"
                style={{ fontWeight: 600, color: '#1E293B', backgroundColor: '#FFFFFF' }}
              />
              <small className="help-text">Outstanding principal remaining on this loan</small>
            </div>
          </div>

          <div className="form-row-two" style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label htmlFor="topUpRunningEMI" style={{ fontWeight: 700, color: '#1E293B' }}>
                Current Monthly EMI (₹) <span className="required">*</span>
              </label>
              <input
                type="text"
                id="topUpRunningEMI"
                name="topUpRunningEMI"
                value={formData.topUpRunningEMI || ''}
                onChange={handleInputChange}
                placeholder="e.g. 14000"
                required
                inputMode="numeric"
                style={{ fontWeight: 600, color: '#1E293B', backgroundColor: '#FFFFFF' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="topUpTenurePassed" style={{ fontWeight: 700, color: '#1E293B' }}>
                Tenure Paid / Vintage
              </label>
              <select
                id="topUpTenurePassed"
                name="topUpTenurePassed"
                value={formData.topUpTenurePassed || '6_to_12m'}
                onChange={handleInputChange}
                style={{
                  fontWeight: 600,
                  color: '#1E293B',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '12px 14px'
                }}
              >
                <option value="below_6m">Less than 6 EMIs Paid</option>
                <option value="6_to_12m">6 to 12 EMIs Paid (Eligible for Standard Top-Up)</option>
                <option value="above_12m">12+ EMIs Paid (Eligible for Lowest Interest Top-Up)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Existing Loans and Credit Cards */}
      <div className="form-section">
        <h3>{mode === 'topup' ? 'Any Other Obligations & Liabilities (Optional)' : 'Financial Commitments'}</h3>

        {/* 1. Existing Loans First */}
        <div className="form-group checkbox-group" style={{ marginBottom: formData.hasExistingLoans ? '15px' : '22px' }}>
          <label>
            <input
              type="checkbox"
              name="hasExistingLoans"
              checked={formData.hasExistingLoans}
              onChange={handleInputChange}
            />
            <strong>I have existing loans</strong>
          </label>
          <small className="help-text" style={{ display: 'block', marginTop: '5px', marginLeft: '24px' }}>
            Add any active loans you are currently paying EMI for (personal loans, car loans, home loans, etc.)
          </small>
        </div>

        {formData.hasExistingLoans && (
          <div className="existing-loans-section" style={{ marginBottom: '25px' }}>
            {formData.existingLoans.map((loan, index) => (
              <div key={loan.id} className="loan-item">
                <div className="loan-item-header">
                  <h4>Loan {index + 1}</h4>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => handleRemoveLoan(loan.id)}
                  >
                    ✕ Remove
                  </button>
                </div>

                <div className="loan-fields">
                  <div className="form-group">
                    <label>Loan Type <span className="required">*</span></label>
                    <select
                      value={loan.loanType || 'pl'}
                      onChange={(e) => handleLoanChange(loan.id, 'loanType', e.target.value)}
                      required
                      style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
                    >
                      <option value="pl">Personal Loan (PL)</option>
                      <option value="hl">Home Loan (HL)</option>
                      <option value="other">Any Other Loan</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Current Lender <span className="required">*</span></label>
                    <select
                      value={loan.lender}
                      onChange={(e) => handleLoanChange(loan.id, 'lender', e.target.value)}
                      required
                      style={{ color: '#111827', WebkitTextFillColor: '#111827', backgroundColor: '#ffffff', fontWeight: 600 }}
                    >
                      <option value="">-- Select Bank / NBFC --</option>
                      {LENDER_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Outstanding Amount (₹)</label>
                    <input
                      type="text"
                      value={loan.outstandingAmount}
                      onChange={(e) => handleLoanChange(loan.id, 'outstandingAmount', e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      placeholder="₹ 5,00,000"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                    />
                  </div>

                  <div className="form-group">
                    <label>Current Monthly EMI (₹)</label>
                    <input
                      type="text"
                      value={loan.monthlyEMI}
                      onChange={(e) => handleLoanChange(loan.id, 'monthlyEMI', e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      placeholder="₹ 15,000"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div style={{ marginBottom: '15px' }}>
              <button
                type="button"
                className="btn-add-loan"
                onClick={handleAddLoan}
              >
                + Add Another Loan
              </button>
            </div>

            {formData.existingLoans.length > 0 && (
              <div className="loans-summary">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <strong>Total Existing Loan EMI:</strong> ₹{formData.existingLoans
                      .reduce((sum, loan) => sum + (parseFloat(loan.monthlyEMI) || 0), 0)
                      .toLocaleString('en-IN')} / mo
                  </div>
                </div>

                {/* Show which banks will be excluded */}
                {formData.existingLoans.some(loan =>
                  loan.lender &&
                  loan.lender.trim() !== '' &&
                  loan.lender !== 'other'
                ) && (
                  <div style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '5px', borderLeft: '4px solid #ffc107' }}>
                    <strong>Bank Exclusions Detected:</strong>
                    <div style={{ marginTop: '5px', fontSize: '0.9em' }}>
                      {formData.existingLoans
                        .filter(loan =>
                          loan.lender &&
                          loan.lender.trim() !== '' &&
                          loan.lender !== 'other'
                        )
                        .map((loan, idx) => (
                          <div key={idx} style={{ color: '#856404' }}>
                            Exclusion: <strong style={{ textTransform: 'capitalize' }}>{loan.lender}</strong> - Active loan detected with this institution
                          </div>
                        ))
                      }
                      <div style={{ marginTop: '5px', fontSize: '0.85em', fontStyle: 'italic', color: '#666' }}>
                        These banks will not appear in your eligibility results.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. Active Credit Cards Second */}
        <div className="form-group checkbox-group" style={{ marginTop: '18px', marginBottom: formData.hasCreditCards ? '15px' : '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
          <label>
            <input
              type="checkbox"
              name="hasCreditCards"
              checked={formData.hasCreditCards}
              onChange={handleInputChange}
            />
            <strong>I have active credit cards</strong>
          </label>
          <small className="help-text" style={{ display: 'block', marginTop: '5px', marginLeft: '24px' }}>
            Add any active credit cards you currently hold and their outstanding balance
          </small>
        </div>

        {formData.hasCreditCards && (
          <div className="existing-credit-cards-section" style={{ marginBottom: '20px' }}>
            {(formData.creditCards || []).map((card, index) => (
              <div key={card.id} className="loan-item" style={{ borderLeft: '4px solid #0284c7' }}>
                <div className="loan-item-header">
                  <h4>💳 Credit Card {index + 1}</h4>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => handleRemoveCreditCard(card.id)}
                  >
                    ✕ Remove
                  </button>
                </div>

                <div className="loan-fields">
                  <div className="form-group">
                    <label>Card Issuer / Bank <span className="required">*</span></label>
                    <select
                      value={card.lender}
                      onChange={(e) => handleCreditCardChange(card.id, 'lender', e.target.value)}
                      required
                    >
                      <option value="">-- Select Bank / Card Issuer --</option>
                      {LENDER_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Credit Limit (₹)</label>
                    <input
                      type="text"
                      value={card.creditLimit}
                      onChange={(e) => handleCreditCardChange(card.id, 'creditLimit', e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      placeholder="₹ 2,00,000"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                    />
                  </div>

                  <div className="form-group">
                    <label>Credit Limit Used / Outstanding (₹)</label>
                    <input
                      type="text"
                      value={card.creditLimitUsed}
                      onChange={(e) => handleCreditCardChange(card.id, 'creditLimitUsed', e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      placeholder="₹ 50,000"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div style={{ marginBottom: '15px' }}>
              <button
                type="button"
                className="btn-add-loan"
                style={{ background: '#0284c7', color: '#fff', border: 'none' }}
                onClick={handleAddCreditCard}
              >
                + Add Another Credit Card
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Balance Transfer Section */}
      {
        mode === 'pl' &&
        ((formData.hasExistingLoans && formData.existingLoans.length > 0) ||
         (formData.hasCreditCards && formData.creditCards && formData.creditCards.length > 0)) && (
          <div className="form-section" style={{ background: '#f0f7ff', borderLeft: '4px solid #2196f3' }}>
            <h3>Balance Transfer Optimization</h3>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="wantsBT"
                  checked={formData.wantsBT}
                  onChange={handleInputChange}
                />
                <strong>Yes, I want to do Balance Transfer</strong>
              </label>
              <small className="help-text" style={{ display: 'block', marginTop: '5px', marginLeft: '24px' }}>
                Select which specific loans or credit cards you want to transfer to a new bank with better rates
              </small>
            </div>

            {formData.wantsBT && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '15px', color: '#1976d2' }}>Select Loans / Cards for Balance Transfer:</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formData.hasExistingLoans && formData.existingLoans.map((loan, index) => {
                    const isSelected = formData.selectedLoansForBT.includes(loan.id);
                    return (
                      <div
                        key={loan.id}
                        style={{
                          padding: '14px 16px',
                          background: isSelected ? '#F0F9FF' : '#FFFFFF',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #2196f3' : '2px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 2px 6px rgba(33, 150, 243, 0.15)' : 'none'
                        }}
                        onClick={() => handleBTToggle(loan.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleBTToggle(loan.id);
                            }}
                            style={{ marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontWeight: '700', fontSize: '1.02em', color: isSelected ? '#1E40AF' : '#334155' }}>
                                Loan {index + 1}
                              </span>
                              <span style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: isSelected ? '#DBEAFE' : '#F1F5F9',
                                color: isSelected ? '#1E40AF' : '#64748B'
                              }}>
                                {isSelected ? '✓ Selected for BT' : 'Click to Select'}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.9em', color: '#64748b' }}>
                              <div>🏦 <strong>Bank:</strong> <span style={{ textTransform: 'capitalize', color: '#1e293b' }}>{loan.lender || 'Not specified'}</span></div>
                              <div>💵 <strong>Outstanding:</strong> <span style={{ color: '#1e293b', fontWeight: 600 }}>₹{loan.outstandingAmount ? parseFloat(loan.outstandingAmount).toLocaleString('en-IN') : '0'}</span></div>
                              <div>💳 <strong>EMI:</strong> <span style={{ color: '#1e293b', fontWeight: 600 }}>₹{loan.monthlyEMI ? parseFloat(loan.monthlyEMI).toLocaleString('en-IN') : '0'}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {formData.hasCreditCards && formData.creditCards && formData.creditCards.map((card, index) => {
                    const isSelected = formData.selectedLoansForBT.includes(card.id);
                    return (
                      <div
                        key={card.id}
                        style={{
                          padding: '14px 16px',
                          background: isSelected ? '#F0FDF4' : '#FFFFFF',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #0284c7' : '2px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 2px 6px rgba(2, 132, 199, 0.15)' : 'none'
                        }}
                        onClick={() => handleBTToggle(card.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleBTToggle(card.id);
                            }}
                            style={{ marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontWeight: '700', fontSize: '1.02em', color: isSelected ? '#0369a1' : '#334155' }}>
                                💳 Credit Card {index + 1}
                              </span>
                              <span style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: isSelected ? '#CFFAFE' : '#F1F5F9',
                                color: isSelected ? '#0369a1' : '#64748B'
                              }}>
                                {isSelected ? '✓ Selected for BT' : 'Click to Select'}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.9em', color: '#64748b' }}>
                              <div>🏦 <strong>Bank:</strong> <span style={{ textTransform: 'capitalize', color: '#1e293b' }}>{card.lender || 'Not specified'}</span></div>
                              <div>💳 <strong>Credit Limit:</strong> <span style={{ color: '#1e293b', fontWeight: 600 }}>₹{card.creditLimit ? parseFloat(card.creditLimit).toLocaleString('en-IN') : '0'}</span></div>
                              <div>💵 <strong>Outstanding Used:</strong> <span style={{ color: '#1e293b', fontWeight: 600 }}>₹{card.creditLimitUsed ? parseFloat(card.creditLimitUsed).toLocaleString('en-IN') : '0'}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {formData.selectedLoansForBT.length > 0 && (
                  <div style={{ marginTop: '15px', padding: '15px', background: '#e8f5e9', borderRadius: '8px', borderLeft: '4px solid #4caf50' }}>
                    <strong>✅ Selected for BT:</strong> {formData.selectedLoansForBT.length} item(s)
                    <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
                      <strong>Total Monthly Loan EMI to Transfer:</strong> ₹{(formData.hasExistingLoans ? formData.existingLoans : [])
                        .filter(loan => formData.selectedLoansForBT.includes(loan.id))
                        .reduce((sum, loan) => sum + (parseFloat(loan.monthlyEMI) || 0), 0)
                        .toLocaleString('en-IN')}
                    </div>
                    <div style={{ marginTop: '5px', fontSize: '0.9em' }}>
                      <strong>Total Outstanding Balance to Transfer:</strong> ₹{(
                        (formData.hasExistingLoans ? formData.existingLoans : [])
                          .filter(loan => formData.selectedLoansForBT.includes(loan.id))
                          .reduce((sum, loan) => sum + (parseFloat(loan.outstandingAmount) || 0), 0) +
                        (formData.hasCreditCards && formData.creditCards ? formData.creditCards : [])
                          .filter(card => formData.selectedLoansForBT.includes(card.id))
                          .reduce((sum, card) => sum + (parseFloat(card.creditLimitUsed) || 0), 0)
                      ).toLocaleString('en-IN')}
                    </div>
                  </div>
                )}

                {formData.selectedLoansForBT.length === 0 && (
                  <div style={{
                    marginTop: '15px',
                    padding: '12px 16px',
                    background: '#FEF2F2',
                    borderRadius: '8px',
                    border: '1.5px solid #FCA5A5',
                    fontSize: '0.92em',
                    color: '#991B1B',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                    <div>
                      <strong>Action Required:</strong> Click on the specific loan(s) or credit card(s) above that you want to transfer. The button to check eligibility will unlock once at least 1 item is selected.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      }

      {/* Submit Button */}
      <div className="form-actions">
        {isBTSelectionPending && (
          <div style={{
            marginBottom: '14px',
            padding: '12px 18px',
            background: '#FEF2F2',
            border: '1.5px solid #F87171',
            borderRadius: '8px',
            color: '#B91C1C',
            fontSize: '0.92rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            textAlign: 'center'
          }}>
            <span>⚠️</span>
            <span>Please select at least 1 loan or credit card for Balance Transfer (or uncheck "Yes, I want to do Balance Transfer") to check eligibility.</span>
          </div>
        )}
        <button
          type="submit"
          className="btn-submit"
          disabled={loading || isBTSelectionPending}
          title={isBTSelectionPending ? 'Select at least one loan or credit card for BT, or uncheck Balance Transfer' : (mode === 'topup' ? 'Check Top-Up Loan Eligibility' : (mode === 'od' ? 'Check Overdraft (OD) Limit' : 'Generate Eligibility Report'))}
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontStyle: 'normal',
            fontWeight: 600,
            color: isBTSelectionPending ? '#64748b' : 'rgb(255, 255, 255)',
            fontSize: '18px',
            lineHeight: '24px',
            backgroundColor: isBTSelectionPending ? '#cbd5e1' : (mode === 'topup' ? '#1E40AF' : (mode === 'od' ? '#059669' : undefined)),
            cursor: isBTSelectionPending ? 'not-allowed' : 'pointer',
            opacity: isBTSelectionPending ? 0.75 : 1,
            boxShadow: isBTSelectionPending ? 'none' : (mode === 'topup' ? '0 10px 24px rgba(30, 64, 175, 0.3)' : (mode === 'od' ? '0 10px 24px rgba(5, 150, 105, 0.3)' : undefined)),
            transition: 'all 0.2s ease'
          }}
        >
          {loading 
            ? 'Processing Analysis...' 
            : (isBTSelectionPending 
                ? '⚠️ Select Loan / Card for BT to Proceed' 
                : (mode === 'topup'
                    ? 'Check Top-Up Loan Eligibility'
                    : (mode === 'od' ? 'Check Overdraft (OD) Limit' : 'Generate Eligibility Report')))}
        </button>
      </div>

      {/* Information Note */}
      <div className="form-note">
        <p><strong>100% Free & Transparent:</strong></p>
        <ul>
          <li>Zero credit bureau impact — soft eligibility check across 12+ partner banks</li>
          <li>Optimized loan tenure up to 7 years with instant rate comparisons</li>
          <li>Real-time bank policy matching for maximum loan sanction limits</li>
        </ul>
      </div>
    </form>
  );
};

export default CustomerLoanForm;
