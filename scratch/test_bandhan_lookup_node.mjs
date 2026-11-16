import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('public/data/bandhan_companies.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const bandhanDb = JSON.parse(raw);

console.log(`Loaded Bandhan Database: ${bandhanDb.length.toLocaleString()} companies.`);

const testSearch = (name) => {
  const norm = name.trim().toUpperCase();
  const match = bandhanDb.find(c => c.companyName.trim().toUpperCase() === norm);
  if (match) {
    console.log(`✅ MATCH FOUND for "${name}": Raw Category = "${match.category}"`);
  } else {
    console.log(`❌ NO MATCH for "${name}"`);
  }
};

testSearch("TATA CONSULTANCY SERVICES LIMITED");
testSearch("INFOSYS LIMITED");
