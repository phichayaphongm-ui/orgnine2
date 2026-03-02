import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function GET() {
    // Column headers exactly matching the export of mock-sheet.tsx
    const TEMPLATE_HEADERS = [
        "ST ID",
        "Title",
        "Store Manager Name",
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
        "Image Base64",
    ]

    // Sample data row
    const SAMPLE_DATA = {
        "ST ID": "5000",
        "Title": "นาย",
        "Store Manager Name": "สมชาย ใจดี",
        "Position (TH)": "Store Manager-Hypermarket_Example",
        "Mobile": "081-234-5678",
        "Age": "35",
        "Hi Educ Level": "03-Bachelor degree",
        "Hiring Date": "15/06/2015",
        "Year of Service": "10 ปี 8 เดือน",
        "Line Manager name": "Jaturong Phongphaew",
        "LM's Position title": "Hyper AGM 01_Bangkok (Upper)",
        "Region": "Hyper Operations - North Region",
        "AGM Mobile": "082-005-3899",
        "AGM Image URL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "Store Manager Image URL": "",
        "Image Base64": "",
    }

    // Format as CSV
    const bom = "\uFEFF"
    const csvContent = bom + [
        TEMPLATE_HEADERS.join(","),
        TEMPLATE_HEADERS.map(h => {
            const val = String((SAMPLE_DATA as any)[h] || "")
            // Escape quotes and wrap in quotes if there are commas
            if (val.includes(",") || val.includes('"')) {
                return `"${val.replace(/"/g, '""')}"`
            }
            return val
        }).join(",")
    ].join("\n")

    return new NextResponse(csvContent, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=import-template.csv",
        },
    })
}
