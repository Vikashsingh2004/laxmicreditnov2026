// ============================================================
//  LEAD SERVICE - LOCAL, FIREBASE FIRESTORE & GOOGLE SHEETS SYNC
// ============================================================
import { db } from '../config/firebase.js';
import { doc, setDoc } from 'firebase/firestore';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzgAGkw2nw1MdYob_-liwla8M79HQVnqgZKhxFJ_unSsFo0q2aM2cWlwlKTeZpCi2K0og/exec';

// Helper for standardized short bank names
export const getBankShortName = (bankName) => {
    if (!bankName) return '';
    const s = String(bankName).trim();
    const lower = s.toLowerCase();
    if (lower.includes('kotak')) return 'Kotak';
    if (lower.includes('hdfc')) return 'HDFC';
    if (lower.includes('icici')) return 'ICICI';
    if (lower.includes('tata')) return 'Tata';
    if (lower.includes('idfc')) return 'IDFC';
    if (lower.includes('poonawala') || lower.includes('poonawalla')) return 'Poonawala';
    if (lower.includes('axis')) return 'Axis';
    if (lower.includes('indusind')) return 'IndusInd';
    if (lower.includes('bandhan')) return 'Bandhan';
    if (lower.includes('chola') || lower.includes('cholamandalam')) return 'Chola';
    if (lower.includes('shri') || lower.includes('shriram')) return 'Shriram';
    if (lower.includes('piramal')) return 'Piramal';
    if (lower.includes('sbi')) return 'SBI';
    return s.replace(/ Bank| Finance| Capital/gi, '').trim();
};

export const STANDARD_ALL_BANKS_SHORT = 'HDFC, ICICI, Kotak, Tata, IDFC, Poonawala, Axis, IndusInd, Bandhan, Chola, Piramal, Shriram';

export const formatBanksShortList = (banksInput) => {
    if (!banksInput || banksInput === 'None Selected' || banksInput === 'Pending Customer Selection' || banksInput === 'None') {
        return '';
    }
    if (banksInput === 'All Applicable' || banksInput === 'All Eligible') {
        return STANDARD_ALL_BANKS_SHORT;
    }
    const arr = Array.isArray(banksInput) ? banksInput : String(banksInput).split(',');
    const shortNames = arr.map(b => getBankShortName(b)).filter(Boolean);
    return shortNames.length > 0 ? shortNames.join(', ') : '';
};

/**
 * Strict Genuine Customer Lead Verification
 * Rejects test entries, dummy numbers, bot scripts, and placeholders
 */
export const isGenuineCustomerLead = (lead) => {
    if (!lead) return false;

    // 1. Mobile verification: strictly 10 digits starting with 6, 7, 8, or 9
    const mobile = String(lead.mobile || '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(mobile)) {
        return false;
    }

    // Reject obvious test / mock / repeating numbers
    const dummyNumbers = new Set([
        '9876543210', '1234567890', '9999999999', '8888888888', '7777777777',
        '6666666666', '9898989898', '9123456789', '9000000000', '9800000000',
        '9876501234', '9812345678', '9876598765'
    ]);
    if (dummyNumbers.has(mobile)) {
        return false;
    }

    // Reject all-identical digits e.g. 9999999999
    if (/^(\d)\1{9}$/.test(mobile)) {
        return false;
    }

    // 2. Name verification: must have at least 2 real alphabetic characters
    const rawName = String(lead.name || '').trim();
    if (rawName.length < 2) {
        return false;
    }
    const lowerName = rawName.toLowerCase();
    const dummyNames = [
        'customer', 'anonymous', 'anonymous customer', 'test', 'tester', 'dummy',
        'applicant', 'user', 'admin', 'na', 'n/a', 'none', 'asdf', 'qwerty', 'xyz',
        'test user', 'dummy user', 'testing'
    ];
    if (dummyNames.includes(lowerName)) {
        return false;
    }

    // Reject if name has no letters at all (e.g. "12345")
    if (!/[a-zA-Z]/.test(rawName)) {
        return false;
    }

    // 3. Basic salary check: must be at least ₹25,000 as per institutional policy
    const salary = Number(lead.basicSalary || lead.totalIncome || 0);
    if (salary < 25000) {
        return false;
    }

    return true;
};

/**
 * Saves a lead safely to:
 * 1. LocalStorage (immediate offline/local persistence)
 * 2. Firebase Firestore 'leads' collection (immediate cloud database sync)
 * 3. Google Sheets (non-blocking background sync)
 *
 * @param {Object} formData  - raw formData state from CustomerLoanForm
 * @param {Object} submissionData - the processed submission sent to loan engine
 * @param {String|Array} eligibleBanks - list of banks customer is eligible for
 * @param {Array} [calculationResults] - optional pre-calculated bank eligibility matrix
 */
export const saveLead = async (formData = {}, submissionData = {}, eligibleBanks = '', calculationResults = null) => {
    try {
        const rawForm = formData || {};
        const subData = submissionData || {};
        const metaData = subData._metadata || {};

        // ── Unified Customer Info ────────────────────────────────────────────
        const customerName = (rawForm.customerName || metaData.customerName || subData.customerName || '').trim();
        const mobileNumber = (rawForm.mobileNumber || metaData.mobileNumber || subData.mobileNumber || '').trim();
        const employmentType = rawForm.employmentType || metaData.employmentType || subData.employmentType || 'salaried';

        let companyName = (rawForm.companyName || metaData.companyName || subData.companyName || '').trim();
        if (employmentType === 'government') {
            companyName = companyName && companyName !== 'LaxmiCredit'
                ? companyName
                : 'Government Employee (Central/State)';
        } else if (!companyName || companyName.toLowerCase() === 'laxmicredit') {
            companyName = 'Private Enterprise (Unlisted)';
        }

        const category = rawForm.category || metaData.category || subData.category || (employmentType === 'government' ? 'GOVT' : 'B');
        const basicSalary = Number(rawForm.basicSalary || metaData.basicSalary || subData.basicSalary || 0);
        const monthlyIncome = Number(subData.monthlyIncome || rawForm.totalMonthlyIncome || rawForm.monthlyIncome || basicSalary || 0);
        const existingEMI = Number(subData.existingEMI || rawForm.existingEMI || 0);

        // ── STRICT GENUINE LEAD FILTER ────────────────────────────────────────
        // Reject mock/dummy leads, test scripts, and placeholder submissions
        const testPayload = {
            name: customerName,
            mobile: mobileNumber,
            basicSalary: basicSalary,
            totalIncome: monthlyIncome
        };

        if (!isGenuineCustomerLead(testPayload)) {
            console.log(`ℹ️ [leadService] Ignored non-genuine/test lead entry: "${customerName}" (${mobileNumber})`);
            return null;
        }

        // ── Build existing loans summary safely ──────────────────────────────
        const existingLoans = subData.loansForBT || metaData.existingLoans || rawForm.existingLoans || [];
        const loansArr = Array.isArray(existingLoans) ? existingLoans : [];

        const personalLoans = loansArr
            .filter(l => l && l.type !== 'Credit Card')
            .map(l => `${l.lender || 'Unknown'} (EMI: ₹${l.monthlyEMI || 0}, POS: ₹${l.outstandingAmount || 0})`)
            .join(' | ') || 'None';

        const creditCards = loansArr
            .filter(l => l && l.type === 'Credit Card')
            .map(l => `${l.lender || 'Unknown'} (Used: ₹${l.creditLimitUsed || 0})`)
            .join(' | ') || 'None';

        // Balance Transfer is only YES if customer actually has existing loans or non-zero EMI
        const hasLiabilities = loansArr.length > 0 || existingEMI > 0;
        const wantsBT = ((subData.wantsBT || rawForm.wantsBT) && hasLiabilities) ? 'Yes' : 'No';

        // ── Determine Accurate Product Mode & Label ───────────────────────────
        const rawMode = rawForm.mode || rawForm.productMode || subData.mode || subData.productMode || metaData.mode || metaData.productMode || 'pl';
        const isBT = wantsBT === 'Yes' || Boolean(subData.isBTMode || rawForm.isBTMode || metaData.isBTMode);

        let productType = 'Personal Loan (Fresh)';
        let productCode = 'PL';

        if (rawMode === 'topup' || subData.isTopUp || rawForm.isTopUp || metaData.isTopUp) {
            productType = 'Top-Up Loan';
            productCode = 'TOPUP';
        } else if (rawMode === 'od' || subData.isOD || rawForm.isOD || metaData.isOD) {
            if (isBT && hasLiabilities) {
                productType = 'Overdraft (OD BT / Takeover)';
                productCode = 'OD_BT';
            } else {
                productType = 'Overdraft Facility (OD)';
                productCode = 'OD';
            }
        } else if (isBT && hasLiabilities) {
            productType = 'Personal Loan (BT)';
            productCode = 'PL_BT';
        } else {
            productType = 'Personal Loan (Fresh)';
            productCode = 'PL';
        }

        // Format eligible banks list
        const eligibleBanksArr = Array.isArray(eligibleBanks)
            ? eligibleBanks
            : (eligibleBanks ? String(eligibleBanks).split(',') : []);
        const formattedEligibleBanks = formatBanksShortList(eligibleBanksArr);

        // Selected banks: ONLY set if customer actually selected banks
        const selectedBanksArr = Array.isArray(subData.selectedBanks)
            ? subData.selectedBanks
            : (Array.isArray(rawForm.selectedBanks) ? rawForm.selectedBanks : []);
        const formattedSelectedBanks = selectedBanksArr.length > 0
            ? formatBanksShortList(selectedBanksArr)
            : 'Pending Customer Selection';

        const now = new Date();
        const leadId = Date.now();
        const leadDocId = mobileNumber ? `lead_${mobileNumber.replace(/\D/g, '')}` : `lead_${leadId}`;

        // ── Build the lead payload ────────────────────────────────────────────
        const lead = {
            id: leadId,
            docId: leadDocId,
            timestamp: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            createdAt: now.toISOString(),
            name: customerName,
            mobile: mobileNumber,
            mode: rawMode,
            productCode: productCode,
            productType: productType,
            basicSalary: basicSalary,
            incentive1: Number(rawForm.incentiveMonth1 || metaData.incentiveMonth1 || 0),
            incentive2: Number(rawForm.incentiveMonth2 || metaData.incentiveMonth2 || 0),
            incentive3: Number(rawForm.incentiveMonth3 || metaData.incentiveMonth3 || 0),
            totalIncome: monthlyIncome,
            company: companyName,
            category: category,
            employment: employmentType,
            existingEMI: existingEMI,
            wantsBT: wantsBT,
            personalLoans: personalLoans,
            creditCards: creditCards,
            state: rawForm.state || metaData.state || subData.state || '',
            city: rawForm.city || metaData.city || subData.city || '',
            age: rawForm.age || metaData.age || subData.age || '',
            salaryMode: rawForm.salaryMode || metaData.salaryMode || subData.salaryMode || 'Bank Transfer',
            maritalStatus: rawForm.maritalStatus || metaData.maritalStatus || subData.maritalStatus || '',
            livingStatus: rawForm.livingStatus || metaData.livingStatus || subData.livingStatus || '',
            status: selectedBanksArr.length > 0 ? 'Selected' : 'New',
            selectedBanks: formattedSelectedBanks,
            eligibleBanks: formattedEligibleBanks,
            calculationResults: Array.isArray(calculationResults) && calculationResults.length > 0 
                ? JSON.parse(JSON.stringify(calculationResults)) 
                : null
        };

        // ── STEP 1: PERSIST LOCALLY (IMMEDIATE) ───────────────────────────────
        try {
            const localLeads = JSON.parse(localStorage.getItem('laxmi_leads') || '[]');
            // Replace if same mobile exists, or prepend
            const filtered = localLeads.filter(l => l.mobile !== lead.mobile);
            filtered.unshift(lead);
            localStorage.setItem('laxmi_leads', JSON.stringify(filtered.slice(0, 200)));

            const customerDb = JSON.parse(localStorage.getItem('laxmi_customer_database') || '[]');
            customerDb.unshift({
                ...lead,
                id: `CUST-${leadId}`,
                rawInputs: rawForm
            });
            localStorage.setItem('laxmi_customer_database', JSON.stringify(customerDb.slice(0, 200)));
            console.log('💾 Lead saved locally to laxmi_leads and laxmi_customer_database');
        } catch (localErr) {
            console.warn('⚠️ LocalStorage save error:', localErr);
        }

        // ── STEP 2: FIREBASE FIRESTORE SYNC (CLOUD REALTIME DATABASE) ─────────
        try {
            await setDoc(doc(db, 'leads', leadDocId), lead, { merge: true });
            console.log('🔥 Lead successfully saved to Cloud Firestore:', leadDocId);
        } catch (fsErr) {
            console.error('❌ Firestore lead save error:', fsErr);
        }

        // Notify any active window listeners
        try {
            window.dispatchEvent(new Event('storage'));
        } catch (e) { }

        // ── STEP 3: GOOGLE SHEETS SYNC (NON-BLOCKING BACKGROUND) ──────────────
        if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== 'PASTE_YOUR_APPS_SCRIPT_URL_HERE') {
            fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(lead),
            }).then(() => console.log('✅ Google Sheets synced'))
                .catch(e => console.warn('⚠️ Google Sheets background sync notice:', e));
        }

        return lead;
    } catch (err) {
        console.error('❌ leadService: Failed to save lead:', err);
    }
};

/**
 * Updates or creates lead with customer's bank selection.
 * Called when user clicks "Proceed with Selected Banks".
 *
 * @param {Object} metadata       - from CustomerResultsDisplay props (has name, mobile, etc.)
 * @param {Array}  selectedBanks  - array of bank name strings user selected
 */
export const saveSelectedBanks = async (metadata = {}, selectedBanks = []) => {
    try {
        const meta = metadata || {};
        const customerName = meta.customerName || meta.name || 'Anonymous Customer';
        const mobileNumber = meta.mobileNumber || meta.mobile || '';
        const selectedBanksStr = Array.isArray(selectedBanks) ? selectedBanks.join(', ') : String(selectedBanks || '');

        const rawMode = meta.mode || meta.productMode || 'pl';
        const isBT = meta.wantsBT === 'Yes' || meta.wantsBT === true || meta.isBTMode;
        let productType = 'Personal Loan (Fresh)';
        let productCode = 'PL';
        if (rawMode === 'topup' || meta.isTopUp) {
            productType = 'Top-Up Loan';
            productCode = 'TOPUP';
        } else if (rawMode === 'od' || meta.isOD) {
            productType = isBT ? 'Overdraft (OD BT / Takeover)' : 'Overdraft Facility (OD)';
            productCode = isBT ? 'OD_BT' : 'OD';
        } else if (isBT) {
            productType = 'Personal Loan (BT)';
            productCode = 'PL_BT';
        }

        const payload = {
            action: 'bank_selection',
            timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            updatedAt: new Date().toISOString(),
            name: customerName,
            mobile: mobileNumber,
            selectedBanks: selectedBanksStr,
            bankCount: Array.isArray(selectedBanks) ? selectedBanks.length : 1,
            totalIncome: Number(meta.totalIncome || meta.monthlyIncome || 0),
            company: meta.companyName || meta.company || '',
            state: meta.state || '',
            city: meta.city || '',
            mode: rawMode,
            productCode: productCode,
            productType: productType,
            status: 'Selected'
        };

        const leadDocId = mobileNumber ? `lead_${mobileNumber.replace(/\D/g, '')}` : `lead_${Date.now()}`;

        // ── STEP 1: UPDATE LOCAL PERSISTENCE ─────────────────────────────────
        try {
            const localLeads = JSON.parse(localStorage.getItem('laxmi_leads') || '[]');
            let found = false;
            const updatedLeads = localLeads.map(l => {
                if (mobileNumber && l.mobile === mobileNumber) {
                    found = true;
                    return { ...l, selectedBanks: selectedBanksStr, status: 'Selected' };
                }
                return l;
            });

            if (!found) {
                updatedLeads.unshift({
                    id: Date.now(),
                    docId: leadDocId,
                    ...payload
                });
            }

            localStorage.setItem('laxmi_leads', JSON.stringify(updatedLeads));
            console.log('💾 Local lead updated with bank selections:', selectedBanksStr);
        } catch (localErr) {
            console.warn('⚠️ Could not update local lead:', localErr);
        }

        // ── STEP 2: UPDATE FIREBASE FIRESTORE (CLOUD REALTIME DATABASE) ───────
        try {
            await setDoc(doc(db, 'leads', leadDocId), {
                ...payload,
                docId: leadDocId
            }, { merge: true });
            console.log('🔥 Selected banks saved to Cloud Firestore:', leadDocId);
        } catch (fsErr) {
            console.error('❌ Firestore selection save error:', fsErr);
        }

        // Notify active windows
        try {
            window.dispatchEvent(new Event('storage'));
        } catch (e) { }

        // ── STEP 3: GOOGLE SHEETS (NON-BLOCKING BACKGROUND) ───────────────────
        if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== 'PASTE_YOUR_APPS_SCRIPT_URL_HERE') {
            fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload),
            }).then(() => console.log('✅ Google Sheets bank selection synced'))
                .catch(e => console.warn('⚠️ Google Sheets sync notice:', e));
        }

        return true;
    } catch (err) {
        console.error('❌ leadService: Failed to save bank selection:', err);
        return false;
    }
};
