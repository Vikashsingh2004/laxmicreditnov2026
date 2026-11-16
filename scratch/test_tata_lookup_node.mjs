import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('public/data/tata_companies.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const tataDb = JSON.parse(raw);

console.log(`Loaded Tata Database: ${tataDb.length.toLocaleString()} companies.`);

const testSearch = (name) => {
  const norm = name.trim().toUpperCase();
  const match = tataDb.find(c => c.companyName.trim().toUpperCase() === norm);
  if (match) {
    console.log(`✅ MATCH FOUND for "${name}": Raw Category = "${match.category}"`);
  } else {
    console.log(`❌ NO MATCH for "${name}"`);
  }
};

testSearch("TATA CONSULTANCY SERVICES LIMITED");
testSearch("RELIANCE INDUSTRIES LIMITED");
testSearch("INFOSYS LIMITED");
testSearch("TATA MOTORS LIMITED");
