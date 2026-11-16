import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('public/data/indusind_companies.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const indusindDb = JSON.parse(raw);

const matches = indusindDb.filter(c => c.companyName.toUpperCase().includes("TATA CONSULTANCY"));
console.log("TCS matches:", matches);
