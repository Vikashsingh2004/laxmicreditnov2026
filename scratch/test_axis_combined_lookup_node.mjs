import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('public/data/axis_fin_companies.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const axisDb = JSON.parse(raw);

console.log(`Loaded Merged Axis Database: ${axisDb.length.toLocaleString()} companies.`);

const testSearch = (name) => {
  const norm = name.trim().toUpperCase();
  const match = axisDb.find(c => c.companyName.trim().toUpperCase() === norm);
  if (match) {
    console.log(`✅ MATCH FOUND for "${name}": Raw Category = "${match.category}"`);
  } else {
    console.log(`❌ NO MATCH for "${name}"`);
  }
};

testSearch("AXIS FINANCE LIMITED");
testSearch("(NARMAC) MOTHER DAIRY, HYDERABAD");
testSearch("100X TECHNOLOGIES PRIVATE LIMITED");
