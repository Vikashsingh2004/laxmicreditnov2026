import { db } from '../config/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let universalCompanies = [];
const bankDatabases = {
  'kotak': [],
  'tata': [],
  'poonawala': [],
  'idfc': [],
  'hdfc': [],
  'icici': [],
  'chola': [],
  'indusind': [],
  'bandhan': [],
  'lt': [],
  'piramal': [],
  'smfg': [],
  'axis_fin': [],
  'axis_bank': []
};

// Health tracking for production stability
export const dbHealth = {
  universal: { status: 'idle', count: 0, error: null },
  banks: {
    'kotak': { status: 'idle', count: 0 },
    'tata': { status: 'idle', count: 0 },
    'poonawala': { status: 'idle', count: 0 },
    'idfc': { status: 'idle', count: 0 },
    'hdfc': { status: 'idle', count: 0 },
    'icici': { status: 'idle', count: 0 },
    'chola': { status: 'idle', count: 0 },
    'indusind': { status: 'idle', count: 0 },
    'bandhan': { status: 'idle', count: 0 },
    'lt': { status: 'idle', count: 0 },
    'piramal': { status: 'idle', count: 0 },
    'smfg': { status: 'idle', count: 0 },
    'axis_fin': { status: 'idle', count: 0 },
    'axis_bank': { status: 'idle', count: 0 }
  }
};

/**
 * Resolve bank alias to canonical database key
 */
export const resolveBankDbKey = (bankName) => {
  if (!bankName) return 'universal';
  const clean = String(bankName).toLowerCase().replace(/[-_ &]/g, '');
  if (clean.includes('axisbank') || clean === 'axis_bank' || clean === 'axis-bank') return 'axis_bank';
  if (clean.includes('axisfin') || clean.includes('axisfinance') || clean === 'axis_fin' || clean === 'axis-fin' || clean === 'axis') return 'axis_fin';
  if (clean.includes('indusind')) return 'indusind';
  if (clean.includes('bandhan')) return 'bandhan';
  if (clean.includes('kotak')) return 'kotak';
  if (clean.includes('tata')) return 'tata';
  if (clean.includes('poonawala')) return 'poonawala';
  if (clean.includes('idfc')) return 'idfc';
  if (clean.includes('hdfc')) return 'hdfc';
  if (clean.includes('icici')) return 'icici';
  if (clean.includes('chola')) return 'chola';
  if (clean.includes('lt') || clean.includes('lnt')) return 'lt';
  if (clean.includes('piramal')) return 'piramal';
  if (clean.includes('smfg') || clean.includes('fullerton')) return 'smfg';
  return bankName;
};

/**
 * Enhanced fetch with automatic retries
 */
const fetchWithRetry = async (url, options = {}, retries = 3, backoff = 500) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return await response.json();
  } catch (err) {
    if (retries > 0) {
      console.warn(`⚠️ Retrying fetch for ${url} (${retries} left)...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
};

/**
 * Load universal company list for autocomplete
 */
export const loadUniversalCompanies = async () => {
  dbHealth.universal.status = 'loading';
  console.log('📡 Initializing Universal Database (Parallel Race Mode)...');

  // Helper for Local Fetch
  const loadLocal = async () => {
    const data = await fetchWithRetry('/data/universal_companies.json');
    if (universalCompanies.length === 0) { // Only use if cloud hasn't finished
      universalCompanies = data;
      dbHealth.universal.status = 'ok';
      dbHealth.universal.count = data.length;
      console.log(`✅ LOCAL LOADED: ${data.length} companies ready.`);
    }
    return data;
  };

  // Helper for Cloud Fetch with Timeout
  const loadCloud = async () => {
    try {
      const docRef = doc(db, 'company_databases', 'universal');
      // Set a 5-second timeout for Cloud
      const cloudPromise = getDoc(docRef);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Cloud Timeout')), 5000));
      
      const docSnap = await Promise.race([cloudPromise, timeoutPromise]);

      if (docSnap.exists()) {
        const cloudData = docSnap.data().data;
        universalCompanies = cloudData;
        dbHealth.universal.status = 'ok';
        dbHealth.universal.count = cloudData.length;
        console.log('✅ CLOUD LOADED: Universal Database synced.');
        return cloudData;
      }
    } catch (err) {
      console.warn('⚠️ Cloud Race Lost or Unavailable:', err.message);
    }
  };

  // Start both, return as soon as one finishes (preferring local for speed in dev)
  return Promise.race([loadLocal(), loadCloud()]);
};

/**
 * Load bank-specific company database
 */
export const loadBankDatabase = async (bankName) => {
  const targetKey = resolveBankDbKey(bankName);

  if (!dbHealth.banks[targetKey]) {
    dbHealth.banks[targetKey] = { status: 'idle', count: 0 };
  }

  // If already loaded in memory with records, return immediately
  if (bankDatabases[targetKey] && bankDatabases[targetKey].length > 0) {
    if (targetKey !== bankName) {
      bankDatabases[bankName] = bankDatabases[targetKey];
    }
    return bankDatabases[targetKey];
  }

  dbHealth.banks[targetKey].status = 'loading';

  // 1. Check Cloud Firestore FIRST for active admin customizations / replacements
  try {
    const docRef = doc(db, 'company_databases', targetKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const cloudData = docSnap.data().data || [];
      if (Array.isArray(cloudData) && cloudData.length > 0) {
        bankDatabases[targetKey] = cloudData;
        bankDatabases[bankName] = cloudData;
        dbHealth.banks[targetKey].status = 'ok';
        dbHealth.banks[targetKey].count = cloudData.length;
        console.log(`☁️ CLOUD DATABASE LOADED for ${targetKey} (${cloudData.length} records)`);
        return cloudData;
      }
    }
  } catch (cloudErr) {
    console.warn(`Firestore check skipped or failed for ${targetKey}:`, cloudErr.message);
  }

  // 2. Load bank-specific master JSON (Contains full 40,000 to 182,000 companies)
  try {
    const data = await fetchWithRetry(`/data/${targetKey}_companies.json`);
    if (data && Array.isArray(data) && data.length > 0) {
      bankDatabases[targetKey] = data;
      bankDatabases[bankName] = data;
      if (targetKey === 'axis_fin') {
        bankDatabases['axis'] = data;
        bankDatabases['axis-fin'] = data;
        bankDatabases['axis_fin'] = data;
      }
      if (targetKey === 'axis_bank') {
        bankDatabases['axis-bank'] = data;
        bankDatabases['axis_bank'] = data;
        bankDatabases['axisbank'] = data;
      }
      if (targetKey === 'lt') {
        bankDatabases['lt'] = data;
        bankDatabases['lnt'] = data;
        bankDatabases['l&t'] = data;
      }
      dbHealth.banks[targetKey].status = 'ok';
      dbHealth.banks[targetKey].count = data.length;
      console.log(`✅ MASTER JSON SUCCESS: ${targetKey} database loaded (${data.length.toLocaleString('en-IN')} companies).`);
      return data;
    }
  } catch (localErr) {
    console.warn(`Local JSON not found for ${targetKey} (${localErr.message}). Attempting universal baseline...`);
  }

  // 3. Fallback to Universal Database for banks without a dedicated file
  try {
    const universalData = await fetchWithRetry('/data/universal_companies.json');
    if (universalData && Array.isArray(universalData) && universalData.length > 0) {
      const mapped = universalData.map((c, idx) => ({
        companyName: c.companyName || c.name || `Company ${idx + 1}`,
        category: 'B' // Standard Tier B default
      }));
      bankDatabases[targetKey] = mapped;
      bankDatabases[bankName] = mapped;
      dbHealth.banks[targetKey].status = 'ok';
      dbHealth.banks[targetKey].count = mapped.length;
      console.log(`✅ UNIVERSAL BASELINE SUCCESS: ${targetKey} loaded with ${mapped.length.toLocaleString('en-IN')} companies.`);
      return mapped;
    }
  } catch (uErr) {
    console.warn(`Universal fallback failed for ${targetKey}: ${uErr.message}`);
  }

  return bankDatabases[targetKey] || [];
};

export const getLoadedBankDatabase = (bankName) => {
  const targetKey = resolveBankDbKey(bankName);
  return bankDatabases[targetKey] || bankDatabases[bankName] || [];
};

export const setBankDatabaseInMemory = (bankName, data) => {
  const targetKey = resolveBankDbKey(bankName);
  bankDatabases[targetKey] = data;
  bankDatabases[bankName] = data;
  if (!dbHealth.banks[targetKey]) {
    dbHealth.banks[targetKey] = { status: 'ok', count: data.length };
  } else {
    dbHealth.banks[targetKey].status = 'ok';
    dbHealth.banks[targetKey].count = data.length;
  }
};

/**
 * Initialize all bank databases safely
 */
export const initializeBankDatabases = async () => {
  const bankNames = Object.keys(dbHealth.banks);
  await Promise.all(bankNames.map(name => loadBankDatabase(name)));
  // Ensure aliases are synchronized
  if (bankDatabases['axis_fin'] && bankDatabases['axis_fin'].length > 0) {
    bankDatabases['axis'] = bankDatabases['axis_fin'];
    bankDatabases['axis-bank'] = bankDatabases['axis_fin'];
  }
  console.log('🏁 Health Check:', dbHealth);
};

/**
 * Get company suggestions for autocomplete
 */
export const getCompanySuggestions = (searchTerm) => {
  if (!searchTerm || searchTerm.length < 3) return [];
  const search = searchTerm.toLowerCase();

  if (!universalCompanies || universalCompanies.length === 0) {
    console.warn('⚠️ ENGINE IDLE: Universal Database not ready.');
    return [];
  }

  return universalCompanies
    .filter(company =>
      company?.companyName &&
      company.companyName.toLowerCase().includes(search)
    )
    .slice(0, 50)
    .map(c => c.companyName)
    .sort();
};

/**
 * Standardized mapping
 */
export const mapCategoryToConfigKey = (rawCat) => {
  if (!rawCat) return 'B';
  const c = String(rawCat).toUpperCase().trim();

  // 1. Caution / Negative / Delisted / DNS
  if (c.includes('CAUTION') || c.includes('NEGATIVE') || c.includes('NOT TO BE') || c === 'DNS' || c === 'DELIST' || c === 'REJECT') {
    return 'Caution';
  }

  // 2. Super A / AA / Elite / Superprime / Tata Group / Scata
  if (
    c.includes('SUPER') || 
    c.includes('AA') || 
    c === 'A+' || 
    c === 'ACE PLUS' || 
    c === 'ELITE' || 
    c === 'SUPERPRIME' || 
    c === 'SCATA' || 
    c.includes('TATA GROUP') ||
    c === 'CAT SA'
  ) {
    return 'Super A';
  }

  // 3. Category A
  if (
    c === 'A' || c === 'CAT A' || c === 'CSC A' || c === 'CATEGORY A' || c === 'CATGA' || 
    c === 'CAT-A' || c === 'CAT-GA' || c === 'ACE' || c.endsWith('-A')
  ) {
    return 'A';
  }

  // 4. Category B
  if (
    c === 'B' || c === 'CAT B' || c === 'CSC B' || c === 'CATEGORY B' || c === 'CATGB' || 
    c === 'CAT-B' || c === 'CAT-GB' || c === 'PREFERRED' || c.endsWith('-B')
  ) {
    return 'B';
  }

  // 5. Category C
  if (
    c === 'C' || c === 'CAT C' || c === 'CSC C' || c === 'CATEGORY C' || c === 'CATGC' || 
    c === 'CAT-C' || c === 'CAT-GC' || c === 'CAT C1000' || c === 'OPEN MARKET' || 
    c === 'SILVER' || c === 'OTHERS' || c.endsWith('-C')
  ) {
    return 'C';
  }

  // 6. Category D / Unlisted
  if (
    c === 'D' || c === 'CAT D' || c === 'CSC D' || c === 'CATEGORY D' || c === 'CATGD' || 
    c === 'CAT-D' || c === 'CAT-GD' || c === 'CATDU' || c === 'E' || c === 'F' || 
    c === 'H' || c === 'J' || c === 'U' || c === 'UNLISTED' || c.endsWith('-D')
  ) {
    return 'D';
  }

  // 7. Government & Public Sector (ONLY explicit govt keywords, never generic CATG!)
  if (
    c.includes('GOVT') || c.includes('GOVERNMENT') || c === 'GOV' || 
    c === 'POL' || c === 'DEF' || c === 'STF' || c === 'PMF'
  ) {
    return 'Govt';
  }

  return 'B'; // Default fallback
};

/**
 * Query bank's database with a safety fallback
 */
export const getCompanyCategoryForBank = (companyName, bankName, fallbackCategory = 'B') => {
  if (!companyName) return fallbackCategory;

  const targetKey = resolveBankDbKey(bankName);
  const normalizedCompany = companyName.trim().toUpperCase();
  const bankDb = bankDatabases[targetKey] || bankDatabases[bankName] || [];

  // Safety: If database failed to load or is empty, use the user selected fallback
  if (bankDb.length === 0) {
    console.warn(`🛡️ Fallback: ${bankName} (${targetKey}) database empty. Using user selection: ${fallbackCategory}`);
    return fallbackCategory;
  }

  // Helper to extract clean name and category from any object structure
  const getEntryName = (c) => (c?.companyName || c?.name || c?.Company || c?.['Company Name'] || '').trim().toUpperCase();
  const getEntryCategory = (c) => (c?.category || c?.Category || c?.tier || c?.Tier || 'B');

  // 1. Exact match
  let match = bankDb.find(c => getEntryName(c) === normalizedCompany);

  // 2. Cleaned suffix match (stripping PVT, LTD, PRIVATE, LIMITED, and special characters)
  const cleanSearch = normalizedCompany.replace(/\b(PVT|LTD|PRIVATE|LIMITED|LLP|INC|CORP)\b/g, '').replace(/[^A-Z0-9]/g, ' ').trim();
  if (!match && cleanSearch) {
    match = bankDb.find(c => {
      const cClean = getEntryName(c).replace(/\b(PVT|LTD|PRIVATE|LIMITED|LLP|INC|CORP)\b/g, '').replace(/[^A-Z0-9]/g, ' ').trim();
      return cClean === cleanSearch;
    });
  }

  // 3. Substring / Prefix match if at least 3 characters
  if (!match && cleanSearch && cleanSearch.length >= 3) {
    match = bankDb.find(c => {
      const cClean = getEntryName(c).replace(/\b(PVT|LTD|PRIVATE|LIMITED|LLP|INC|CORP)\b/g, '').replace(/[^A-Z0-9]/g, ' ').trim();
      return cClean.startsWith(cleanSearch) || cleanSearch.startsWith(cClean) || cClean.includes(cleanSearch) || cleanSearch.includes(cClean);
    });
  }

  if (match) {
    const rawCat = getEntryCategory(match);
    const configKey = mapCategoryToConfigKey(rawCat);
    console.log(`✅ ${bankName} (${targetKey}): ${companyName} → ${rawCat} (${configKey})`);
    return configKey;
  }

  // Not found in bank DB? Return the fallback provided by the calculator
  console.log(`⚠️ ${bankName}: ${companyName} NOT in database. Using fallback: ${fallbackCategory}`);
  return fallbackCategory;
};

/**
 * Get categories for all banks with a global fallback
 */
export const getCompanyCategoriesForAllBanks = (companyName, globalFallback = 'B') => {
  return {
    kotak: getCompanyCategoryForBank(companyName, 'kotak', globalFallback),
    tata: getCompanyCategoryForBank(companyName, 'tata', globalFallback),
    poonawala: getCompanyCategoryForBank(companyName, 'poonawala', globalFallback),
    idfc: getCompanyCategoryForBank(companyName, 'idfc', globalFallback),
    hdfc: getCompanyCategoryForBank(companyName, 'hdfc', globalFallback),
    icici: getCompanyCategoryForBank(companyName, 'icici', globalFallback),
    chola: getCompanyCategoryForBank(companyName, 'chola', globalFallback),
    indusind: getCompanyCategoryForBank(companyName, 'indusind', globalFallback),
    bandhan: getCompanyCategoryForBank(companyName, 'bandhan', globalFallback),
    piramal: getCompanyCategoryForBank(companyName, 'piramal', globalFallback),
    lt: getCompanyCategoryForBank(companyName, 'lt', globalFallback),
    smfg: getCompanyCategoryForBank(companyName, 'smfg', globalFallback),
    'axis_fin': getCompanyCategoryForBank(companyName, 'axis_fin', globalFallback),
    'axis_bank': getCompanyCategoryForBank(companyName, 'axis_bank', globalFallback),
    'axis-bank': getCompanyCategoryForBank(companyName, 'axis_bank', globalFallback),
    'axis-fin': getCompanyCategoryForBank(companyName, 'axis_fin', globalFallback)
  };
};

/**
 * Save bank database to Firestore (Admin only)
 */
export const saveBankDatabaseToCloud = async (bankId, data) => {
  try {
    const docRef = doc(db, 'company_databases', bankId);
    // Sanitize and trim data to stay comfortably within Firestore document limit
    const cleanData = (data || []).map(item => ({
      companyName: item.companyName || item.name || '',
      category: item.category || item.Category || 'B'
    })).filter(item => item.companyName);

    // Limit to 15,000 top records to strictly comply with Firestore 1MB doc cap
    const payload = cleanData.length > 15000 ? cleanData.slice(0, 15000) : cleanData;
    await setDoc(docRef, {
      data: payload,
      updatedAt: new Date().toISOString(),
      count: payload.length
    });
    console.log(`✅ ${bankId} database synced to Cloud successfully (${payload.length} records).`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to sync ${bankId} to Cloud:`, error);
    throw error;
  }
};
/**
 * Safely sync new companies to the Universal Database (for autocomplete)
 */
export const syncToUniversalDatabase = async (newCompanies) => {
  try {
    // 1. Load current universal list
    const docRef = doc(db, 'company_databases', 'universal');
    const docSnap = await getDoc(docRef);

    let currentUniversal = [];
    if (docSnap.exists()) {
      currentUniversal = docSnap.data().data || [];
    }

    // 2. Identify brand new companies (not already in universal)
    const existingNames = new Set(currentUniversal.map(c => c.companyName.toUpperCase()));
    const brandNewEntries = [];

    newCompanies.forEach(company => {
      const name = company.companyName.toUpperCase();
      if (!existingNames.has(name)) {
        brandNewEntries.push({
          companyName: name,
          // Since it's universal, we don't store a specific category 
          // because it varies by bank
        });
        existingNames.add(name);
      }
    });

    if (brandNewEntries.length === 0) {
      console.log('ℹ️ No new companies to add to Universal Database.');
      return;
    }

    // 3. Merge and Save
    const updatedUniversal = [...currentUniversal, ...brandNewEntries];
    await setDoc(docRef, {
      data: updatedUniversal,
      updatedAt: new Date().toISOString(),
      count: updatedUniversal.length
    });

    // Update local memory
    universalCompanies = updatedUniversal;

    console.log(`✅ AUTO-SYNC: Added ${brandNewEntries.length} new companies to Universal Database.`);
    return brandNewEntries.length;
  } catch (error) {
    console.error('❌ Failed to sync to Universal Database:', error);
    // Don't throw, we don't want to break the bank-specific upload if sync fails
  }
};
