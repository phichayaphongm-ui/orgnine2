/**
 * Generate CSV Import Template
 * 
 * Creates a CSV template with column headers matching Template TE.xlsx.
 * 
 * Usage: node scripts/generate-template.js
 * Output: public/import-template.csv
 */

const path = require("path");
const fs = require("fs");

// Column headers matching Template TE.xlsx exactly
const TEMPLATE_HEADERS = [
    "ST ID",
    "Title",
    "Store Manager Name",
    "Gender",
    "Position (TH)",
    "Mobile",
    "Age",
    "Hi Educ Level",
    "Hiring Date",
    "Year of Service",
    "Line Manager name",
    "LM's Position title",
    "Region",
    "AGM Mobile",
    "AGM Image URL",
    "Store Manager Image URL",
];

// Sample data row
const SAMPLE_DATA = [
    {
        "ST ID": "5000",
        "Title": "นาย",
        "Store Manager Name": "สมชาย ใจดี",
        "Gender": "Male",
        "Position (TH)": "Store Manager-Hypermarket",
        "Mobile": "081-234-5678",
        "Age": "35",
        "Hi Educ Level": "03-Bachelor degree",
        "Hiring Date": "15/06/2015",
        "Year of Service": "10",
        "Line Manager name": "Jaturong Phongphaew",
        "LM's Position title": "Hyper AGM 01_Bangkok (Upper)",
        "Region": "Hyper Operations - North Region",
        "AGM Mobile": "082-005-3899",
        "AGM Image URL": "",
        "Store Manager Image URL": "",
    },
];

// Format as CSV
const bom = "\ufeff";
const csvContent = bom + [
    TEMPLATE_HEADERS.join(","),
    TEMPLATE_HEADERS.map(h => {
        const val = String(SAMPLE_DATA[0][h] || "");
        if (val.includes(",") || val.includes('"')) {
            return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
    }).join(",")
].join("\n");

// Output path
const outputDir = path.join(__dirname, "..", "public");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, "import-template.csv");
fs.writeFileSync(outputPath, csvContent, "utf8");

console.log(`✅ Template created: ${outputPath}`);
console.log(`\nColumns in template:`);
TEMPLATE_HEADERS.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
console.log(`\nTotal columns: ${TEMPLATE_HEADERS.length}`);
console.log(`\nSample data row included for reference.`);
