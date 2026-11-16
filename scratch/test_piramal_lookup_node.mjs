import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('public/data/piramal_companies.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const piramalDb = JSON.parse(raw);

console.log(`Loaded Piramal Database: ${piramalDb.length.toLocaleString()} companies.`);

const testSearch = (name) => {
  const norm = name.trim().toUpperCase();
  const match = piramalDb.find(c => c.companyName.trim().toUpperCase() === norm);
  if (match) {
    console.log(`✅ MATCH FOUND for "${name}": Raw Category = "${match.category}"`);
  } else {
    console.log(`❌ NO MATCH for "${name}"`);
  }
};

const eliteCompany = piramalDb.find(c => c.category === 'ELITE');
if (eliteCompany) {
  testSearch(eliteCompany.companyName);
}
const catACompany = piramalDb.find(c => c.category === 'CAT A');
if (catACompany) {
  testSearch(catACompany.companyName);
}
