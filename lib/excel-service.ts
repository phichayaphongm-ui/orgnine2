import * as XLSX from "xlsx"
import { OrgRecord } from "./types"

/**
 * Parse an Excel file (File object from file input) and return OrgRecord data
 */
export function parseExcelBuffer(buffer: ArrayBuffer | string): OrgRecord[] {
    const workbook = typeof buffer === "string"
        ? XLSX.read(buffer.replace(/^\uFEFF/, ''), { type: "string" })
        : XLSX.read(buffer, { type: "array" })

    // We expect the "Store Mgr" sheet or just the first sheet
    const sheetName = workbook.SheetNames.find(n => n.includes("Store")) || workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: "dd/mm/yyyy" }) as any[]

    console.log(`Parsed ${jsonData.length} rows from sheet "${sheetName}"`)

    return jsonData.map(row => {
        // Build a helper to find column value by fuzzy key matching
        const keys = Object.keys(row)
        const findVal = (...candidates: string[]): string => {
            for (const c of candidates) {
                if (row[c] !== undefined) return String(row[c]).trim()
                const cl = c.toLowerCase().trim()
                const found = keys.find(k => k.toLowerCase().trim() === cl)
                if (found && row[found] !== undefined) return String(row[found]).trim()
            }
            for (const c of candidates) {
                const cl = c.toLowerCase().trim()
                if (cl.length < 3) continue
                const found = keys.find(k => k.toLowerCase().trim().includes(cl))
                if (found && row[found] !== undefined) return String(row[found]).trim()
            }
            return ""
        }

        const storeId = findVal("ST ID", "Store ID")
        const title = findVal("Title")
        const smName = findVal("Store Manager Name", "Manager Name", "Name")
        const gender = findVal("Gender")
        const position = findVal("Position (TH)", "Position title in Thai", "Position")
        const mobile = findVal("Mobile", "Mobile Phone")
        const age = findVal("Age", "อายุ")
        const eduLevel = findVal("Hi Educ Level", "Education Level")
        const hiringDate = findVal("Hiring Date", "Hiring")
        const yrService = findVal("Year of Service", "Yr of Service in TL")
        const lmName = findVal("Line Manager name", "AGM Name")
        const lmPosition = findVal("LM's Position title", "AGM Position")
        const region = findVal("Region", "AGM ZONE")
        const agmMobile = findVal("AGM Mobile", "AGM Phone")
        const agmImageUrl = findVal("AGM Image URL", "AGM Image")
        const smImageUrl = findVal("Store Manager Image URL", "SM Image")

        return {
            ...row,
            "ST ID": storeId,
            "Title": title,
            "Store Manager Name": smName,
            "Gender": gender,
            "Position (TH)": position,
            "Mobile": mobile,
            "Age": age,
            "Hi Educ Level": eduLevel,
            "Hiring Date": hiringDate,
            "Year of Service": yrService,
            "Line Manager name": lmName,
            "LM's Position title": lmPosition,
            "Region": region,
            "AGM Mobile": agmMobile,
            "AGM Image URL": agmImageUrl,
            "Store Manager Image URL": smImageUrl,
        }
    })
}

export const excelService = {
    /**
     * Parse a locally uploaded Excel/CSV file 
     */
    parseLocalFile: async (file: File): Promise<OrgRecord[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = e.target?.result as ArrayBuffer | string
                    const rows = parseExcelBuffer(data)
                    resolve(rows)
                } catch (err) {
                    reject(err)
                }
            }
            reader.onerror = (err) => reject(err)
            reader.readAsArrayBuffer(file)
        })
    }
}
