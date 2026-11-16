import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('public/data/idfc_companies.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const idfcDb = JSON.parse(raw);

console.log(`Loaded IDFC Database: ${idfcDb.length.toLocaleString()} companies.`);

const testSearch = (name) => {
  const norm = name.trim().toUpperCase();
  const match = idfcDb.find(c => c.companyName.trim().toUpperCase() === norm);
  if (match) {
    console.log(`✅ MATCH FOUND for "${name}": Raw Category = "${match.category}"`);
  } else {
    console.log(`❌ NO MATCH for "${name}"`);
  }
};

testSearch("ACCENTURE SOLUTIONS PRIVATE LIMITED");
testSearch("CAPGEMINI TECHNOLOGY SERVICES INDIA LIMITED");
testSearch("TATA CONSULTANCY SERVICES LIMITED");
