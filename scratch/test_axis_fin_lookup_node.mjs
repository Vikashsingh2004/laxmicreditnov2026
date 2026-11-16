import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('public/data/axis_fin_companies.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const axisDb = JSON.parse(raw);

console.log(`Loaded Axis Finance Database: ${axisDb.length.toLocaleString()} companies.`);

const testSearch = (name) => {
  const norm = name.trim().toUpperCase();
  const match = axisDb.find(c => c.companyName.trim().toUpperCase() === norm);
  if (match) {
    console.log(`✅ MATCH FOUND for "${name}": Raw Category = "${match.category}"`);
  } else {
    console.log(`❌ NO MATCH for "${name}"`);
  }
};

const aaCompany = axisDb.find(c => c.category === 'UPC-AA');
if (aaCompany) testSearch(aaCompany.companyName);

const aCompany = axisDb.find(c => c.category === 'UPC-A');
if (aCompany) testSearch(aCompany.companyName);

const govCompany = axisDb.find(c => c.category === 'GOV-B');
if (govCompany) testSearch(govCompany.companyName);
