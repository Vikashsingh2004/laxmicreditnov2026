import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import './CustomerResultsDisplay.css';
import { saveSelectedBanks } from '../services/leadService.js';

const CustomerResultsDisplay = ({ results, metadata, aiResult, aiInsight, onNewCalculation }) => {
  const [sortBy, setSortBy] = useState('loanAmount');
  const [filterEligible, setFilterEligible] = useState('all');
  const [selectedBanks, setSelectedBanks] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'error'
  const [expandedBank, setExpandedBank] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!results || results.length === 0) {
    return (
      <div className="no-results-state">
        <h2>No Results to Display</h2>
        <p>Please re-run the calculation with valid data.</p>
        <button onClick={onNewCalculation} className="btn-primary">Try Again</button>
      </div>
    );
  }

  // Handle bank selection
  const handleBankSelect = (bankName, isEligible) => {
    if (!isEligible) return; // Don't allow selecting rejected banks

    if (selectedBanks.includes(bankName)) {
      setSelectedBanks(selectedBanks.filter(name => name !== bankName));
    } else {
      setSelectedBanks([...selectedBanks, bankName]);
    }
  };

  // Handle submit — sends selection to Google Sheets
  const handleSubmitSelection = async () => {
    if (selectedBanks.length === 0) {
      setSubmitStatus('noselect');
      return;
    }
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      await saveSelectedBanks(metadata, selectedBanks);
      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  // Separate eligible and rejected banks
  const eligibleBanks = results.filter(r => r.eligible);
  const rejectedBanks = results.filter(r => !r.eligible);

  const isTopUpMode = Boolean(metadata?.productMode === 'topup' || results?.some(r => r.isTopUp));
  const isODMode = Boolean(metadata?.productMode === 'od' || results?.some(r => r.isOD));
  const isODBT = Boolean(
    isODMode && (
      metadata?.wantsBT || 
      metadata?.isBTMode || 
      (Array.isArray(metadata?.loansForBT) && metadata.loansForBT.length > 0) ||
      results?.some(r => r.isODBT)
    )
  );

  // Sort eligible banks
  const sortedEligibleBanks = [...eligibleBanks].sort((a, b) => {
    if (sortBy === 'loanAmount') {
      return (b.loanAmount || 0) - (a.loanAmount || 0);
    } else if (sortBy === 'emi') {
      return (a.monthlyEMI || 0) - (b.monthlyEMI || 0);
    } else if (sortBy === 'roi') {
      return (a.interestRate || 0) - (b.interestRate || 0);
    } else {
      return a.bankName.localeCompare(b.bankName);
    }
  });

  // Get best offer
  const bestOffer = sortedEligibleBanks.length > 0 ? sortedEligibleBanks[0] : null;

  // Calculate statistics
  const stats = {
    totalBanks: results.length,
    eligibleCount: eligibleBanks.length,
    rejectedCount: rejectedBanks.length,
    avgLoanAmount: eligibleBanks.length > 0
      ? Math.round(eligibleBanks.reduce((sum, b) => sum + (b.loanAmount || 0), 0) / eligibleBanks.length)
      : 0
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    const lakhs = (amount / 100000).toFixed(2);
    return `₹${lakhs}L`;
  };

  const formatNumber = (num) => {
    if (!num) return 'N/A';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const generateCustomerSummaryHtml = () => {
    const applicantName = metadata?.customerName || metadata?.name || 'Valued Customer';
    const mobileNumber = metadata?.mobileNumber || 'N/A';
    const ageText = metadata?.age ? `${metadata.age} Yrs` : 'N/A';
    const maritalText = metadata?.maritalStatus 
      ? (metadata.maritalStatus.charAt(0).toUpperCase() + metadata.maritalStatus.slice(1)) 
      : 'N/A';
    
    // Location & Living Status
    const locationParts = [metadata?.city, metadata?.state].filter(Boolean);
    const locationText = locationParts.length > 0 ? locationParts.join(', ') : 'India';
    const livingText = metadata?.livingStatus 
      ? (metadata.livingStatus.charAt(0).toUpperCase() + metadata.livingStatus.slice(1)) 
      : 'Owned/Rented';

    // Employment
    const companyName = metadata?.companyName || results?.find(r => r.companyName)?.companyName || 'LaxmiCredit';
    const employmentText = metadata?.employmentType 
      ? (metadata.employmentType === 'government' ? 'Government Employee' : 'Salaried Professional')
      : 'Salaried Professional';
    const categoryTier = results?.find(r => r.category)?.category || metadata?.category || 'Category B';

    // Income
    const rawSalary = parseFloat(metadata?.basicSalary) || parseFloat(metadata?.monthlyIncome) || 0;
    const salaryText = rawSalary > 0 ? `₹${rawSalary.toLocaleString('en-IN')}` : 'N/A';
    const salaryModeText = metadata?.salaryMode 
      ? (metadata.salaryMode === 'bank' ? 'Bank Credit' : metadata.salaryMode.toUpperCase()) 
      : 'Bank Credit';

    // Existing Obligations & Liabilities (Strictly filter genuine active obligations)
    const validLoans = (metadata?.hasExistingLoans !== false && Array.isArray(metadata?.existingLoans))
      ? metadata.existingLoans.filter(l => (
          (parseFloat(l?.monthlyEMI) > 0 || parseFloat(l?.emi) > 0 || parseFloat(l?.outstandingAmount) > 0)
        ))
      : [];

    const validCards = (Boolean(metadata?.hasCreditCards) && Array.isArray(metadata?.creditCards))
      ? metadata.creditCards.filter(c => (
          (parseFloat(c?.creditLimitUsed) > 0 || parseFloat(c?.creditLimit) > 0 || parseFloat(c?.outstandingAmount) > 0)
        ))
      : [];

    const loansEmiTotal = validLoans.reduce((sum, loan) => {
      const emiVal = parseFloat(loan?.monthlyEMI) || parseFloat(loan?.emi) || 0;
      return sum + emiVal;
    }, 0);

    const cardsObligationTotal = validCards.reduce((sum, card) => {
      const used = parseFloat(card?.creditLimitUsed || card?.outstandingAmount || 0);
      return sum + (used * 0.05);
    }, 0);

    const totalObligation = (loansEmiTotal + cardsObligationTotal) > 0 
      ? (loansEmiTotal + cardsObligationTotal)
      : (parseFloat(metadata?.existingEMI) || 0);

    const totalActiveCount = validLoans.length + validCards.length;

    let obligationsDetailText = '';
    if (validLoans.length > 0 && validCards.length > 0) {
      obligationsDetailText = `${totalActiveCount} Active (${validLoans.length} Loan${validLoans.length > 1 ? 's' : ''}, ${validCards.length} Card${validCards.length > 1 ? 's' : ''})`;
    } else if (validLoans.length > 0) {
      obligationsDetailText = `${validLoans.length} Active Loan${validLoans.length > 1 ? 's' : ''}`;
    } else if (validCards.length > 0) {
      obligationsDetailText = `${validCards.length} Active Card${validCards.length > 1 ? 's' : ''}`;
    } else if (totalObligation > 0) {
      obligationsDetailText = `1 Active Obligation`;
    }

    const existingLoansText = totalObligation > 0 
      ? `₹${Math.round(totalObligation).toLocaleString('en-IN')}/mo (${obligationsDetailText})`
      : 'Zero Active Loans (Nil EMI)';

    // Balance Transfer Mode Indicator (Strictly Personal Loan Mode Only)
    const isReportBT = Boolean(
      !isTopUpMode && !isODMode && (
        metadata?.isBTMode || 
        metadata?.wantsBT || 
        (Array.isArray(metadata?.loansForBT) && metadata.loansForBT.length > 0) ||
        results?.some(b => b.isBTMode || (b.totalDebtCleared && b.totalDebtCleared > 0))
      )
    );

    // CIBIL Profile Info
    const isCibilMinus1 = metadata?.creditScore === -1 || metadata?.creditScore === '-1' || metadata?.cibilScore === -1 || metadata?.cibilScore === '-1' || metadata?.isNewToCredit;
    const reportedCibil = metadata?.cibilScore ?? metadata?.creditScore ?? 750;

    const reportDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const approvalRate = Math.round((stats.eligibleCount / stats.totalBanks) * 100);

    const formatLakhs = (amt) => amt ? `₹${(amt / 100000).toFixed(2)}L` : 'N/A';
    const formatInr = (amt) => amt ? `₹${amt.toLocaleString('en-IN')}` : 'N/A';

    // Safe retrieval of interest rate and tenure
    const bestRoi = bestOffer ? (bestOffer.interestRate ?? bestOffer.roi ?? 10.5) : 10.5;
    const bestTenure = bestOffer ? (bestOffer.loanTenure ?? bestOffer.tenure ?? 5) : 5;

    const rowsHtml = sortedEligibleBanks.map((b, idx) => {
      const bankRoi = b.interestRate ?? b.roi ?? 10.5;
      const bankTenure = b.loanTenure ?? b.tenure ?? 5;

      if (isTopUpMode) {
        return `
        <tr style="background: ${b === bestOffer ? '#EFF6FF' : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 6px 10px; font-weight: 700; color: rgb(66, 66, 66); font-size: 11.5px;">
            ${b.bankName} ${b === bestOffer ? '<span style="color: #0284C7; font-size: 10px; margin-left: 4px; font-weight: 800;">★ Top-Up Choice</span>' : ''}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #475569; font-size: 11.5px;">
            ${formatLakhs(b.totalCapacity)}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #DC2626; font-size: 11.5px;">
            -₹${Number(b.runningLoanOutstanding || 0).toLocaleString('en-IN')}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; color: #0284C7; font-size: 12.5px;">
            +${formatLakhs(b.topUpAmount || b.loanAmount)}
          </td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 600; color: rgb(66, 66, 66); font-size: 11.5px;">
            ${bankRoi}%
          </td>
          <td style="padding: 6px 10px; text-align: center;">
            <span style="background: #EFF6FF; color: #0284C7; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; border: 1px solid #BAE6FD;">
              Top-Up Ready
            </span>
          </td>
        </tr>
      `;
      }

      if (isODMode && isODBT) {
        return `
        <tr style="background: ${b === bestOffer ? '#ECFDF5' : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 6px 10px; font-weight: 700; color: rgb(66, 66, 66); font-size: 11.5px;">
            ${b.bankName} ${b === bestOffer ? '<span style="color: #059669; font-size: 10px; margin-left: 4px; font-weight: 800;">★ Best OD Takeover</span>' : ''}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; color: #059669; font-size: 12px;">
            ${formatLakhs(b.totalSanctionedLimit || b.odLimit)}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #DC2626; font-size: 11.5px;">
            -₹${Number(b.debtClearedPOS || b.utilizedODLimit || 0).toLocaleString('en-IN')}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; color: #0284C7; font-size: 12px;">
            ${formatLakhs(b.availableODLimit)}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 750; color: #0D9488; font-size: 11.5px;">
            ₹${Number(b.monthlyInterestOnUsed || 0).toLocaleString('en-IN')}/mo
          </td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 600; color: rgb(66, 66, 66); font-size: 11.5px;">
            ${bankRoi}%
          </td>
          <td style="padding: 6px 10px; text-align: center;">
            <span style="background: #ECFDF5; color: #059669; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; border: 1px solid #6EE7B7;">
              OD Takeover
            </span>
          </td>
        </tr>
      `;
      }

      if (isODMode) {
        return `
        <tr style="background: ${b === bestOffer ? '#ECFDF5' : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 6px 10px; font-weight: 700; color: rgb(66, 66, 66); font-size: 11.5px;">
            ${b.bankName} ${b === bestOffer ? '<span style="color: #059669; font-size: 10px; margin-left: 4px; font-weight: 800;">★ Best OD Rate</span>' : ''}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; color: #059669; font-size: 12.5px;">
            ${formatLakhs(b.odLimit || b.loanAmount)}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #0D9488; font-size: 11.5px;">
            ₹${b.dailyInterestPerLakh || Math.round((100000 * (bankRoi / 100)) / 365)}/day
          </td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 600; color: rgb(66, 66, 66); font-size: 11.5px;">
            ${bankRoi}%
          </td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 600; color: #64748B; font-size: 11px;">
            Flexi Credit Line
          </td>
          <td style="padding: 6px 10px; text-align: center;">
            <span style="background: #ECFDF5; color: #059669; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; border: 1px solid #6EE7B7;">
              OD Pre-Approved
            </span>
          </td>
        </tr>
      `;
      }

      if (isReportBT) {
        return `
        <tr style="background: ${b === bestOffer ? '#FFF7ED' : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 6px 10px; font-weight: 700; color: rgb(66, 66, 66); font-size: 11.5px;">
            ${b.bankName} ${b === bestOffer ? '<span style="color: #F58220; font-size: 10px; margin-left: 4px; font-weight: 800;">★ Top Pick</span>' : ''}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; color: #1E40AF; font-size: 12px;">
            ${formatInr(b.loanAmount)}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #DC2626; font-size: 11.5px;">
            -₹${Number(b.totalDebtCleared || b.btTotalOutstanding || 0).toLocaleString('en-IN')}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; color: #16A34A; font-size: 12px;">
            +₹${Number(b.freshAmountDisbursed || 0).toLocaleString('en-IN')}
          </td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 600; color: rgb(66, 66, 66); font-size: 11.5px;">
            ${bankRoi}%
          </td>
          <td style="padding: 6px 10px; text-align: center;">
            <span style="background: #ECFDF5; color: #15803D; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; border: 1px solid #A7F3D0;">
              Consolidated
            </span>
          </td>
        </tr>
      `;
      }
      return `
        <tr style="background: ${b === bestOffer ? '#FFF7ED' : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 6px 10px; font-weight: 700; color: rgb(66, 66, 66); font-size: 11.5px;">
            ${b.bankName} ${b === bestOffer ? '<span style="color: #F58220; font-size: 10px; margin-left: 4px; font-weight: 800;">★ Top Pick</span>' : ''}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; color: #F58220; font-size: 12.5px;">
            ${formatLakhs(b.loanAmount)}
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 750; color: #1E40AF; font-size: 12px;">
            ${formatInr(b.monthlyEMI)}
          </td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 600; color: rgb(66, 66, 66); font-size: 11.5px;">
            ${bankRoi}%
          </td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 600; color: rgb(66, 66, 66); font-size: 11.5px;">
            ${bankTenure} Years
          </td>
          <td style="padding: 6px 10px; text-align: center;">
            <span style="background: #ECFDF5; color: #15803D; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; border: 1px solid #A7F3D0;">
              Pre-Approved
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="width: 760px; padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: rgb(66, 66, 66); background: #ffffff; box-sizing: border-box;">
        
        <!-- PAGE 1: EXECUTIVE ASSESSMENT SUMMARY & COMPARATIVE OFFERS TABLE -->
        <div style="min-height: 940px; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; break-after: always; box-sizing: border-box;">
          <div>
            <!-- Header with Branding -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #F58220; padding-bottom: 10px; margin-bottom: 14px;">
              <div>
                <div style="font-size: 22px; font-weight: 800; color: #1E40AF; letter-spacing: -0.5px;">
                  Laxmi <span style="color: #F58220;">Credit</span>
                </div>
                <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">
                  LaxmiCredit • Multi-Bank Institutional Lending Engine
                </div>
              </div>
              <div style="text-align: right;">
                <span style="background: #EEF3FA; color: #1E40AF; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; border: 1px solid #BFDBFE; display: inline-block; margin-bottom: 3px;">
                  🛡️ Zero CIBIL Score Impact
                </span>
                <div style="font-size: 11px; color: #64748b;">
                  Assessment Date: ${reportDate}
                </div>
              </div>
            </div>

            <!-- Title -->
            <div style="text-align: center; margin-bottom: 14px;">
              <h1 style="font-size: 22px; font-weight: 800; color: rgb(66, 66, 66); margin: 0 0 3px 0;">
                ${isTopUpMode 
                  ? 'Existing Loan <span style="color: #0284C7;">Top-Up Sanction Report</span>' 
                  : (isODMode && isODBT)
                    ? 'Overdraft (OD) <span style="color: #059669;">Balance Transfer & Takeover Assessment</span>'
                    : isODMode 
                      ? 'Pre-Approved <span style="color: #059669;">Overdraft (OD) Facility Assessment</span>' 
                      : isReportBT 
                        ? 'Personal Loan <span style="color: #F58220;">Balance Transfer & Consolidation</span>' 
                        : 'Personal Loan <span style="color: #F58220;">Eligibility Summary</span>'}
              </h1>
              <p style="font-size: 12.5px; color: #64748b; margin: 0;">
                ${isTopUpMode 
                  ? `Verified institutional top-up disbursal evaluation across ${results.length} active running loan(s)` 
                  : (isODMode && isODBT)
                    ? `Verified institutional overdraft loan takeover and debt clearance across 5 leading partner institutions`
                    : isODMode 
                      ? `Verified institutional overdraft limits across 5 leading partner institutions` 
                      : isReportBT 
                        ? `Verified institutional balance transfer & debt consolidation evaluation across ${results.length} leading partner institutions` 
                        : `Verified institutional evaluation across ${results.length} leading partner banking institutions`}
              </p>
            </div>

            <!-- Customer Application Details (Complete Profile Form Data) -->
            <div style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #E2E8F0; padding-bottom: 4px;">
                <div style="font-size: 10.5px; font-weight: 800; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.5px;">
                  📋 Verified Customer Application Information
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <span style="font-size: 9.5px; color: ${isCibilMinus1 ? '#6D28D9' : '#1E40AF'}; font-weight: 700; background: ${isCibilMinus1 ? '#F5F3FF' : '#EFF6FF'}; padding: 2px 7px; border-radius: 8px; border: 1px solid ${isCibilMinus1 ? '#DDD6FE' : '#BFDBFE'};">
                    ${isCibilMinus1 ? '★ New to Credit (-1)' : `CIBIL: ${reportedCibil}`}
                  </span>
                  <span style="font-size: 9.5px; color: #15803D; font-weight: 700; background: #ECFDF5; padding: 2px 7px; border-radius: 8px; border: 1px solid #A7F3D0;">
                    ✓ Form Verified
                  </span>
                </div>
              </div>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 25%; vertical-align: top; padding: 2px 5px 4px 0;">
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600;">Applicant Name</div>
                    <div style="font-size: 12px; font-weight: 750; color: rgb(66, 66, 66); margin-top: 1px;">${applicantName}</div>
                  </td>
                  <td style="width: 25%; vertical-align: top; padding: 2px 5px 4px 0;">
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600;">Mobile Number</div>
                    <div style="font-size: 12px; font-weight: 750; color: rgb(66, 66, 66); margin-top: 1px;">${mobileNumber}</div>
                  </td>
                  <td style="width: 25%; vertical-align: top; padding: 2px 5px 4px 0;">
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600;">Age & Marital Status</div>
                    <div style="font-size: 12px; font-weight: 750; color: rgb(66, 66, 66); margin-top: 1px;">${ageText} • ${maritalText}</div>
                  </td>
                  <td style="width: 25%; vertical-align: top; padding: 2px 0 4px 0;">
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600;">Location & Residence</div>
                    <div style="font-size: 12px; font-weight: 750; color: rgb(66, 66, 66); margin-top: 1px;">${locationText} (${livingText})</div>
                  </td>
                </tr>
                <tr>
                  <td style="width: 25%; vertical-align: top; padding: 4px 5px 2px 0; border-top: 1px dashed #E2E8F0;">
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600;">Employer Organization</div>
                    <div style="font-size: 12px; font-weight: 750; color: rgb(66, 66, 66); margin-top: 1px;">${companyName}</div>
                  </td>
                  <td style="width: 25%; vertical-align: top; padding: 4px 5px 2px 0; border-top: 1px dashed #E2E8F0;">
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600;">Employment & Tier</div>
                    <div style="font-size: 12px; font-weight: 750; color: rgb(66, 66, 66); margin-top: 1px;">${employmentText} (${categoryTier})</div>
                  </td>
                  <td style="width: 25%; vertical-align: top; padding: 4px 5px 2px 0; border-top: 1px dashed #E2E8F0;">
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600;">Net Monthly Salary</div>
                    <div style="font-size: 12px; font-weight: 750; color: #1E40AF; margin-top: 1px;">${salaryText} <span style="font-size: 9px; font-weight: normal; color: #64748b;">(${salaryModeText})</span></div>
                  </td>
                  <td style="width: 25%; vertical-align: top; padding: 4px 0 2px 0; border-top: 1px dashed #E2E8F0;">
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600;">Active Loan Obligations</div>
                    <div style="font-size: 12px; font-weight: 750; color: rgb(66, 66, 66); margin-top: 1px;">${existingLoansText}</div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Comparison Table on Page 1 -->
            <div style="font-size: 14px; font-weight: 800; color: rgb(66, 66, 66); margin: 12px 0 8px 0;">
              ${isTopUpMode 
                ? 'Existing Loan <span style="color: #0284C7;">Top-Up Assessment (Total Capacity minus Running Loan)</span>' 
                : (isODMode && isODBT)
                  ? 'Institutional <span style="color: #059669;">Overdraft Balance Transfer (OD Takeover & Remaining Limit)</span>'
                  : isODMode 
                    ? 'Institutional <span style="color: #059669;">Overdraft (OD) Limits (5 Partners)</span>' 
                    : isReportBT 
                      ? 'Consolidated <span style="color: #F58220;">Balance Transfer Offers Comparison</span>' 
                      : 'Pre-Approved <span style="color: #F58220;">Bank Offers Comparison</span>'}
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
              <thead>
                ${isTopUpMode ? `
                <tr style="background: linear-gradient(135deg, #0284C7 0%, #1E40AF 100%); color: #ffffff;">
                  <th style="padding: 7px 10px; text-align: left; font-size: 10.5px; font-weight: 700; border-radius: 4px 0 0 0;">Lending Bank</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Total Capacity (E)</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Running Loan (L)</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Net Top-Up Cash</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700;">ROI</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700; border-radius: 0 4px 0 0;">Status</th>
                </tr>
                ` : (isODMode && isODBT) ? `
                <tr style="background: linear-gradient(135deg, #059669 0%, #0D9488 100%); color: #ffffff;">
                  <th style="padding: 7px 10px; text-align: left; font-size: 10.5px; font-weight: 700; border-radius: 4px 0 0 0;">Lending Institution</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Total OD Limit</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Debt Cleared (POS)</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Available Limit</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Used Limit Interest</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700;">OD ROI</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700; border-radius: 0 4px 0 0;">Status</th>
                </tr>
                ` : isODMode ? `
                <tr style="background: linear-gradient(135deg, #059669 0%, #0D9488 100%); color: #ffffff;">
                  <th style="padding: 7px 10px; text-align: left; font-size: 10.5px; font-weight: 700; border-radius: 4px 0 0 0;">Lending Institution</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Sanctioned OD Limit</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Daily Cost (1L)</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700;">ROI</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700;">Facility</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700; border-radius: 0 4px 0 0;">Status</th>
                </tr>
                ` : isReportBT ? `
                <tr style="background: linear-gradient(135deg, #1E40AF 0%, #2563EB 60%, #F58220 100%); color: #ffffff;">
                  <th style="padding: 7px 10px; text-align: left; font-size: 10.5px; font-weight: 700; border-radius: 4px 0 0 0;">Lending Institution</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Total Sanction</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Debt Cleared</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Net Disbursed</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700;">ROI</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700; border-radius: 0 4px 0 0;">Status</th>
                </tr>
                ` : `
                <tr style="background: linear-gradient(135deg, #1E40AF 0%, #2563EB 60%, #F58220 100%); color: #ffffff;">
                  <th style="padding: 7px 10px; text-align: left; font-size: 10.5px; font-weight: 700; border-radius: 4px 0 0 0;">Lending Institution</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Loan Sanction</th>
                  <th style="padding: 7px 10px; text-align: right; font-size: 10.5px; font-weight: 700;">Monthly EMI</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700;">ROI</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700;">Tenure</th>
                  <th style="padding: 7px 10px; text-align: center; font-size: 10.5px; font-weight: 700; border-radius: 0 4px 0 0;">Status</th>
                </tr>
                `}
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            ${rejectedBanks.length > 0 ? `
              <div style="margin-top: 10px; padding: 8px 12px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 9.5px; color: #991B1B; line-height: 1.4;">
                <strong>✕ Not Allowed / Excluded (${rejectedBanks.length} Lenders):</strong>
                ${rejectedBanks.slice(0, 5).map(b => `<span style="font-weight: 600;">${b.bankName}</span> (${b.reason || 'Criteria mismatch'})`).join(' • ')}
                ${rejectedBanks.length > 5 ? ` and ${rejectedBanks.length - 5} more.` : ''}
              </div>
            ` : ''}
          </div>

          <!-- Page 1 Footer -->
          <div style="border-top: 1px solid #E2E8F0; padding-top: 6px; display: flex; justify-content: space-between; font-size: 9.5px; color: #94a3b8;">
            <span>LaxmiCredit Multi-Bank Rule Engine • Confidential Eligibility Assessment</span>
            <span>Page 1 of 2</span>
          </div>
        </div>

        <!-- PAGE 2: EXECUTIVE SPOTLIGHT & ACTION BLUEPRINT -->
        <div style="min-height: 940px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; padding-top: 6px;">
          <div>
            <!-- Page 2 Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #F58220; padding-bottom: 10px; margin-bottom: 16px;">
              <div>
                <div style="font-size: 20px; font-weight: 800; color: #1E40AF; letter-spacing: -0.5px;">
                  Laxmi <span style="color: #F58220;">Credit</span>
                </div>
                <div style="font-size: 10.5px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">
                  Optimal Recommendation & Sanction Blueprint
                </div>
              </div>
              <div style="text-align: right;">
                <span style="background: #EEF3FA; color: #1E40AF; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 20px; border: 1px solid #BFDBFE; display: inline-block; margin-bottom: 3px;">
                  Applicant: <strong>${applicantName}</strong>
                </span>
                <div style="font-size: 10.5px; color: #64748b;">
                  Assessment Date: ${reportDate}
                </div>
              </div>
            </div>

            <!-- Key Highlights (4 Metrics) on Page 2 -->
            ${isTopUpMode ? `
            <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 18px; margin-left: -8px; margin-right: -8px;">
              <tr>
                <td style="width: 25%; background: #F0F9FF; border: 1.5px solid #0284C7; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #0284C7; text-transform: uppercase;">Net Top-Up Disbursal</div>
                  <div style="font-size: 20px; font-weight: 800; color: #0284C7; margin: 3px 0 1px;">
                    ${bestOffer ? formatLakhs(bestOffer.loanAmount) : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #0369A1; font-weight: 600;">${bestOffer?.bankName || 'Top Bank'}</div>
                </td>
                <td style="width: 25%; background: #ECFDF5; border: 1.5px solid #A7F3D0; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase;">Bank Capacity (E)</div>
                  <div style="font-size: 20px; font-weight: 800; color: #059669; margin: 3px 0 1px;">
                    ${bestOffer ? formatLakhs(bestOffer.totalCapacity || bestOffer.loanAmount) : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #047857; font-weight: 600;">Total Underwriting Ceiling</div>
                </td>
                <td style="width: 25%; background: #FEF2F2; border: 1.5px solid #FECACA; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #DC2626; text-transform: uppercase;">Running Loan (L)</div>
                  <div style="font-size: 20px; font-weight: 800; color: #DC2626; margin: 3px 0 1px;">
                    ${bestOffer ? `- ${formatInr(bestOffer.runningLoanOutstanding || 0)}` : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #991B1B; font-weight: 600;">Active Balance Deducted</div>
                </td>
                <td style="width: 25%; background: #EEF3FA; border: 1.5px solid #BFDBFE; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #1E40AF; text-transform: uppercase;">Top-Up Monthly EMI</div>
                  <div style="font-size: 20px; font-weight: 800; color: #1E40AF; margin: 3px 0 1px;">
                    ${bestOffer ? formatInr(bestOffer.monthlyEMI) : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #1E40AF; font-weight: 600;">@ ${bestOffer?.interestRate || 10.75}% p.a.</div>
                </td>
              </tr>
            </table>
            ` : (isODMode && isODBT) ? `
            <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 18px; margin-left: -8px; margin-right: -8px;">
              <tr>
                <td style="width: 25%; background: #ECFDF5; border: 1.5px solid #059669; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase;">Total Sanctioned Limit</div>
                  <div style="font-size: 20px; font-weight: 800; color: #059669; margin: 3px 0 1px;">
                    ${bestOffer ? formatLakhs(bestOffer.totalSanctionedLimit || bestOffer.odLimit) : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #047857; font-weight: 600;">${bestOffer?.bankName || 'Top OD Partner'}</div>
                </td>
                <td style="width: 25%; background: #FEF2F2; border: 1.5px solid #FECACA; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #DC2626; text-transform: uppercase;">Debt Cleared (POS)</div>
                  <div style="font-size: 20px; font-weight: 800; color: #DC2626; margin: 3px 0 1px;">
                    ${bestOffer ? `- ${formatInr(bestOffer.debtClearedPOS || bestOffer.utilizedODLimit || 0)}` : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #991B1B; font-weight: 600;">Old Loan Cleared</div>
                </td>
                <td style="width: 25%; background: #F0F9FF; border: 1.5px solid #BAE6FD; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #0284C7; text-transform: uppercase;">Available Free Limit</div>
                  <div style="font-size: 20px; font-weight: 800; color: #0284C7; margin: 3px 0 1px;">
                    ${bestOffer ? formatLakhs(bestOffer.availableODLimit) : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #0369A1; font-weight: 600;">24x7 Ready Credit Line</div>
                </td>
                <td style="width: 25%; background: #ECFDF5; border: 1.5px solid #A7F3D0; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase;">Used Limit Interest</div>
                  <div style="font-size: 18px; font-weight: 800; color: #059669; margin: 4px 0 2px;">
                    ${bestOffer ? `₹${Number(bestOffer.monthlyInterestOnUsed || 0).toLocaleString('en-IN')}/mo` : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #047857; font-weight: 600;">~₹${Number(bestOffer?.dailyInterestOnUsed || 0).toLocaleString('en-IN')}/day (${bestOffer?.interestRate || 10.75}%)</div>
                </td>
              </tr>
            </table>
            ` : isODMode ? `
            <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 18px; margin-left: -8px; margin-right: -8px;">
              <tr>
                <td style="width: 25%; background: #ECFDF5; border: 1.5px solid #059669; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase;">Sanctioned OD Limit</div>
                  <div style="font-size: 20px; font-weight: 800; color: #059669; margin: 3px 0 1px;">
                    ${bestOffer ? formatLakhs(bestOffer.odLimit || bestOffer.loanAmount) : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #047857; font-weight: 600;">${bestOffer?.bankName || 'Top OD Partner'}</div>
                </td>
                <td style="width: 25%; background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #16A34A; text-transform: uppercase;">Daily Cost per ₹1L</div>
                  <div style="font-size: 20px; font-weight: 800; color: #16A34A; margin: 3px 0 1px;">
                    ₹${bestOffer?.dailyInterestPerLakh || Math.round((100000 * ((bestOffer?.interestRate || 10.75) / 100)) / 365)}/day
                  </div>
                  <div style="font-size: 10px; color: #15803D; font-weight: 600;">When Drawn</div>
                </td>
                <td style="width: 25%; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #1E40AF; text-transform: uppercase;">Annual OD ROI</div>
                  <div style="font-size: 20px; font-weight: 800; color: #1E40AF; margin: 3px 0 1px;">
                    ${bestRoi}%
                  </div>
                  <div style="font-size: 10px; color: #64748b; font-weight: 600;">p.a. on used balance</div>
                </td>
                <td style="width: 25%; background: #ECFDF5; border: 1.5px solid #A7F3D0; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase;">Repayment Terms</div>
                  <div style="font-size: 17px; font-weight: 800; color: #059669; margin: 4px 0 2px;">
                    Zero Fixed EMI
                  </div>
                  <div style="font-size: 10px; color: #047857; font-weight: 600;">Pay Only as you Use</div>
                </td>
              </tr>
            </table>
            ` : isReportBT ? `
            <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 18px; margin-left: -8px; margin-right: -8px;">
              <tr>
                <td style="width: 25%; background: #FFF4EC; border: 1.5px solid #F58220; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #F58220; text-transform: uppercase;">Total Sanction</div>
                  <div style="font-size: 20px; font-weight: 800; color: #F58220; margin: 3px 0 1px;">
                    ${bestOffer ? formatLakhs(bestOffer.loanAmount) : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #9a3412; font-weight: 600;">${bestOffer?.bankName || 'Top Offer'}</div>
                </td>
                <td style="width: 25%; background: #EEF3FA; border: 1.5px solid #BFDBFE; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #1E40AF; text-transform: uppercase;">Net Disbursed</div>
                  <div style="font-size: 20px; font-weight: 800; color: #16A34A; margin: 3px 0 1px;">
                    ${bestOffer ? formatInr(bestOffer.freshAmountDisbursed) : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #16A34A; font-weight: 600;">Fresh In-Hand</div>
                </td>
                <td style="width: 25%; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: rgb(66, 66, 66); text-transform: uppercase;">Debt Cleared</div>
                  <div style="font-size: 20px; font-weight: 800; color: #DC2626; margin: 3px 0 1px;">
                    ${bestOffer ? formatInr(bestOffer.totalDebtCleared || bestOffer.btTotalOutstanding) : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #64748b; font-weight: 600;">Liabilities Cleared</div>
                </td>
                <td style="width: 25%; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #15803D; text-transform: uppercase;">Approval Success</div>
                  <div style="font-size: 20px; font-weight: 800; color: #15803D; margin: 3px 0 1px;">
                    ${approvalRate}%
                  </div>
                  <div style="font-size: 10px; color: #15803D; font-weight: 600;">${stats.eligibleCount} of ${stats.totalBanks} Approved</div>
                </td>
              </tr>
            </table>
            ` : `
            <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 18px; margin-left: -8px; margin-right: -8px;">
              <tr>
                <td style="width: 25%; background: #FFF4EC; border: 1.5px solid #F58220; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #F58220; text-transform: uppercase;">Highest Sanction</div>
                  <div style="font-size: 20px; font-weight: 800; color: #F58220; margin: 3px 0 1px;">
                    ${bestOffer ? formatLakhs(bestOffer.loanAmount) : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #9a3412; font-weight: 600;">${bestOffer?.bankName || 'Top Offer'}</div>
                </td>
                <td style="width: 25%; background: #EEF3FA; border: 1.5px solid #BFDBFE; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #1E40AF; text-transform: uppercase;">Optimal Monthly EMI</div>
                  <div style="font-size: 20px; font-weight: 800; color: #16A34A; margin: 3px 0 1px;">
                    ${bestOffer ? formatInr(bestOffer.monthlyEMI) : 'N/A'}
                  </div>
                  <div style="font-size: 10px; color: #16A34A; font-weight: 600;">Per Month</div>
                </td>
                <td style="width: 25%; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: rgb(66, 66, 66); text-transform: uppercase;">Interest Rate</div>
                  <div style="font-size: 20px; font-weight: 800; color: rgb(66, 66, 66); margin: 3px 0 1px;">
                    ${bestRoi}%
                  </div>
                  <div style="font-size: 10px; color: #64748b; font-weight: 600;">p.a. onwards</div>
                </td>
                <td style="width: 25%; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #15803D; text-transform: uppercase;">Approval Success</div>
                  <div style="font-size: 20px; font-weight: 800; color: #15803D; margin: 3px 0 1px;">
                    ${approvalRate}%
                  </div>
                  <div style="font-size: 10px; color: #15803D; font-weight: 600;">${stats.eligibleCount} of ${stats.totalBanks} Approved</div>
                </td>
              </tr>
            </table>
            `}

            <!-- Spotlight Best Offer Card on Page 2 -->
            ${bestOffer ? (
              isTopUpMode ? `
              <div style="background: #F0F9FF; border: 2px solid #0284C7; border-radius: 12px; padding: 18px 22px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #BAE6FD; padding-bottom: 8px; margin-bottom: 14px;">
                  <div>
                    <span style="background: #0284C7; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 12px; letter-spacing: 0.5px; margin-right: 8px;">
                      ⭐ TOP RECOMMENDED TOP-UP SANCTION
                    </span>
                    <span style="font-size: 19px; font-weight: 800; color: rgb(66, 66, 66);">
                      ${bestOffer.bankName}
                    </span>
                  </div>
                  <span style="background: #E0F2FE; color: #0369A1; font-size: 11px; font-weight: 750; padding: 3px 10px; border-radius: 12px;">
                    Top-Up Pre-Approved
                  </span>
                </div>
                <table style="width: 100%; border: none;">
                  <tr>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Net Top-Up Disbursal</div>
                      <div style="font-size: 20px; font-weight: 800; color: #0284C7; margin-top: 2px;">${formatLakhs(bestOffer.loanAmount)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Bank Capacity (E)</div>
                      <div style="font-size: 20px; font-weight: 800; color: #16A34A; margin-top: 2px;">${formatLakhs(bestOffer.totalCapacity || bestOffer.loanAmount)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Running Loan (L)</div>
                      <div style="font-size: 20px; font-weight: 800; color: #DC2626; margin-top: 2px;">-${formatInr(bestOffer.runningLoanOutstanding || 0)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Top-Up Monthly EMI</div>
                      <div style="font-size: 20px; font-weight: 800; color: #1E40AF; margin-top: 2px;">${formatInr(bestOffer.monthlyEMI)}</div>
                    </td>
                  </tr>
                </table>
              </div>
              ` : (isODMode && isODBT) ? `
              <div style="background: #ECFDF5; border: 2px solid #059669; border-radius: 12px; padding: 18px 22px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #A7F3D0; padding-bottom: 8px; margin-bottom: 14px;">
                  <div>
                    <span style="background: #059669; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 12px; letter-spacing: 0.5px; margin-right: 8px;">
                      ⭐ TOP RECOMMENDED OD BALANCE TRANSFER (TAKEOVER)
                    </span>
                    <span style="font-size: 19px; font-weight: 800; color: rgb(66, 66, 66);">
                      ${bestOffer.bankName}
                    </span>
                  </div>
                  <span style="background: #D1FAE5; color: #047857; font-size: 11px; font-weight: 750; padding: 3px 10px; border-radius: 12px;">
                    OD Takeover Approved
                  </span>
                </div>
                <table style="width: 100%; border: none;">
                  <tr>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Total OD Limit</div>
                      <div style="font-size: 20px; font-weight: 800; color: #059669; margin-top: 2px;">${formatLakhs(bestOffer.totalSanctionedLimit || bestOffer.odLimit)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Debt Cleared (POS)</div>
                      <div style="font-size: 20px; font-weight: 800; color: #DC2626; margin-top: 2px;">-${formatInr(bestOffer.debtClearedPOS || bestOffer.utilizedODLimit || 0)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Available Free Limit</div>
                      <div style="font-size: 20px; font-weight: 800; color: #0284C7; margin-top: 2px;">${formatLakhs(bestOffer.availableODLimit)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Used Limit Interest</div>
                      <div style="font-size: 18px; font-weight: 800; color: #059669; margin-top: 3px;">₹${Number(bestOffer.monthlyInterestOnUsed || 0).toLocaleString('en-IN')}/mo</div>
                    </td>
                  </tr>
                </table>
              </div>
              ` : isODMode ? `
              <div style="background: #ECFDF5; border: 2px solid #059669; border-radius: 12px; padding: 18px 22px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #A7F3D0; padding-bottom: 8px; margin-bottom: 14px;">
                  <div>
                    <span style="background: #059669; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 12px; letter-spacing: 0.5px; margin-right: 8px;">
                      ⭐ TOP SANCTIONED OVERDRAFT FACILITY
                    </span>
                    <span style="font-size: 19px; font-weight: 800; color: rgb(66, 66, 66);">
                      ${bestOffer.bankName}
                    </span>
                  </div>
                  <span style="background: #D1FAE5; color: #047857; font-size: 11px; font-weight: 750; padding: 3px 10px; border-radius: 12px;">
                    Flexi OD Facility
                  </span>
                </div>
                <table style="width: 100%; border: none;">
                  <tr>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Sanctioned OD Limit</div>
                      <div style="font-size: 20px; font-weight: 800; color: #059669; margin-top: 2px;">${formatLakhs(bestOffer.odLimit || bestOffer.loanAmount)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Daily Cost (₹1L Used)</div>
                      <div style="font-size: 20px; font-weight: 800; color: #16A34A; margin-top: 2px;">₹${bestOffer.dailyInterestPerLakh || Math.round((100000 * ((bestOffer.interestRate || 10.75) / 100)) / 365)}/day</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Annual OD ROI</div>
                      <div style="font-size: 20px; font-weight: 800; color: #1E40AF; margin-top: 2px;">${bestRoi}% p.a.</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Repayment Nature</div>
                      <div style="font-size: 16px; font-weight: 800; color: #059669; margin-top: 4px;">Zero Fixed EMI</div>
                    </td>
                  </tr>
                </table>
              </div>
              ` : isReportBT ? `
              <div style="background: #FFF9F5; border: 2px solid #F58220; border-radius: 12px; padding: 18px 22px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #FED7AA; padding-bottom: 8px; margin-bottom: 14px;">
                  <div>
                    <span style="background: #F58220; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 12px; letter-spacing: 0.5px; margin-right: 8px;">
                      ⭐ TOP RECOMMENDED CONSOLIDATION
                    </span>
                    <span style="font-size: 19px; font-weight: 800; color: rgb(66, 66, 66);">
                      ${bestOffer.bankName}
                    </span>
                  </div>
                  <span style="background: #EEF3FA; color: #1E40AF; font-size: 11px; font-weight: 750; padding: 3px 10px; border-radius: 12px;">
                    Consolidated Pre-Approved
                  </span>
                </div>
                <table style="width: 100%; border: none;">
                  <tr>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Total Sanction</div>
                      <div style="font-size: 20px; font-weight: 800; color: #F58220; margin-top: 2px;">${formatLakhs(bestOffer.loanAmount)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Net Disbursed</div>
                      <div style="font-size: 20px; font-weight: 800; color: #16A34A; margin-top: 2px;">${formatInr(bestOffer.freshAmountDisbursed)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Debt Cleared</div>
                      <div style="font-size: 20px; font-weight: 800; color: #DC2626; margin-top: 2px;">${formatInr(bestOffer.totalDebtCleared || bestOffer.btTotalOutstanding)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">New Monthly EMI</div>
                      <div style="font-size: 20px; font-weight: 800; color: #1E40AF; margin-top: 2px;">${formatInr(bestOffer.monthlyEMI)}</div>
                    </td>
                  </tr>
                </table>
              </div>
              ` : `
              <div style="background: #FFF9F5; border: 2px solid #F58220; border-radius: 12px; padding: 18px 22px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #FED7AA; padding-bottom: 8px; margin-bottom: 14px;">
                  <div>
                    <span style="background: #F58220; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 12px; letter-spacing: 0.5px; margin-right: 8px;">
                      ⭐ TOP RECOMMENDED OFFER
                    </span>
                    <span style="font-size: 19px; font-weight: 800; color: rgb(66, 66, 66);">
                      ${bestOffer.bankName}
                    </span>
                  </div>
                  <span style="background: #EEF3FA; color: #1E40AF; font-size: 11px; font-weight: 750; padding: 3px 10px; border-radius: 12px;">
                    Pre-Approved
                  </span>
                </div>
                <table style="width: 100%; border: none;">
                  <tr>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Sanctioned Limit</div>
                      <div style="font-size: 20px; font-weight: 800; color: #F58220; margin-top: 2px;">${formatLakhs(bestOffer.loanAmount)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Monthly EMI</div>
                      <div style="font-size: 20px; font-weight: 800; color: #16A34A; margin-top: 2px;">${formatInr(bestOffer.monthlyEMI)}</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Interest Rate (ROI)</div>
                      <div style="font-size: 20px; font-weight: 800; color: rgb(66, 66, 66); margin-top: 2px;">${bestRoi}%</div>
                    </td>
                    <td style="width: 25%;">
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Tenure</div>
                      <div style="font-size: 20px; font-weight: 800; color: #1E40AF; margin-top: 2px;">${bestTenure} Years</div>
                    </td>
                  </tr>
                </table>
              </div>
              `
            ) : ''}

            <!-- Next Steps -->
            <div style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 14px 18px; margin-bottom: 16px;">
              <div style="font-size: 11px; font-weight: 800; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                ${isTopUpMode 
                  ? '⚡ 3 Simple Steps to Avail Your Top-Up Disbursal' 
                  : (isODMode && isODBT)
                    ? '⚡ 3 Simple Steps to Complete Your OD Takeover'
                    : isODMode 
                      ? '⚡ 3 Simple Steps to Activate Your Overdraft Credit Line' 
                      : '⚡ 3 Simple Steps to Claim Your Loan Sanction'}
              </div>
              <table style="width: 100%; border: none; font-size: 11px;">
                <tr>
                  <td style="width: 33%; vertical-align: top; padding-right: 10px;">
                    <strong style="color: ${isTopUpMode ? '#0284C7' : (isODMode ? '#059669' : '#F58220')};">
                      ${isTopUpMode ? '1. Verify Active Loan' : ((isODMode && isODBT) ? '1. Direct Debt Foreclosure' : (isODMode ? '1. Connect Salary Bank' : '1. Select Preferred Bank'))}
                    </strong>
                    <div style="color: #64748b; margin-top: 2px; line-height: 1.4;">
                      ${isTopUpMode 
                        ? 'Top-up is processed directly on your current active loan account without new sanction charges.' 
                        : (isODMode && isODBT)
                          ? 'The OD lender issues foreclosure payout to close your old running loans and eliminate their high EMI.'
                          : isODMode 
                            ? 'Link your bank account to set up your pre-approved institutional credit line.' 
                            : 'Choose the offer best matching your required amount or lowest monthly EMI.'}
                    </div>
                  </td>
                  <td style="width: 33%; vertical-align: top; padding-right: 10px;">
                    <strong style="color: #1E40AF;">
                      ${isTopUpMode ? '2. Digital Top-Up Approval' : ((isODMode && isODBT) ? '2. POS Deducted from OD' : (isODMode ? '2. Draw Anytime 24x7' : '2. Digital Verification'))}
                    </strong>
                    <div style="color: #64748b; margin-top: 2px; line-height: 1.4;">
                      ${isTopUpMode 
                        ? 'Fast-track 100% paperless review based on your existing flawless repayment history.' 
                        : (isODMode && isODBT)
                          ? 'The exact loan POS is drawn from your limit. The remaining balance remains free for you to withdraw 24x7.'
                          : isODMode 
                            ? 'Withdraw any amount at any time directly via net banking or UPI. Zero fixed EMI.' 
                            : 'Fast-track 100% paperless KYC and salary account verification.'}
                    </div>
                  </td>
                  <td style="width: 33%; vertical-align: top;">
                    <strong style="color: #15803D;">
                      ${isTopUpMode ? '3. Instant Top-Up Disbursal' : ((isODMode && isODBT) ? '3. Pay Interest on Used Balance' : (isODMode ? '3. Pay Interest Only on Usage' : '3. Instant Disbursement'))}
                    </strong>
                    <div style="color: #64748b; margin-top: 2px; line-height: 1.4;">
                      ${isTopUpMode 
                        ? 'Net top-up funds credited directly into your salary bank account.' 
                        : (isODMode && isODBT)
                          ? 'You now pay only interest on the utilized POS balance. Unused credit limit costs ₹0.'
                          : isODMode 
                            ? 'Interest is charged only on the exact funds utilized. Unused credit limit costs ₹0.' 
                            : 'Approved loan amount is credited directly into your salary bank account.'}
                    </div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Advisory -->
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; padding: 10px 14px; font-size: 10px; color: #92400E; line-height: 1.4;">
              <strong>Advisory Notice:</strong> ${(isODMode && isODBT)
                ? 'Overdraft (OD) balance transfer utilizes your sanctioned limit to foreclose existing loan liabilities. Monthly interest applies strictly to the utilized balance drawn for debt clearance. The unused limit carries zero charges until drawn. Final limit activation is subject to bank verification. Soft inquiry has zero impact on your CIBIL score.'
                : isODMode 
                  ? 'Overdraft (OD) facility represents a revolving credit line where interest is charged strictly on the utilized balance on a daily basis. No fixed EMI applies unless funds are drawn. Final limit activation is subject to partner bank documentation. Soft inquiry has zero impact on your CIBIL score.' 
                  : isTopUpMode 
                    ? 'Top-Up loan disbursal represents incremental funding over your running loan balance based on underwriting capacity (Total Capacity minus Running Loan). Final sanction and disbursal remain subject to lender track record verification. Soft inquiry has zero impact on your CIBIL score.' 
                    : 'The terms and sanction amounts presented herein represent algorithmic pre-approvals based on multi-bank credit policy rules. Final sanction and disbursal remain subject to bank document verification. Soft inquiry has zero impact on your CIBIL score.'}
            </div>
          </div>

          <!-- Page 2 Footer -->
          <div style="border-top: 1px solid #E2E8F0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
            <span>LaxmiCredit Multi-Bank Rule Engine • Zero Bureau Impact Guaranteed</span>
            <span>Page 2 of 2</span>
          </div>
        </div>
      </div>
    `;
  };

  const handleDownloadReport = async () => {
    if (isDownloading) return;
    try {
      setIsDownloading(true);

      const rawFullName = metadata?.customerName || metadata?.name || metadata?.applicantName || 'Customer';
      // Extract FIRST NAME ONLY
      const firstName = String(rawFullName).trim().split(/\s+/)[0] || 'Customer';
      const cleanFirstName = firstName.replace(/[^a-zA-Z0-9]/g, '') || 'Customer';
      const cleanFileName = isTopUpMode
        ? `${cleanFirstName}_Loan_TopUp_Report.pdf`
        : (isODMode ? `${cleanFirstName}_OD_Limit_Report.pdf` : `${cleanFirstName}_Loan_Eligibility_Report.pdf`);

      const reportHtml = generateCustomerSummaryHtml();

      const opt = {
        margin: [4, 4, 4, 4],
        filename: cleanFileName,
        image: { type: 'jpeg', quality: 0.90 },
        html2canvas: {
          scale: 1.5,
          useCORS: false,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(reportHtml).save();
    } catch (err) {
      console.error('PDF download error, fallback to print:', err);
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="customer-results-display">
      {/* Results Header */}
      <div className="results-header">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{
            fontFamily: 'Outfit, "Plus Jakarta Sans", Inter, sans-serif',
            fontStyle: 'normal',
            fontWeight: 750,
            color: 'rgb(66, 66, 66)',
            fontSize: '43px',
            lineHeight: '54px',
            margin: '0 0 6px 0'
          }}>
            {isTopUpMode ? (
              <>Existing Loan <span style={{ color: '#0284C7' }}>Top-Up Analysis</span></>
            ) : isODMode ? (
              <>Institutional <span style={{ color: '#059669' }}>Overdraft (OD) Limits</span></>
            ) : (
              <>Institutional <span style={{ color: '#F58220' }}>Eligibility Analysis</span></>
            )}
          </h2>
          <div style={{
            width: '42px',
            height: '3.5px',
            backgroundColor: isTopUpMode ? '#0284C7' : (isODMode ? '#059669' : '#F58220'),
            borderRadius: '2px',
            margin: '0 auto 12px'
          }} />

          {/* Executive Applicant & Company Profile Bar */}
          <div className="report-applicant-strip" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            margin: '16px auto 14px',
            maxWidth: '850px'
          }}>
            <span className="category-pill" style={{
              background: '#F8FAFC',
              color: 'rgb(66, 66, 66)',
              padding: '7px 18px',
              borderRadius: '20px',
              fontSize: '0.92rem',
              fontWeight: 700,
              border: '1px solid #E2E8F0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              Category: <strong>{results.find(r => r.category)?.category || metadata?.category || 'Category B'}</strong>
            </span>
            {(metadata?.creditScore !== undefined || metadata?.cibilScore !== undefined) && (
              <span style={{
                background: (metadata?.creditScore === -1 || metadata?.creditScore === '-1' || metadata?.cibilScore === -1 || metadata?.cibilScore === '-1' || metadata?.isNewToCredit) ? '#F5F3FF' : '#F0FDF4',
                color: (metadata?.creditScore === -1 || metadata?.creditScore === '-1' || metadata?.cibilScore === -1 || metadata?.cibilScore === '-1' || metadata?.isNewToCredit) ? '#6D28D9' : '#15803D',
                padding: '7px 18px',
                borderRadius: '20px',
                fontSize: '0.92rem',
                fontWeight: 700,
                border: (metadata?.creditScore === -1 || metadata?.creditScore === '-1' || metadata?.cibilScore === -1 || metadata?.cibilScore === '-1' || metadata?.isNewToCredit) ? '1px solid #DDD6FE' : '1px solid #BBF7D0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {(metadata?.creditScore === -1 || metadata?.creditScore === '-1' || metadata?.cibilScore === -1 || metadata?.cibilScore === '-1' || metadata?.isNewToCredit) ? '🌟 New to Credit (CIBIL: -1)' : `📊 Bureau CIBIL: ${metadata.cibilScore || metadata.creditScore}`}
              </span>
            )}
            <span style={{
              background: '#EEF3FA',
              color: '#1E40AF',
              padding: '7px 18px',
              borderRadius: '20px',
              fontSize: '0.92rem',
              fontWeight: 700,
              border: '1px solid #BFDBFE',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              🛡️ Zero CIBIL Impact
            </span>
          </div>

          {!isTopUpMode && !isODMode && (
            <p style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: '1.02rem',
              color: 'rgb(66, 66, 66)',
              lineHeight: '1.6',
              maxWidth: '750px',
              margin: '12px auto 0',
              fontWeight: 500,
              textWrap: 'balance'
            }}>
              Verified assessment results across {results.length} banking institutions with zero impact on CIBIL score.
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}>
            <button 
              className="btn-download-pdf" 
              onClick={handleDownloadReport}
              disabled={isDownloading}
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                fontStyle: 'normal',
                fontWeight: 750,
                color: 'rgb(255, 255, 255)',
                fontSize: '18px',
                lineHeight: 'normal',
                background: isDownloading ? '#9ca3af' : 'rgb(245, 130, 32)',
                border: 'none',
                borderRadius: '50px',
                padding: '14px 36px',
                cursor: isDownloading ? 'wait' : 'pointer',
                boxShadow: '0 4px 16px rgba(245, 130, 32, 0.35)',
                transition: 'all 0.25s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                opacity: isDownloading ? 0.8 : 1
              }}
            >
              {isDownloading ? 'Generating Fast PDF Report... ⏳' : 'Download your eligibility report'}
            </button>
          </div>
        </div>
      </div>

      {/* 🧠 NEURAL PREDICTION BANNER */}
      {aiResult && (
        <div className="neural-prediction-banner">
          <div className="neural-icon">🧠</div>
          <div className="neural-content">
            <h3>Neural AI Prediction</h3>
            <p className="neural-desc">Our brain has analyzed 3 Crore historical patterns for your profile.</p>
            <div className="neural-stats">
              <div className="neural-stat">
                <span className="stat-label">AI Estimated Sanction:</span>
                <span className="stat-value">₹{aiResult.predictedAmount.toLocaleString()}</span>
              </div>
              <div className="neural-stat">
                <span className="stat-label">Neural Confidence:</span>
                <div className="confidence-container">
                  <div className="confidence-bar" style={{ width: `${aiResult.confidence}%` }}></div>
                  <span className="confidence-text">{aiResult.confidence}%</span>
                </div>
              </div>
            </div>
            <p className="neural-insight">
              {aiResult.predictedAmount > (stats?.avgLoanAmount || 0) 
                ? "✨ Insight: Our AI detects hidden eligibility beyond standard rules."
                : "🔍 Insight: Your profile matches standard high-approval patterns."}
            </p>
          </div>
        </div>
      )}

      {/* 🗣️ LINGUISTIC AI INSIGHT (Human Voice) */}
      {aiInsight && (
        <div className={`ai-insight-bubble ${aiInsight.tone}`}>
          <div className="advisor-header">
            <span className="advisor-label">Personal Financial Advisor</span>
            <div className="pulse-indicator"></div>
          </div>
          <div className="insight-text">
            {aiInsight.message.split('**').map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </div>
        </div>
      )}

      {/* 📊 VISUAL ANALYTICS SUITE (Pie/Bars Comparison) */}
      {eligibleBanks.length > 0 && (
        <div className="visual-analytics-container">
          {/* Bar Comparison Chart */}
          <div className="chart-card">
            <h4>Top Eligible Offer Comparison</h4>
            <div className="bar-chart-wrapper">
              {sortedEligibleBanks.slice(0, 5).map((bank, i) => {
                const maxPossibleInView = sortedEligibleBanks[0].loanAmount || 1;
                const percentage = ((bank.loanAmount || 0) / maxPossibleInView) * 100;
                return (
                  <div key={i} className="comparison-bar-row">
                    <div className="bar-info">
                      <span className="bar-bank-name">{bank.bankName}</span>
                      <span className="bar-amount">{formatCurrency(bank.loanAmount)}</span>
                    </div>
                    <div className="bar-track">
                      <motion.div 
                        className="bar-fill"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${percentage}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Success Pie Gauge */}
          <div className="chart-card">
            <h4>Approval Success Rate</h4>
            <div className="gauge-flex">
              <div className="gauge-svg-container">
                <svg className="gauge-svg" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="gradientGauge" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1E40AF" />
                      <stop offset="50%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#F58220" />
                    </linearGradient>
                  </defs>
                  {/* Background Ring */}
                  <circle className="gauge-bg" cx="50" cy="50" r="40" />
                  {/* Filled Ring */}
                  <motion.circle 
                    className="gauge-fill" 
                    cx="50" cy="50" r="40"
                    initial={{ strokeDasharray: "0, 251.2" }}
                    whileInView={{ strokeDasharray: `${(Math.round((stats.eligibleCount / stats.totalBanks) * 100) / 100) * 251.2}, 251.2` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                  />
                </svg>
                <div className="gauge-content-center">
                  <div className="gauge-percentage" style={{ color: '#1E40AF' }}>
                    {Math.round((stats.eligibleCount / stats.totalBanks) * 100)}%
                  </div>
                  <div className="gauge-label" style={{ color: 'rgb(66, 66, 66)' }}>Approved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', padding: '22px 18px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div className="stat-value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.85rem', fontWeight: 800, color: '#1E40AF', marginBottom: '8px' }}>
            {stats.eligibleCount}/{stats.totalBanks}
          </div>
          <div className="stat-label" style={{ fontSize: '0.82rem', color: 'rgb(66, 66, 66)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 1, display: 'block' }}>
            {isTopUpMode ? 'Target Bank Evaluated' : (isODMode ? 'OD Partners Evaluated' : 'Institutions Evaluated')}
          </div>
        </div>

        {bestOffer && isTopUpMode ? (
          <>
            <div className="stat-card highlight" style={{ background: '#F0F9FF', border: '2px solid #0284C7', padding: '22px 18px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 6px 20px rgba(2, 132, 199, 0.12)' }}>
              <div className="stat-value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.85rem', fontWeight: 800, color: '#0284C7', marginBottom: '8px' }}>
                {formatCurrency(bestOffer.topUpAmount || bestOffer.loanAmount)}
              </div>
              <div className="stat-label" style={{ fontSize: '0.82rem', color: '#0369A1', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 1, display: 'block' }}>
                Net Cash Top-Up Disbursal
              </div>
            </div>

            <div className="stat-card" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', padding: '22px 18px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div className="stat-value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.85rem', fontWeight: 800, color: '#1E40AF', marginBottom: '8px' }}>
                {formatCurrency(bestOffer.totalCapacity)}
              </div>
              <div className="stat-label" style={{ fontSize: '0.82rem', color: 'rgb(66, 66, 66)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 1, display: 'block' }}>
                Total Bank Capacity (E)
              </div>
            </div>
          </>
        ) : bestOffer && isODBT ? (
          <>
            <div className="stat-card highlight" style={{ background: '#ECFDF5', border: '2px solid #059669', padding: '22px 18px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 6px 20px rgba(5, 150, 105, 0.12)' }}>
              <div className="stat-value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.85rem', fontWeight: 800, color: '#059669', marginBottom: '8px' }}>
                {formatCurrency(bestOffer.totalSanctionedLimit || bestOffer.odLimit)}
              </div>
              <div className="stat-label" style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 1, display: 'block' }}>
                Total Sanctioned OD Limit
              </div>
            </div>

            <div className="stat-card" style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', padding: '22px 18px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div className="stat-value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.85rem', fontWeight: 800, color: '#0284C7', marginBottom: '8px' }}>
                {formatCurrency(bestOffer.availableODLimit)}
              </div>
              <div className="stat-label" style={{ fontSize: '0.82rem', color: '#0369A1', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 1, display: 'block' }}>
                Available Free Limit
              </div>
            </div>
          </>
        ) : bestOffer && isODMode ? (
          <>
            <div className="stat-card highlight" style={{ background: '#ECFDF5', border: '2px solid #059669', padding: '22px 18px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 6px 20px rgba(5, 150, 105, 0.12)' }}>
              <div className="stat-value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.85rem', fontWeight: 800, color: '#059669', marginBottom: '8px' }}>
                {formatCurrency(bestOffer.odLimit || bestOffer.loanAmount)}
              </div>
              <div className="stat-label" style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 1, display: 'block' }}>
                Highest Sanctioned OD Limit
              </div>
            </div>

            <div className="stat-card" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', padding: '22px 18px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div className="stat-value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.85rem', fontWeight: 800, color: '#1E40AF', marginBottom: '8px' }}>
                ₹{bestOffer.dailyInterestPerLakh || Math.round((100000 * ((bestOffer.interestRate || 10.75) / 100)) / 365)}/day
              </div>
              <div className="stat-label" style={{ fontSize: '0.82rem', color: 'rgb(66, 66, 66)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 1, display: 'block' }}>
                Daily Cost per ₹1L Drawn
              </div>
            </div>
          </>
        ) : bestOffer ? (
          <>
            <div className="stat-card highlight" style={{ background: '#FFF4EC', border: '2px solid #f58220', padding: '22px 18px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 6px 20px rgba(245, 130, 32, 0.12)' }}>
              <div className="stat-value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.85rem', fontWeight: 800, color: '#f58220', marginBottom: '8px' }}>
                {formatCurrency(bestOffer.loanAmount)}
              </div>
              <div className="stat-label" style={{ fontSize: '0.82rem', color: '#f58220', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 1, display: 'block' }}>
                Maximum Opportunity ({bestOffer.bankName})
              </div>
            </div>

            <div className="stat-card" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', padding: '22px 18px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div className="stat-value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.85rem', fontWeight: 800, color: '#1E40AF', marginBottom: '8px' }}>
                {formatNumber(bestOffer.monthlyEMI)}
              </div>
              <div className="stat-label" style={{ fontSize: '0.82rem', color: 'rgb(66, 66, 66)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 1, display: 'block' }}>
                Optimal Monthly Obligation
              </div>
            </div>
          </>
        ) : null}

        <div className="stat-card" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', padding: '22px 18px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div className="stat-value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.85rem', fontWeight: 800, color: (isTopUpMode || isODBT) ? '#DC2626' : (isODMode ? '#059669' : '#1E40AF'), marginBottom: '8px' }}>
            {isODBT 
              ? (bestOffer?.debtClearedPOS ? `- ${formatCurrency(bestOffer.debtClearedPOS)}` : '₹0')
              : isTopUpMode 
                ? (bestOffer?.runningLoanOutstanding ? `- ${formatCurrency(bestOffer.runningLoanOutstanding)}` : '₹0')
                : (isODMode ? '₹0' : formatCurrency(stats.avgLoanAmount))}
          </div>
          <div className="stat-label" style={{ fontSize: '0.82rem', color: 'rgb(66, 66, 66)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 1, display: 'block' }}>
            {isODBT ? 'Existing Debt Cleared (POS)' : isTopUpMode ? 'Running Loan Deducted (L)' : (isODMode ? 'Charges on Unused Limit' : 'Mean Approval Value')}
          </div>
        </div>
      </div>

      {/* Best Offer Highlight */}
      {bestOffer && (
        <div className="best-offer-card" style={{
          background: isTopUpMode ? '#F0F9FF' : (isODMode ? '#ECFDF5' : '#FFF4EC'),
          border: `2px solid ${isTopUpMode ? '#0284C7' : (isODMode ? '#059669' : '#f58220')}`,
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '36px',
          boxShadow: `0 10px 30px ${isTopUpMode ? 'rgba(2, 132, 199, 0.12)' : (isODMode ? 'rgba(5, 150, 105, 0.12)' : 'rgba(245, 130, 32, 0.12)')}`
        }}>
          <div className="best-offer-badge" style={{
            background: isTopUpMode ? '#0284C7' : (isODMode ? '#059669' : '#f58220'),
            color: '#ffffff',
            padding: '5px 14px',
            borderRadius: '50px',
            fontSize: '0.72rem',
            fontWeight: 750,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'inline-block',
            marginBottom: '16px'
          }}>
            {isTopUpMode ? '⚡ TOP-UP RECOMMENDED OFFER' : (isODBT ? '💳 OVERDRAFT WITH BALANCE TRANSFER (TAKEOVER)' : (isODMode ? '💳 TOP OVERDRAFT (OD) LIMIT' : 'OPTIMAL SELECTION'))}
          </div>
          <div className="best-offer-content">
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 750, color: 'rgb(66, 66, 66)', margin: '0 0 24px 0' }}>{bestOffer.bankName}</h3>
            <div className="best-offer-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div className="detail-item">
                <span className="label" style={{ fontSize: '0.8rem', color: 'rgb(66, 66, 66)', marginBottom: '4px', fontWeight: 650, textTransform: 'uppercase', display: 'block' }}>
                  {isTopUpMode ? 'Net Top-Up Disbursal' : (isODBT ? 'Total Sanctioned Limit' : (isODMode ? 'Sanctioned OD Limit' : 'Loan Amount'))}
                </span>
                <span className="value large" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800, color: isTopUpMode ? '#0284C7' : (isODMode ? '#059669' : '#f58220'), display: 'block' }}>
                  {formatCurrency(isTopUpMode ? (bestOffer.topUpAmount || bestOffer.loanAmount) : (isODBT ? (bestOffer.totalSanctionedLimit || bestOffer.odLimit) : (isODMode ? (bestOffer.odLimit || bestOffer.loanAmount) : bestOffer.loanAmount)))}
                </span>
              </div>
              <div className="detail-item">
                <span className="label" style={{ fontSize: '0.8rem', color: 'rgb(66, 66, 66)', marginBottom: '4px', fontWeight: 650, textTransform: 'uppercase', display: 'block' }}>
                  {isODBT ? 'Used Limit Interest' : (isODMode ? 'Daily Cost (₹1L Used)' : (isTopUpMode ? 'Top-Up Monthly EMI' : 'Monthly EMI'))}
                </span>
                <span className="value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: '#1E40AF', display: 'block' }}>
                  {isODBT 
                    ? `₹${Number(bestOffer.monthlyInterestOnUsed || 0).toLocaleString('en-IN')}/mo` 
                    : (isODMode ? `₹${bestOffer.dailyInterestPerLakh || Math.round((100000 * ((bestOffer.interestRate || 11.25) / 100)) / 365)}/day` : formatNumber(bestOffer.monthlyEMI))}
                </span>
              </div>
              <div className="detail-item">
                <span className="label" style={{ fontSize: '0.8rem', color: 'rgb(66, 66, 66)', marginBottom: '4px', fontWeight: 650, textTransform: 'uppercase', display: 'block' }}>
                  {isODMode ? 'Annual OD ROI' : 'Interest Rate'}
                </span>
                <span className="value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: isTopUpMode ? '#0284C7' : (isODMode ? '#059669' : '#f58220'), display: 'block' }}>{bestOffer.interestRate}%</span>
              </div>
              <div className="detail-item">
                <span className="label" style={{ fontSize: '0.8rem', color: 'rgb(66, 66, 66)', marginBottom: '4px', fontWeight: 650, textTransform: 'uppercase', display: 'block' }}>
                  {isODBT ? 'Available Free Limit' : (isODMode ? 'Repayment Facility' : 'Loan Tenure')}
                </span>
                <span className="value" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: isODBT ? '#0284C7' : '#1E40AF', display: 'block' }}>
                  {isODBT ? formatCurrency(bestOffer.availableODLimit) : (isODMode ? 'Flexi (Zero Fixed EMI)' : `${bestOffer.loanTenure} years`)}
                </span>
              </div>
            </div>
            {isODMode && isODBT && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #A7F3D0', display: 'flex', gap: '16px', fontSize: '0.88rem', color: '#047857', flexWrap: 'wrap' }}>
                <span><strong>Total OD Sanction:</strong> {formatCurrency(bestOffer.totalSanctionedLimit || bestOffer.odLimit)}</span>
                <span>•</span>
                <span><strong>Old Debt Cleared (POS):</strong> - {formatCurrency(bestOffer.debtClearedPOS || bestOffer.utilizedODLimit)}</span>
                <span>•</span>
                <span><strong>Available Free Limit:</strong> {formatCurrency(bestOffer.availableODLimit)} (₹0 charges until drawn)</span>
                <span>•</span>
                <span><strong>Used Limit Interest:</strong> ₹{Number(bestOffer.monthlyInterestOnUsed || 0).toLocaleString('en-IN')}/mo</span>
              </div>
            )}
            {isODMode && !isODBT && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #A7F3D0', display: 'flex', gap: '16px', fontSize: '0.88rem', color: '#047857', flexWrap: 'wrap' }}>
                <span><strong>Revolving Credit:</strong> Sanctioned limit available 24x7 for withdrawal.</span>
                <span>•</span>
                <span><strong>Zero Fixed EMI:</strong> Pay interest only on drawn funds for actual days used.</span>
                <span>•</span>
                <span><strong>Unused Limit:</strong> ₹0 Charges.</span>
              </div>
            )}
            {isTopUpMode && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #BAE6FD', display: 'flex', gap: '16px', fontSize: '0.88rem', color: '#0369A1', flexWrap: 'wrap' }}>
                <span><strong>Total Bank Capacity (E):</strong> {formatCurrency(bestOffer.totalCapacity)}</span>
                <span>•</span>
                <span><strong>Current Running Loan (L):</strong> - {formatCurrency(bestOffer.runningLoanOutstanding)}</span>
                <span>•</span>
                <span><strong>Net Disbursal (E - L):</strong> {formatCurrency(bestOffer.topUpAmount || bestOffer.loanAmount)}</span>
              </div>
            )}
            {bestOffer.calculationMethod && (
              <div className="calculation-method" style={{ textAlign: 'right', marginTop: '10px', opacity: 0.6 }}>
                <small>Method: {bestOffer.calculationMethod}</small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Sort Controls */}
      <div className="controls-bar">
        <div className="filter-group">
          <label>Show:</label>
          <select 
            value={filterEligible} 
            onChange={(e) => setFilterEligible(e.target.value)}
          >
            <option value="all">All Banks ({results.length})</option>
            <option value="eligible">Approved Only ({eligibleBanks.length})</option>
            <option value="rejected">Rejected Only ({rejectedBanks.length})</option>
          </select>
        </div>

        {filterEligible !== 'rejected' && (
          <div className="sort-group">
            <label>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="loanAmount">{isODMode ? 'Highest OD Limit' : 'Highest Loan Amount'}</option>
              {!isODMode && <option value="emi">Lowest EMI</option>}
              {isODMode && <option value="roi">Lowest OD Rate</option>}
              <option value="bank">Bank Name (A-Z)</option>
            </select>
          </div>
        )}
      </div>

      {/* Explicit Clean Page Break for PDF Export */}
      <div className="pdf-page-break" style={{ pageBreakBefore: 'always', breakBefore: 'always' }} />

      {/* All Bank Results */}
      <div className="all-banks-results">
        <h3 style={{ fontFamily: 'Outfit, "Plus Jakarta Sans", Inter, sans-serif', fontWeight: 750, color: 'rgb(66, 66, 66)', fontSize: '1.5rem', marginBottom: '20px' }}>
          {isTopUpMode ? (
            <>Your Existing Loan <span style={{ color: '#059669' }}>Top-Up Offer</span></>
          ) : isODMode ? (
            <>Your Approved <span style={{ color: '#7C3AED' }}>Overdraft (OD) Limits</span> (Partner Banks)</>
          ) : (
            <>Your Pre-Approved <span style={{ color: '#F58220' }}>Loan Amount Options</span></>
          )}
        </h3>

        <div className="banks-grid">
          {(filterEligible === 'eligible' ? sortedEligibleBanks :
            filterEligible === 'rejected' ? rejectedBanks :
              [...sortedEligibleBanks, ...rejectedBanks]).map((bank, index) => (
                <div
                  key={index}
                  className={`bank-card ${bank.eligible ? 'eligible' : 'rejected'} ${bank === bestOffer ? 'best' : ''}`}
                  onClick={() => bank.eligible && handleBankSelect(bank.bankName, true)}
                >
                  <div className="bank-card-header">
                    {bank.eligible && (
                      <div 
                        className={`selection-checkbox ${selectedBanks.includes(bank.bankName) ? 'selected' : ''}`}
                        style={{
                          position: 'absolute',
                          left: '16px',
                          width: '22px',
                          height: '22px',
                          minWidth: '22px',
                          borderRadius: '6px',
                          border: selectedBanks.includes(bank.bankName) ? '2px solid #ffffff' : '2px solid rgba(255, 255, 255, 0.7)',
                          background: selectedBanks.includes(bank.bankName) ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          boxShadow: selectedBanks.includes(bank.bankName) ? '0 2px 8px rgba(0, 0, 0, 0.2)' : 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {selectedBanks.includes(bank.bankName) && <span style={{ color: '#1E40AF', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                      </div>
                    )}

                    <h4>{bank.bankName}</h4>

                    {!bank.eligible && (
                      <div 
                        className="status-badge rejected" 
                        style={{ 
                          position: 'absolute', 
                          right: '16px',
                          background: (bank.btNotAllowed || bank.isBTMode || bank.reason?.toLowerCase().includes('not allow') || bank.reason?.toLowerCase().includes('fresh funding')) ? '#FEE2E2' : undefined,
                          color: (bank.btNotAllowed || bank.isBTMode || bank.reason?.toLowerCase().includes('not allow') || bank.reason?.toLowerCase().includes('fresh funding')) ? '#B91C1C' : undefined,
                          border: '1px solid #FCA5A5',
                          fontWeight: 700
                        }}
                      >
                        {(bank.btNotAllowed || bank.isBTMode || bank.reason?.toLowerCase().includes('not allow') || bank.reason?.toLowerCase().includes('fresh funding')) ? '✕ Not Allowed' : '✕ Ineligible'}
                      </div>
                    )}
                  </div>

                  <div className="bank-card-body">
                    {bank.eligible ? (
                      <>
                        {/* CAPPING ALERTS */}
                        {(bank.loanCappedByBank || bank.bachelorCapped) && (
                          <div className="capping-alert-box" style={{ 
                            background: '#FFF4EC', 
                            border: '1px solid #FED7AA', 
                            padding: '12px', 
                            borderRadius: '10px', 
                            marginBottom: '15px' 
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F58220', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                              <span style={{ fontSize: '1.1rem' }}>⚠️</span> 
                              {bank.bachelorCapped ? 'BACHELOR LIMIT APPLIED' : 'BANK MAXIMUM CAP APPLIED'}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'rgb(66, 66, 66)' }}>
                              Total Eligibility: <span style={{ textDecoration: 'line-through' }}>{formatCurrency(bank.calculatedLoanBeforeCap || bank.regularMaxLoan)}</span>
                            </div>
                            {bank.bachelorCapped && bank.bachelorCapReason && (
                              <div style={{ fontSize: '0.72rem', marginTop: '4px', fontStyle: 'italic', color: 'rgb(66, 66, 66)' }}>
                                Reason: {bank.bachelorCapReason}
                              </div>
                            )}
                          </div>
                        )}

                        {/* SPECIAL POLICY NOTES (E.G. FORM 16 VERIFICATION FOR FINNABLE) */}
                        {bank.form16Note && (
                          <div className="policy-note-box" style={{
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            marginBottom: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#166534',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}>
                            <span style={{ fontSize: '1.1rem' }}>📋</span>
                            <span>{bank.form16Note}</span>
                          </div>
                        )}

                        {/* BT MODE DISPLAY */}
                        {(!isODMode && (bank.isBTMode || bank.btType?.includes('BT') || bank.calculationMethod?.includes('BT'))) ? (
                          <div className="bt-mode-display" style={{ background: '#EEF3FA', border: '1px solid #BFDBFE', padding: '14px 16px', borderRadius: '10px', marginBottom: '16px' }}>
                            <div className="bt-badge" style={{ fontSize: '0.75rem', fontWeight: 750, color: '#1E40AF', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Liability Consolidation</div>
                            <div className="bt-breakdown" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div className="bt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                                <span className="bt-label" style={{ color: 'rgb(66, 66, 66)', fontWeight: 500 }}>Total Loan Amount</span>
                                <span className="bt-value" style={{ fontWeight: 750, color: '#1E40AF' }}>{formatCurrency(bank.loanAmount)}</span>
                              </div>
                              <div className="bt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'rgb(66, 66, 66)' }}>
                                <span className="bt-label" style={{ fontWeight: 500 }}>Existing Liabilities Clear</span>
                                <span className="bt-value" style={{ fontWeight: 750 }}>- {formatCurrency(bank.totalDebtCleared || bank.btTotalOutstanding)}</span>
                              </div>
                              <div style={{ height: '1px', background: '#BFDBFE', margin: '4px 0' }}></div>
                              <div className="bt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', color: '#1E40AF', fontWeight: 800 }}>
                                <span className="bt-label">Net Disbursement</span>
                                <span className="bt-value">{formatCurrency(bank.freshAmountDisbursed)}</span>
                              </div>
                            </div>
                          </div>
                        ) : bank.isTopUp ? (
                          <div className="topup-mode-display" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '14px 16px', borderRadius: '10px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 750, color: '#047857', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top-Up Calculation (E - L)</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                                <span style={{ color: 'rgb(66, 66, 66)', fontWeight: 500 }}>Total Bank Capacity (E)</span>
                                <span style={{ fontWeight: 750, color: '#047857' }}>{formatCurrency(bank.totalCapacity)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'rgb(66, 66, 66)' }}>
                                <span style={{ fontWeight: 500 }}>Running Loan Outstanding (L)</span>
                                <span style={{ fontWeight: 750 }}>- {formatCurrency(bank.runningLoanOutstanding)}</span>
                              </div>
                              <div style={{ height: '1px', background: '#A7F3D0', margin: '4px 0' }}></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', color: '#047857', fontWeight: 800 }}>
                                <span>Approved Top-Up Disbursal</span>
                                <span>{formatCurrency(bank.loanAmount)}</span>
                              </div>
                            </div>
                          </div>
                        ) : ((isODMode || bank.isOD) && (isODBT || bank.isODBT)) ? (
                          <div className="od-bt-display" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '14px 16px', borderRadius: '10px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 750, color: '#047857', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OD Balance Transfer & Debt Takeover</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                                <span style={{ color: 'rgb(66, 66, 66)', fontWeight: 500 }}>Total Sanctioned OD Limit</span>
                                <span style={{ fontWeight: 750, color: '#047857' }}>{formatCurrency(bank.totalSanctionedLimit || bank.odLimit)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'rgb(66, 66, 66)' }}>
                                <span style={{ fontWeight: 500 }}>Existing Debt Cleared (POS)</span>
                                <span style={{ fontWeight: 750, color: '#DC2626' }}>- {formatCurrency(bank.debtClearedPOS || bank.utilizedODLimit)}</span>
                              </div>
                              <div style={{ height: '1px', background: '#A7F3D0', margin: '4px 0' }}></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', color: '#0284C7', fontWeight: 800 }}>
                                <span>Available Free OD Limit</span>
                                <span>{formatCurrency(bank.availableODLimit)}</span>
                              </div>
                              <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#065F46', background: '#D1FAE5', padding: '4px 8px', borderRadius: '4px', fontWeight: 650, display: 'flex', justifyContent: 'space-between' }}>
                                <span>Interest on Used Balance:</span>
                                <span style={{ fontWeight: 800 }}>₹{Number(bank.monthlyInterestOnUsed || 0).toLocaleString('en-IN')}/mo</span>
                              </div>
                            </div>
                          </div>
                        ) : (isODMode || bank.isOD) ? (
                          <div className="main-amount">
                            <span className="label" style={{ color: '#059669', fontWeight: 700 }}>Sanctioned OD Limit</span>
                            <span className="amount" style={{ color: '#059669' }}>{formatCurrency(bank.odLimit || bank.loanAmount)}</span>
                            <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>
                              ⚡ Revolving Credit • Zero Fixed EMI
                            </div>
                          </div>
                        ) : (
                          <div className="main-amount">
                            <span className="label">Approved Loan Amount</span>
                            <span className="amount">{formatCurrency(bank.loanAmount)}</span>
                          </div>
                        )}

                        {/* DETAILED ANALYSIS SECTION */}
                        <div className="detailed-analysis-section" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                          {(() => {
                            const method = (bank.calculationMethod || '').toLowerCase();
                            const isCombined = method.includes('combined') || method.includes('dual') || method.includes('both');
                            const isFoir = method.includes('foir');
                            const isMultiplier = method.includes('multiplier');
                            
                            const showFoir = isCombined || isFoir || (!isMultiplier);
                            const showMultiplier = isCombined || isMultiplier || (!isFoir);
                            
                            return (
                              <div className="details-expanded-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: '10px' }}>
                                <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                  <span className="d-label" style={{ color: 'rgb(66, 66, 66)', fontWeight: 500 }}>Company Tier</span>
                                  <span className="d-value" style={{ fontWeight: 700, color: 'rgb(66, 66, 66)' }}>Category {bank.category || 'A'}</span>
                                </div>
                                
                                {showFoir && bank.details?.foirPercentage && (
                                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span className="d-label" style={{ color: 'rgb(66, 66, 66)', fontWeight: 500 }}>FOIR Cap</span>
                                    <span className="d-value" style={{ fontWeight: 700, color: '#1E40AF' }}>{bank.details.foirPercentage}</span>
                                  </div>
                                )}

                                {showMultiplier && bank.details?.multiplier && (
                                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span className="d-label" style={{ color: 'rgb(66, 66, 66)', fontWeight: 500 }}>Multiplier</span>
                                    <span className="d-value" style={{ fontWeight: 700, color: '#1E40AF' }}>{bank.details.multiplier}</span>
                                  </div>
                                )}

                                {(bank.incentiveConsidered > 0 || bank.details?.incentiveConsidered > 0) && (
                                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#1E40AF' }}>
                                    <span className="d-label" style={{ fontWeight: 500 }}>Incentive Credit</span>
                                    <span className="d-value" style={{ fontWeight: 750 }}>+{formatNumber(bank.incentiveConsidered || bank.details.incentiveConsidered)}</span>
                                  </div>
                                )}

                                {(bank.ccObligation > 0 || bank.details?.creditCardObligation > 0) && (
                                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'rgb(66, 66, 66)' }}>
                                    <span className="d-label" style={{ fontWeight: 500 }}>CC Obligation Deduction</span>
                                    <span className="d-value" style={{ fontWeight: 750 }}>-{formatNumber(bank.ccObligation || bank.details.creditCardObligation)}</span>
                                  </div>
                                )}

                                {bank.nonSelectedEMI > 0 && (
                                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'rgb(66, 66, 66)' }}>
                                    <span className="d-label" style={{ fontWeight: 500 }}>External EMI Adjustment</span>
                                    <span className="d-value" style={{ fontWeight: 750 }}>-{formatNumber(bank.nonSelectedEMI)}</span>
                                  </div>
                                )}
                                
                                {bank.details?.limitingFactor && (
                                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '4px' }}>
                                    <span className="d-label" style={{ color: 'rgb(66, 66, 66)', fontWeight: 500 }}>Limiting Parameter</span>
                                    <span className="d-value" style={{ color: '#F58220', fontWeight: 700 }}>{bank.details.limitingFactor}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="rejected-body">
                        {(bank.btNotAllowed || bank.isBTMode || bank.reason?.toLowerCase().includes('not allow') || bank.reason?.toLowerCase().includes('fresh funding')) ? (
                          <div style={{
                            background: '#FEF2F2',
                            border: '1.5px solid #F87171',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            marginBottom: '10px'
                          }}>
                            <div style={{ color: '#991B1B', fontWeight: 800, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span>🚫</span>
                              <span>Not Allowed</span>
                            </div>
                            <div style={{ color: '#B91C1C', fontSize: '0.82rem', lineHeight: '1.4' }}>
                              {bank.reason || 'Balance Transfer is not permitted as per bank policy.'}
                            </div>
                          </div>
                        ) : (
                          <div className="rejection-reason">
                            <span style={{ fontWeight: 'bold' }}>Exclusion:</span> {bank.reason || 'Criteria mismatch'}
                          </div>
                        )}
                        {bank.category && (
                          <div className="rejected-meta" style={{ marginTop: '8px', color: 'rgb(66, 66, 66)', fontSize: '0.78rem' }}>
                            Identified Profile: Category {bank.category}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="details-grid">
                    {((isODMode || bank.isOD) && (isODBT || bank.isODBT)) ? (
                      <>
                        <div className="detail">
                          <span className="detail-label" style={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                            USED LIMIT INTEREST
                          </span>
                          <span className="detail-value" style={{ color: '#059669', fontWeight: 800 }}>
                            ₹{Number(bank.monthlyInterestOnUsed || 0).toLocaleString('en-IN')}/mo
                          </span>
                        </div>
                        <div className="detail">
                          <span className="detail-label" style={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                            OD ROI
                          </span>
                          <span className="detail-value" style={{ color: '#059669', fontWeight: 800 }}>{bank.interestRate}%</span>
                        </div>
                        <div className="detail">
                          <span className="detail-label" style={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                            FREE LIMIT
                          </span>
                          <span className="detail-value" style={{ color: '#0284C7', fontWeight: 800 }}>{formatCurrency(bank.availableODLimit)}</span>
                        </div>
                      </>
                    ) : (isODMode || bank.isOD) ? (
                      <>
                        <div className="detail">
                          <span className="detail-label" style={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                            DAILY PER ₹1L
                          </span>
                          <span className="detail-value" style={{ color: '#059669', fontWeight: 800 }}>
                            ₹{bank.dailyInterestPerLakh || Math.round((100000 * ((bank.interestRate || 10.75) / 100)) / 365)}/day
                          </span>
                        </div>
                        <div className="detail">
                          <span className="detail-label" style={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                            OD ROI
                          </span>
                          <span className="detail-value" style={{ color: '#059669', fontWeight: 800 }}>{bank.interestRate}%</span>
                        </div>
                        <div className="detail">
                          <span className="detail-label" style={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                            FACILITY
                          </span>
                          <span className="detail-value" style={{ color: '#1E40AF', fontWeight: 750 }}>Flexi OD</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="detail">
                          <span className="detail-label" style={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                            {bank.isTopUp ? 'TOP-UP EMI' : 'EMI'}
                          </span>
                          <span className="detail-value" style={{ color: '#1E40AF' }}>
                            {formatNumber(bank.monthlyEMI)}
                          </span>
                        </div>
                        <div className="detail">
                          <span className="detail-label" style={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                            MIN ROI
                          </span>
                          <span className="detail-value" style={{ color: '#F58220' }}>{bank.interestRate}%</span>
                        </div>
                        <div className="detail">
                          <span className="detail-label" style={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                            MAX TENURE
                          </span>
                          <span className="detail-value" style={{ color: 'rgb(66, 66, 66)' }}>{bank.maxTenure || bank.loanTenure || bank.tenure}Y</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Floating Submit Bar */}
      {eligibleBanks.length > 0 && (
        <div className="selection-submit-bar">
          <div>
            <div style={{ color: '#111827', fontWeight: 750, fontSize: '1rem', fontFamily: 'Outfit, sans-serif' }}>
              {selectedBanks.length} Bank{selectedBanks.length !== 1 ? 's' : ''} Selected
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Select the banks you prefer to proceed with
            </div>
          </div>

          <button 
            onClick={handleSubmitSelection}
            disabled={selectedBanks.length === 0 || submitting}
            className="table-submit-btn"
            style={{ margin: 0 }}
          >
            {submitting ? 'Processing...' : 'Proceed with Selected Banks'}
          </button>
        </div>
      )}

      {/* Submission Status Overlay */}
      {submitStatus && (
        <div className="status-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#ffffff',
            border: `2px solid ${submitStatus === 'success' ? '#16a34a' : '#ef4444'}`,
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            maxWidth: '500px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            color: '#111827'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>
              {submitStatus === 'success' ? '✅' : '❌'}
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '10px', color: '#111827', fontFamily: 'Outfit, sans-serif', fontWeight: 750 }}>
              {submitStatus === 'success' ? 'Application Received!' : 'Submission Failed'}
            </h3>
            <p style={{ color: '#4b5563', marginBottom: '30px', fontSize: '0.95rem' }}>
              {submitStatus === 'success' 
                ? 'Your preferred banks have been notified. Our customer support team will contact you shortly to process your application.'
                : 'There was an error communicating with our server. Please try again or contact support.'}
            </p>
            <button 
              onClick={() => setSubmitStatus(null)}
              style={{
                background: '#F58220',
                color: '#ffffff',
                border: 'none',
                padding: '12px 36px',
                borderRadius: '50px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerResultsDisplay;
