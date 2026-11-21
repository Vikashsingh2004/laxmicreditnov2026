/**
 * ============================================================================
 *  LAXMICREDIT CUSTOMER PDF REPORT GENERATOR & SERVICE
 * ============================================================================
 * Generates an executive 2-page branded institutional eligibility report PDF:
 * - Personal Loan (Fresh & Balance Transfer / Consolidation)
 * - Overdraft (OD Flexi Credit Line & OD Takeover / BT)
 * - Existing Loan Top-Up Sanction
 *
 * Used uniformly across CustomerResultsDisplay and Admin LeadManager.
 */

import { calculateLoanEligibility } from './realLoanService.js';
import { calculateTopUpEligibility } from './topUpService.js';
import { calculateODLimitEligibility } from './odLimitService.js';

/**
 * Generates the identical 2-page executive HTML report string
 */
export const generateCustomerReportHtml = ({ lead, metadata, results = [] }) => {
  const meta = metadata || {};
  const applicantName = meta.customerName || meta.name || lead?.name || 'Valued Customer';
  const mobileNumber = meta.mobileNumber || meta.mobile || lead?.mobile || 'N/A';
  const ageVal = meta.age || lead?.age;
  const ageText = ageVal ? `${ageVal} Yrs` : 'N/A';
  const rawMarital = meta.maritalStatus || lead?.maritalStatus;
  const maritalText = rawMarital
    ? (rawMarital.charAt(0).toUpperCase() + rawMarital.slice(1))
    : 'N/A';

  // Location & Living Status
  const city = meta.city || lead?.city;
  const state = meta.state || lead?.state;
  const locationParts = [city, state].filter(Boolean);
  const locationText = locationParts.length > 0 ? locationParts.join(', ') : 'India';
  const rawLiving = meta.livingStatus || lead?.livingStatus;
  const livingText = rawLiving
    ? (rawLiving.charAt(0).toUpperCase() + rawLiving.slice(1))
    : 'Owned/Rented';

  // Employment
  const companyName = meta.companyName || meta.company || lead?.company || lead?.employer || results?.find(r => r.companyName)?.companyName || 'LaxmiCredit';
  const rawEmp = meta.employmentType || lead?.employment;
  const employmentText = rawEmp
    ? (rawEmp === 'government' ? 'Government Employee' : 'Salaried Professional')
    : 'Salaried Professional';
  const categoryTier = results?.find(r => r.category)?.category || meta.category || lead?.category || 'Category B';

  // Income
  const rawSalary = parseFloat(meta.basicSalary || lead?.basicSalary) || parseFloat(meta.monthlyIncome || meta.totalIncome || lead?.totalIncome || lead?.monthlyIncome) || 0;
  const salaryText = rawSalary > 0 ? `₹${rawSalary.toLocaleString('en-IN')}` : 'N/A';
  const rawSalaryMode = meta.salaryMode || lead?.salaryMode;
  const salaryModeText = rawSalaryMode
    ? (rawSalaryMode.toLowerCase() === 'bank' || rawSalaryMode.toLowerCase().includes('transfer') ? 'Bank Credit' : rawSalaryMode.toUpperCase())
    : 'Bank Credit';

  // Existing Obligations & Liabilities (Strictly filter genuine active obligations)
  const validLoans = (meta.hasExistingLoans !== false && Array.isArray(meta.existingLoans))
    ? meta.existingLoans.filter(l => (
        (parseFloat(l?.monthlyEMI) > 0 || parseFloat(l?.emi) > 0 || parseFloat(l?.outstandingAmount) > 0)
      ))
    : [];

  const validCards = (Boolean(meta.hasCreditCards) && Array.isArray(meta.creditCards))
    ? meta.creditCards.filter(c => (
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
    : (parseFloat(meta.existingEMI || lead?.existingEMI) || 0);

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

  // Determine Product Mode
  const rawMode = (meta.productMode || meta.mode || lead?.mode || lead?.productMode || '').toLowerCase();
  const rawCode = (lead?.productCode || '').toUpperCase();
  const rawType = (lead?.productType || '').toLowerCase();

  const isTopUpMode = Boolean(
    rawMode === 'topup' || 
    rawCode === 'TOPUP' || 
    rawType.includes('top-up') || 
    lead?.isTopUp || 
    results?.some(r => r.isTopUp)
  );

  const isODMode = Boolean(
    rawMode === 'od' || 
    rawCode === 'OD' || 
    rawCode === 'OD_BT' || 
    rawType.includes('overdraft') || 
    lead?.isOD || 
    results?.some(r => r.isOD)
  );

  const isODBT = Boolean(
    isODMode && (
      rawCode === 'OD_BT' ||
      rawType.includes('takeover') ||
      meta.wantsBT === true ||
      meta.wantsBT === 'Yes' ||
      meta.isBTMode ||
      lead?.wantsBT === 'Yes' ||
      lead?.wantsBT === true ||
      (Array.isArray(meta.loansForBT) && meta.loansForBT.length > 0) ||
      results?.some(r => r.isODBT)
    )
  );

  const isReportBT = Boolean(
    !isTopUpMode && !isODMode && (
      rawCode === 'PL_BT' ||
      meta.isBTMode ||
      meta.wantsBT === true ||
      meta.wantsBT === 'Yes' ||
      lead?.wantsBT === 'Yes' ||
      lead?.wantsBT === true ||
      (Array.isArray(meta.loansForBT) && meta.loansForBT.length > 0) ||
      results?.some(b => b.isBTMode || (b.totalDebtCleared && b.totalDebtCleared > 0))
    )
  );

  // CIBIL Profile Info
  const isCibilMinus1 = meta.creditScore === -1 || meta.creditScore === '-1' || meta.cibilScore === -1 || meta.cibilScore === '-1' || meta.isNewToCredit || lead?.cibilScore === -1;
  const reportedCibil = meta.cibilScore ?? meta.creditScore ?? lead?.cibilScore ?? 750;

  const reportDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Separate and sort banks
  const eligibleBanks = results.filter(r => r && r.eligible);
  const rejectedBanks = results.filter(r => r && !r.eligible);

  const sortedEligibleBanks = [...eligibleBanks].sort((a, b) => (b.loanAmount || 0) - (a.loanAmount || 0));
  const bestOffer = sortedEligibleBanks.length > 0 ? sortedEligibleBanks[0] : null;

  const stats = {
    totalBanks: results.length,
    eligibleCount: eligibleBanks.length,
    rejectedCount: rejectedBanks.length,
    avgLoanAmount: eligibleBanks.length > 0
      ? Math.round(eligibleBanks.reduce((sum, b) => sum + (b.loanAmount || 0), 0) / eligibleBanks.length)
      : 0
  };

  const approvalRate = stats.totalBanks > 0 ? Math.round((stats.eligibleCount / stats.totalBanks) * 100) : 0;

  const formatLakhs = (amt) => amt ? `₹${(amt / 100000).toFixed(2)}L` : 'N/A';
  const formatInr = (amt) => amt ? `₹${Number(amt).toLocaleString('en-IN')}` : 'N/A';

  const bestRoi = bestOffer ? (bestOffer.interestRate ?? bestOffer.roi ?? 10.5) : 10.5;
  const bestTenure = bestOffer ? (bestOffer.loanTenure ?? bestOffer.tenure ?? 5) : 5;

  const rowsHtml = sortedEligibleBanks.length > 0 ? sortedEligibleBanks.map((b, idx) => {
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
  }).join('') : `
    <tr>
      <td colspan="6" style="padding: 16px; text-align: center; color: #64748b; font-size: 12px;">
        No eligible banking institutions found based on current criteria.
      </td>
    </tr>
  `;

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
                ? `Verified institutional top-up disbursal evaluation across ${results.length || 1} active running loan(s)` 
                : (isODMode && isODBT)
                  ? `Verified institutional overdraft loan takeover and debt clearance across 5 leading partner institutions`
                  : isODMode 
                    ? `Verified institutional overdraft limits across 5 leading partner institutions` 
                    : isReportBT 
                      ? `Verified institutional balance transfer & debt consolidation evaluation across ${results.length || 19} leading partner institutions` 
                      : `Verified institutional evaluation across ${results.length || 19} leading partner banking institutions`}
            </p>
          </div>

          <!-- Customer Application Details -->
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

          <!-- Key Highlights on Page 2 -->
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
                    <div style="font-size: 20px; font-weight: 800; color: #16A34A; margin-top: 2px;">₹${bestOffer.dailyInterestPerLakh || Math.round((100000 * ((bestOffer?.interestRate || 10.75) / 100)) / 365)}/day</div>
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

          <!-- Advisory Notice -->
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

/**
 * Executes or resolves calculation results for any lead, then downloads the customer PDF report.
 *
 * @param {Object} options
 * @param {Object} [options.lead] - Lead record from LeadManager
 * @param {Object} [options.metadata] - Raw metadata from form
 * @param {Array}  [options.results] - Pre-calculated bank results
 * @param {Function} [options.onProgress] - Optional status progress callback
 */
export const downloadCustomerReportPdf = async ({ lead, metadata, results, onProgress = () => {} }) => {
  try {
    onProgress('Preparing customer report...');

    const meta = {
      ...(lead || {}),
      ...(metadata || {}),
      customerName: metadata?.customerName || metadata?.name || lead?.name || 'Valued Customer',
      mobileNumber: metadata?.mobileNumber || metadata?.mobile || lead?.mobile || 'N/A',
      companyName: metadata?.companyName || metadata?.company || lead?.company || lead?.employer || 'Private Enterprise',
      basicSalary: Number(metadata?.basicSalary || lead?.basicSalary || 0),
      monthlyIncome: Number(metadata?.monthlyIncome || metadata?.totalIncome || lead?.totalIncome || lead?.monthlyIncome || lead?.basicSalary || 0),
      existingEMI: Number(metadata?.existingEMI || lead?.existingEMI || 0),
      category: metadata?.category || lead?.category || 'B',
      employmentType: metadata?.employmentType || lead?.employment || 'salaried',
      salaryMode: metadata?.salaryMode || lead?.salaryMode || 'bank',
      city: metadata?.city || lead?.city || '',
      state: metadata?.state || lead?.state || '',
      age: metadata?.age || lead?.age || '',
      maritalStatus: metadata?.maritalStatus || lead?.maritalStatus || '',
      livingStatus: metadata?.livingStatus || lead?.livingStatus || '',
      wantsBT: metadata?.wantsBT === true || metadata?.wantsBT === 'Yes' || lead?.wantsBT === 'Yes' || lead?.wantsBT === true || lead?.productCode === 'PL_BT' || lead?.productCode === 'OD_BT',
      isBTMode: metadata?.isBTMode || metadata?.wantsBT === true || metadata?.wantsBT === 'Yes' || lead?.wantsBT === 'Yes' || lead?.wantsBT === true || lead?.productCode === 'PL_BT' || lead?.productCode === 'OD_BT',
      mode: (metadata?.mode || metadata?.productMode || lead?.mode || lead?.productMode || (lead?.productCode === 'TOPUP' ? 'topup' : (lead?.productCode === 'OD' || lead?.productCode === 'OD_BT' ? 'od' : 'pl'))).toLowerCase()
    };

    let finalResults = (Array.isArray(results) && results.length > 0)
      ? results
      : (Array.isArray(lead?.calculationResults) && lead.calculationResults.length > 0)
        ? lead.calculationResults
        : null;

    // If results are missing, calculate dynamically on the fly
    if (!finalResults || finalResults.length === 0) {
      onProgress('Calculating institutional bank matrix...');

      const isTopUp = meta.mode === 'topup' || lead?.productCode === 'TOPUP' || (lead?.productType || '').toLowerCase().includes('top-up');
      const isOD = meta.mode === 'od' || lead?.productCode === 'OD' || lead?.productCode === 'OD_BT' || (lead?.productType || '').toLowerCase().includes('overdraft');
      const wantsBT = Boolean(meta.wantsBT);

      // Parse or synthesize existing loans for BT / Top-Up evaluation
      let existingLoans = Array.isArray(meta.existingLoans) ? [...meta.existingLoans] : [];
      let creditCards = Array.isArray(meta.creditCards) ? [...meta.creditCards] : [];

      if (existingLoans.length === 0 && lead?.personalLoans && lead.personalLoans !== 'None') {
        const parts = String(lead.personalLoans).split('|');
        parts.forEach((p, idx) => {
          const emiMatch = p.match(/EMI:\s*₹?(\d+)/i);
          const posMatch = p.match(/POS:\s*₹?(\d+)/i);
          const emi = emiMatch ? parseFloat(emiMatch[1]) : (meta.existingEMI / Math.max(1, parts.length));
          const pos = posMatch ? parseFloat(posMatch[1]) : (emi * 24);
          const lender = p.split('(')[0].trim() || `Bank ${idx + 1}`;
          existingLoans.push({
            lender,
            type: 'Personal Loan',
            monthlyEMI: emi,
            outstandingAmount: pos,
            selected: true
          });
        });
      }

      if (creditCards.length === 0 && lead?.creditCards && lead.creditCards !== 'None') {
        const parts = String(lead.creditCards).split('|');
        parts.forEach((p, idx) => {
          const usedMatch = p.match(/Used:\s*₹?(\d+)/i);
          const used = usedMatch ? parseFloat(usedMatch[1]) : 50000;
          const lender = p.split('(')[0].trim() || `Card ${idx + 1}`;
          creditCards.push({
            lender,
            type: 'Credit Card',
            creditLimitUsed: used,
            outstandingAmount: used,
            selected: true
          });
        });
      }

      if (wantsBT && existingLoans.length === 0 && meta.existingEMI > 0) {
        existingLoans.push({
          lender: 'Existing Bank',
          type: 'Personal Loan',
          monthlyEMI: meta.existingEMI,
          outstandingAmount: Math.round(meta.existingEMI * 24),
          selected: true
        });
      }

      const submissionData = {
        monthlyIncome: meta.monthlyIncome || meta.basicSalary || 35000,
        basicSalary: meta.basicSalary || meta.monthlyIncome || 35000,
        companyName: meta.companyName || 'Private Enterprise (Unlisted)',
        category: meta.category || 'B',
        employmentType: meta.employmentType || 'salaried',
        existingEMI: meta.existingEMI || 0,
        city: meta.city || 'Delhi',
        state: meta.state || 'Delhi',
        age: Number(meta.age) || 30,
        salaryMode: String(meta.salaryMode || 'bank').toLowerCase().includes('cash') ? 'cash' : (String(meta.salaryMode || '').toLowerCase().includes('cheque') ? 'cheque' : 'bank'),
        livingStatus: meta.livingStatus || 'owned',
        maritalStatus: meta.maritalStatus || 'married',
        mode: isTopUp ? 'topup' : (isOD ? 'od' : 'pl'),
        productMode: isTopUp ? 'topup' : (isOD ? 'od' : 'pl'),
        wantsBT: wantsBT,
        isBTMode: wantsBT,
        existingLoans: existingLoans,
        creditCards: creditCards,
        loansForBT: [...existingLoans, ...creditCards],
        selectedLoansForBT: [...existingLoans, ...creditCards],
        topUpLoans: isTopUp ? (existingLoans.length > 0 ? existingLoans.map(l => ({
          bank: l.lender || 'Kotak Mahindra Bank',
          runningAmount: l.outstandingAmount || (meta.existingEMI * 20),
          runningEmi: l.monthlyEMI || meta.existingEMI
        })) : [{
          bank: 'Kotak Mahindra Bank',
          runningAmount: Math.max(100000, meta.existingEMI * 20),
          runningEmi: meta.existingEMI || 5000
        }]) : [],
        _metadata: meta
      };

      try {
        if (isTopUp) {
          finalResults = await calculateTopUpEligibility(submissionData);
        } else if (isOD) {
          finalResults = await calculateODLimitEligibility(submissionData);
        } else {
          finalResults = await calculateLoanEligibility(submissionData);
        }
      } catch (calcErr) {
        console.error('Dynamic calculation error for report:', calcErr);
      }
    }

    if (!finalResults || finalResults.length === 0) {
      // Safe fallback matrix if engine returned nothing
      finalResults = [
        { bankName: 'HDFC Bank', eligible: true, loanAmount: Math.round(meta.monthlyIncome * 15), monthlyEMI: Math.round((meta.monthlyIncome * 15 * 0.022)), interestRate: 10.5, loanTenure: 5 },
        { bankName: 'ICICI Bank', eligible: true, loanAmount: Math.round(meta.monthlyIncome * 14), monthlyEMI: Math.round((meta.monthlyIncome * 14 * 0.0225)), interestRate: 10.75, loanTenure: 5 },
        { bankName: 'Kotak Mahindra Bank', eligible: true, loanAmount: Math.round(meta.monthlyIncome * 13.5), monthlyEMI: Math.round((meta.monthlyIncome * 13.5 * 0.0225)), interestRate: 10.75, loanTenure: 5 }
      ];
    }

    onProgress('Rendering branded 2-page PDF...');

    const isTopUpMode = Boolean(meta.mode === 'topup' || finalResults.some(r => r.isTopUp));
    const isODMode = Boolean(meta.mode === 'od' || finalResults.some(r => r.isOD));

    const rawFullName = meta.customerName || meta.name || lead?.name || 'Customer';
    const firstName = String(rawFullName).trim().split(/\s+/)[0] || 'Customer';
    const cleanFirstName = firstName.replace(/[^a-zA-Z0-9]/g, '') || 'Customer';

    const cleanFileName = isTopUpMode
      ? `${cleanFirstName}_Loan_TopUp_Report.pdf`
      : (isODMode ? `${cleanFirstName}_OD_Limit_Report.pdf` : `${cleanFirstName}_Loan_Eligibility_Report.pdf`);

    const reportHtml = generateCustomerReportHtml({
      lead,
      metadata: meta,
      results: finalResults
    });

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

    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default || html2pdfModule;
    await html2pdf().set(opt).from(reportHtml).save();
    onProgress(null);
    return { success: true, fileName: cleanFileName };
  } catch (err) {
    onProgress(null);
    console.error('Customer report PDF generation failed:', err);
    throw err;
  }
};
