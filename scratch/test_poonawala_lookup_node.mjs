import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('public/data/poonawala_companies.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const poonawalaDb = JSON.parse(raw);

console.log(`Loaded Poonawalla Database: ${poonawalaDb.length.toLocaleString()} companies.`);

const testSearch = (name) => {
  const norm = name.trim().toUpperCase();
  const match = poonawalaDb.find(c => c.companyName.trim().toUpperCase() === norm);
  if (match) {
    console.log(`✅ MATCH FOUND for "${name}": Raw Category = "${match.category}"`);
  } else {
    console.log(`❌ NO MATCH for "${name}"`);
  }
};

testSearch("10I COMMERCE SERVICES PRIVATE LIMITED");
testSearch("10KINFO DATA SOLUTIONS PRIVATE LIMITED");
testSearch("TATA CONSULTANCY SERVICES LIMITED");
