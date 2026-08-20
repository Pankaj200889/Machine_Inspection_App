const XLSX = require('xlsx');

const filePath = process.argv[2];
if (!filePath) {
    console.error("Please provide a file path");
    process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log(JSON.stringify(data.slice(0, 50), null, 2));
