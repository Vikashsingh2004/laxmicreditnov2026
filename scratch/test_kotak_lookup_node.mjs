import fs from 'fs';
import path from 'path';

const rawData = fs.readFileSync(path.resolve('./public/data/kotak_companies.json'), 'utf-8');
const kotakDb = JSON.parse(rawData);

const mapCategoryToConfigKey = (rawCat) => {
  if (!rawCat) return 'B';
  const c = String(rawCat).toUpperCase().trim();

  if (c.includes('CAUTION') || c.includes('NEGATIVE') || c.includes('NOT TO BE') || c === 'DNS' || c === 'DELIST') {
    return 'Caution';
  }
  if (c.includes('GOVT') || c.includes('GOVERNMENT') || c.startsWith('CATG') || c === 'POL' || c === 'DEF' || c === 'STF' || c === 'PMF') {
    return 'GOVT';
  }
  if (c.includes('SUPER') || c.includes('AA') || c === 'A+' || c === 'ACE PLUS' || c === 'ELITE' || c === 'SUPERPRIME' || c === 'SCATA') {
    return 'Super A';
  }
  if (c === 'A' || c === 'CAT A' || c === 'CSC A' || c === 'CATEGORY A' || c === 'ACE' || c === 'CAT SA') {
    return 'A';
  }
  if (c === 'B' || c === 'CAT B' || c === 'CSC B' || c === 'CATEGORY B' || c === 'PREFERRED') {
    return 'B';
  }
  if (c === 'C' || c === 'CAT C' || c === 'CSC C' || c === 'CATEGORY C' || c === 'CAT C1000' || c === 'OPEN MARKET' || c === 'SILVER') {
    return 'C';
  }
  if (c === 'D' || c === 'CAT D' || c === 'CSC D' || c === 'CATEGORY D' || c === 'CATDU' || c === 'E' || c === 'F' || c === 'H' || c === 'J' || c.startsWith('CAT ') || c.startsWith('CSC ')) {
    return 'D';
  }
  return 'B';
};

console.log('===========================================================');
console.log('🏛️  KOTAK MAHINDRA BANK CATEGORY TO POLICY MAP TEST');
console.log('===========================================================');

const sampleQueries = [
  'TATA CONSULTANCY SERVICES LIMITED',
  'INFOSYS LIMITED',
  '24/7 CUSTOMER PRIVATE LIMITED',
  '3F INDUSTRIES LIMITED',
  '3M ELECTRO AND COMMUNICATION INDIA PRIVATE LIMITED',
  'A K CAPITAL SERVICES LIMITED',
  'ACE DESIGNERS LIMITED',
  'AIRPORTS AUTHORITY OF INDIA'
];

sampleQueries.forEach(comp => {
  const norm = comp.trim().toUpperCase();
  const match = kotakDb.find(c => c.companyName.trim().toUpperCase() === norm);
  if (match) {
    const policyKey = mapCategoryToConfigKey(match.category);
    console.log(`✅ Company: '${comp}'`);
    console.log(`   - Raw Bank Token: '${match.category}'`);
    console.log(`   - Mapped Policy Engine Tier: '${policyKey}'`);
  }
});
