import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('public/data/icici_companies.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const iciciDb = JSON.parse(raw);

console.log(`Loaded ICICI Database: ${iciciDb.length.toLocaleString()} companies.`);

const testSearch = (name) => {
  const norm = name.trim().toUpperCase();
  const match = iciciDb.find(c => c.companyName.trim().toUpperCase() === norm);
  if (match) {
    console.log(`✅ MATCH FOUND for "${name}": Raw Category = "${match.category}"`);
  } else {
    console.log(`❌ NO MATCH for "${name}"`);
  }
};

testSearch("1 ASSAM REGIMENT");
testSearch("TATA CONSULTANCY SERVICES LIMITED");
