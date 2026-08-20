const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = "C:\\Users\\Pankaj Vishwakarma\\OneDrive\\Documents\\Siddhi Industrial Solutions\\New project";
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

let output = {};

for (const file of files) {
    const filePath = path.join(dir, file);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Read first 60 rows, header: 1 gives array of arrays
    let data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    // Filter out completely empty rows
    data = data.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
    // Filter out rows that just contain dates (1 to 31)
    data = data.filter(row => {
        const str = row.join('');
        return !str.includes('1234567891011121314');
    });
    // Keep first 40 rows
    output[file] = data.slice(0, 40);
}

fs.writeFileSync('all_excels_summary.json', JSON.stringify(output, null, 2));
console.log('Wrote all_excels_summary.json');
