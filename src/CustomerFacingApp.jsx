import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomerLoanForm from './components/CustomerLoanForm.jsx';
import CustomerResultsDisplay from './components/CustomerResultsDisplay.jsx';
import FuturisticLanding from './components/FuturisticLanding.jsx';
// import NeuralChatBot from './components/NeuralChatBot.jsx';
import { calculateLoanEligibility } from './services/realLoanService.js';
import { calculateBTWithCreditCards } from './services/btLoanService.js';
import { calculateTopUpEligibility } from './services/topUpService.js';
import { calculateODLimitEligibility } from './services/odLimitService.js';
import { saveLead } from './services/leadService.js';
import { aiPredictionService } from './services/aiPredictionService.js';
import { neuralExplainerService } from './services/neuralExplainerService.js';
import { syncAllBankConfigsFromCloud } from './services/bankConfigService.js';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import BlogHome from './components/BlogHome.jsx';
import BlogArticle from './components/BlogArticle.jsx';
import MainMasterPortal from './components/MainMasterPortal.jsx';
import AdminPortalApp from './AdminPortalApp.jsx';
import './CustomerFacingApp.css';
import { useLocation } from 'react-router-dom';

function CustomerFacingApp() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [savedFormData, setSavedFormData] = useState(() => {
    try {
      const cached = localStorage.getItem('laxmi_last_form_data');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Initialize AI Brain & Sync Bank Policies from Cloud Firestore
  React.useEffect(() => {
    aiPredictionService.initialize();
    syncAllBankConfigsFromCloud();
  }, []);
  // Store raw formData so saveLead can access name/mobile/loans
  const lastFormDataRef = useRef(null);

  const handleFormSubmit = async (submissionData, rawFormData) => {
    setLoading(true);
    setError(null);
    setResults(null);

    const currentMode = 
      submissionData?.mode || 
      submissionData?.productMode || 
      rawFormData?.mode || 
      rawFormData?.productMode || 
      (location.pathname === '/top-up-loan' ? 'topup' : (location.pathname === '/od-limit' ? 'od' : 'pl'));

    const hasActiveLoans = Boolean(submissionData?.hasExistingLoans ?? rawFormData?.hasExistingLoans);
    const hasActiveCards = Boolean(submissionData?.hasCreditCards ?? rawFormData?.hasCreditCards);

    // Form unified reliable customer data object
    const combinedData = {
      ...(rawFormData || {}),
      ...(submissionData || {}),
      ...(submissionData?._metadata || {}),
      mode: currentMode,
      productMode: currentMode,
      customerName: rawFormData?.customerName || submissionData?.customerName || submissionData?._metadata?.customerName || 'Customer',
      mobileNumber: rawFormData?.mobileNumber || submissionData?.mobileNumber || submissionData?._metadata?.mobileNumber || '',
      companyName: rawFormData?.companyName || submissionData?.companyName || submissionData?._metadata?.companyName || 'LaxmiCredit',
      category: rawFormData?.category || submissionData?.category || submissionData?._metadata?.category || 'B',
      basicSalary: rawFormData?.basicSalary || submissionData?.basicSalary || 0,
      age: rawFormData?.age || submissionData?.age || '',
      city: rawFormData?.city || submissionData?.city || '',
      state: rawFormData?.state || submissionData?.state || '',
      maritalStatus: rawFormData?.maritalStatus || submissionData?.maritalStatus || '',
      livingStatus: rawFormData?.livingStatus || submissionData?.livingStatus || '',
      salaryMode: rawFormData?.salaryMode || submissionData?.salaryMode || 'bank',
      hasPpfDeduction: rawFormData?.hasPpfDeduction !== undefined ? rawFormData.hasPpfDeduction : (submissionData?.hasPpfDeduction !== undefined ? submissionData.hasPpfDeduction : true),
      hasPfDeduction: rawFormData?.hasPfDeduction !== undefined ? rawFormData.hasPfDeduction : (submissionData?.hasPfDeduction !== undefined ? submissionData.hasPfDeduction : true),
      hasExistingLoans: hasActiveLoans,
      hasCreditCards: hasActiveCards,
      existingLoans: hasActiveLoans ? (submissionData?.existingLoans || rawFormData?.existingLoans || []).filter(l => (parseFloat(l?.monthlyEMI) > 0 || parseFloat(l?.emi) > 0 || parseFloat(l?.outstandingAmount) > 0)) : [],
      creditCards: hasActiveCards ? (submissionData?.creditCards || rawFormData?.creditCards || []).filter(c => (parseFloat(c?.creditLimitUsed) > 0 || parseFloat(c?.creditLimit) > 0 || parseFloat(c?.outstandingAmount) > 0)) : [],
      existingEMI: submissionData?.existingEMI ?? rawFormData?.existingEMI ?? 0,
      isBTMode: Boolean(submissionData?.wantsBT && ((submissionData?.loansForBT && submissionData.loansForBT.length > 0) || (submissionData?.existingLoans && submissionData.existingLoans.length > 0))),
      wantsBT: Boolean(submissionData?.wantsBT),
      loansForBT: (submissionData?.loansForBT && submissionData.loansForBT.length > 0) 
        ? submissionData.loansForBT 
        : (submissionData?.wantsBT && submissionData?.existingLoans ? submissionData.existingLoans : [])
    };

    setSavedFormData(combinedData);
    lastFormDataRef.current = combinedData;
    try {
      localStorage.setItem('laxmi_last_form_data', JSON.stringify(combinedData));
    } catch (e) {}

    // Save lead into database immediately in background (non-blocking for instant calculation)
    try {
      saveLead(combinedData, submissionData).catch(saveErr => console.warn('Non-blocking lead save notice:', saveErr));
    } catch (saveErr) {
      console.warn('Non-blocking lead save notice:', saveErr);
    }

    try {
      console.log('='.repeat(80));
      console.log('🚀 STARTING LOAN CALCULATION');
      console.log('='.repeat(80));
      console.log('📋 Input Data:', submissionData);
      console.log('⏱️  Start Time:', new Date().toLocaleTimeString());
      const startTime = performance.now();

      let calculationResults;

      const hasLoansForBT = Boolean(
        submissionData.wantsBT && (
          (submissionData.loansForBT && submissionData.loansForBT.length > 0) ||
          (submissionData.existingLoans && submissionData.existingLoans.length > 0) ||
          (submissionData.creditCards && submissionData.creditCards.length > 0)
        )
      );

      const effectiveBtLoans = (submissionData.loansForBT && submissionData.loansForBT.length > 0)
        ? submissionData.loansForBT
        : [
            ...(submissionData.existingLoans || []).map(l => ({ ...l, type: l.loanType === 'hl' ? 'Home Loan' : 'Personal Loan' })),
            ...(submissionData.creditCards || []).map(c => ({ ...c, type: 'Credit Card', outstandingAmount: parseFloat(c.creditLimitUsed || 0) }))
          ];

      if (currentMode === 'topup') {
        console.log('⚡ TOP-UP LOAN CALCULATION');
        calculationResults = await calculateTopUpEligibility(submissionData);
      } else if (currentMode === 'od') {
        console.log('⚡ OVERDRAFT (OD) LIMIT CALCULATION (5 PARTNER BANKS ONLY)');
        const odBtSubmission = (hasLoansForBT && effectiveBtLoans.length > 0)
          ? {
              ...submissionData,
              isBTMode: true,
              wantsBT: true,
              loansForBT: effectiveBtLoans,
              selectedLoansForBT: effectiveBtLoans
            }
          : submissionData;
        calculationResults = await calculateODLimitEligibility(odBtSubmission);
      } else if (currentMode === 'pl' && hasLoansForBT && effectiveBtLoans.length > 0) {
        console.log('🔄 BT MODE DETECTED!');
        const fullBtSubmission = {
          ...submissionData,
          isBTMode: true,
          wantsBT: true,
          loansForBT: effectiveBtLoans,
          selectedLoansForBT: effectiveBtLoans
        };
        calculationResults = await calculateLoanEligibility(fullBtSubmission);
      } else {
        console.log('💰 REGULAR LOAN CALCULATION');
        calculationResults = await calculateLoanEligibility(submissionData);
      }

      const endTime = performance.now();
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`⏱️  TOTAL TIME TAKEN: ${timeTaken} seconds`);
      console.log('📊 Results from', calculationResults.length, 'banks');
      console.log('='.repeat(80));

      setResults(calculationResults);
      setMetadata(combinedData);

      // Save/update lead in Cloud Firestore & LocalStorage in background (non-blocking)
      try {
        const approvedBanks = (calculationResults || [])
          .filter(r => r && r.eligible)
          .map(r => r.bankName);
        saveLead(combinedData, submissionData, approvedBanks).catch(err => console.warn('Lead background update:', err));
      } catch (postSaveErr) {
        console.warn('Post-calculation lead update notice:', postSaveErr);
      }

      try {
        window.history.pushState({ view: 'results' }, '', window.location.href);
      } catch (e) {}

      // --- 🧠 AI NEURAL PREDICTION (SAFE WRAPPER) ---
      try {
        if (!hasLoansForBT && currentMode === 'pl') {
          const salary = parseFloat(submissionData.basicSalary) || parseFloat(submissionData.monthlyIncome) || 0;
          const score = parseInt(submissionData.creditScore) || 700;
          const tenure = parseInt(submissionData.loanTenure) || 5;
          
          const aiPrediction = aiPredictionService.predict(salary, score, tenure);
          if (aiPrediction) {
            setAiResult(aiPrediction);
            const insight = neuralExplainerService.generateInsight(aiPrediction, calculationResults, submissionData);
            setAiInsight(insight);
            console.log('🔮 AI Neural Insights generated successfully.');
          }
        }
      } catch (aiErr) {
        console.warn('⚠️ AI Prediction failed, but calculator is fine:', aiErr);
      }

      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    } catch (err) {
      console.error('❌ ERROR:', err);
      setError('Failed to calculate loan eligibility. Please try again. Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewCalculation = () => {
    setResults(null);
    setMetadata(null);
    setError(null);
    setAiResult(null);
    setAiInsight(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGetStarted = () => {
    setShowForm(true);
    // Scroll to top so the form page starts from the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHomeClick = () => {
    setShowForm(false);
    setResults(null);
    setMetadata(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const location = useLocation();
  const navigate = useNavigate();
  const isMasterPortal = location.pathname === '/';

  // Automatically scroll to top and open application form directly when visiting loan routes
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (['/personal-loan', '/top-up-loan', '/od-limit'].includes(location.pathname)) {
      setShowForm(true);
      setResults(null);
      setError(null);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }, 50);
    } else if (location.pathname === '/') {
      setShowForm(false);
      setResults(null);
    }
  }, [location.pathname]);

  // Handle browser BACK button (from Results to Form)
  React.useEffect(() => {
    const handlePopState = () => {
      if (results) {
        setResults(null);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [results, navigate]);

  const renderProductPage = (mode) => (
    <>
      {/* PAGE 1: Application Form */}
      {(showForm || !results) && !results && (
        <div
          className="form-page"
          style={{ animation: 'formFadeIn 0.35s ease-out forwards' }}
        >
          {/* Unified Single Platform Form */}
          <CustomerLoanForm 
            mode={mode}
            onSubmit={handleFormSubmit} 
            loading={loading} 
            initialData={savedFormData}
            onBackToHome={() => { setShowForm(false); setResults(null); navigate('/'); window.scrollTo({ top: 0 }); }} 
          />

          {/* Error */}
          {error && (
            <div className="error-container">
              <div className="error-message">⚠️ {error}</div>
              <button onClick={() => setError(null)} className="btn-retry">Try Again</button>
            </div>
          )}
        </div>
      )}

      {/* PAGE 3: Results */}
      {results && (
        <div id="results-section">
          <CustomerResultsDisplay
            results={results}
            metadata={metadata}
            aiResult={aiResult}
            aiInsight={aiInsight}
            onNewCalculation={handleNewCalculation}
          />
        </div>
      )}
    </>
  );

  return (
    <div className="customer-facing-app">
      {!isMasterPortal && <Navbar onHomeClick={handleHomeClick} />}
      {/* <NeuralChatBot aiResult={aiResult} aiInsight={aiInsight} userData={lastFormDataRef.current} /> */}

      <Routes>
        <Route path="/" element={<MainMasterPortal />} />
        <Route path="/personal-loan" element={renderProductPage('pl')} />
        <Route path="/top-up-loan" element={renderProductPage('topup')} />
        <Route path="/od-limit" element={renderProductPage('od')} />
        <Route path="/blog" element={<BlogHome />} />
        <Route path="/blog/:slug" element={<BlogArticle />} />
        <Route path="/admin/*" element={<AdminPortalApp />} />
        <Route path="/dashboard/*" element={<AdminPortalApp />} />
      </Routes>

    </div>
  );
}

export default CustomerFacingApp;
