import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('public/data/smfg_companies.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const smfgDb = JSON.parse(raw);

console.log(`Loaded SMFG Database: ${smfgDb.length.toLocaleString()} companies.`);

const testSearch = (name) => {
  const norm = name.trim().toUpperCase();
  const match = smfgDb.find(c => c.companyName.trim().toUpperCase() === norm);
  if (match) {
    console.log(`✅ MATCH FOUND for "${name}": Raw Category = "${match.category}"`);
  } else {
    console.log(`❌ NO MATCH for "${name}"`);
  }
};

const superCompany = smfgDb.find(c => c.category === 'SUPER CAT A');
if (superCompany) {
  testSearch(superCompany.companyName);
}
const catACompany = smfgDb.find(c => c.category === 'CAT A');
if (catACompany) {
  testSearch(catACompany.companyName);
}
