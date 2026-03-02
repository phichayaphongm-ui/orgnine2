"use client"

import { useState, useMemo, useRef } from "react"
import type { OrgRecord, AgmRecord } from "@/lib/types"
import { Plus, Trash2, Search, Download, CloudSync, ArrowUp, ArrowDown, RotateCcw } from "lucide-react"
// Legacy GAS imports removed
import { toast } from "sonner"
import { formatPhone, formatDate, calculateDuration, calculateYearOfService } from "@/lib/utils"
import { storageService } from "@/lib/storage-service"

// Column display names are now 1:1 with Template TE.xlsx headers
// No mapping needed — the OrgRecord keys ARE the display names.

// AGM-specific display names (overrides for AGM tab)
const AGM_COLUMN_DISPLAY_NAMES: Record<string, string> = {
    "AGM Name": "Line Manager name",
    "Position": "LM's Position title",
    "AGM ZONE": "Region",
    "Mobile Phone": "AGM Mobile",
    "Image URL": "Image URL",
}

interface MockSheetProps {
    orgData: OrgRecord[]
    agmData: AgmRecord[]
    imageCache?: Record<string, string>
    onUpdateOrg: (idx: number, row: OrgRecord) => void
    onAddOrg: (row: OrgRecord) => void
    onDeleteOrg: (idx: number) => void
    onUpdateAgm: (row: AgmRecord) => void
    onDeleteAgm: (name: string) => void
    onReorderOrg?: (oldIdx: number, newIdx: number) => void
    onReset?: () => void
}

export default function MockSheet({
    orgData,
    agmData,
    imageCache = {},
    onUpdateOrg,
    onAddOrg,
    onDeleteOrg,
    onUpdateAgm,
    onDeleteAgm,
    onReorderOrg,
    onReset
}: MockSheetProps) {
    const [activeTab, setActiveTab] = useState<"org" | "agm">("org")
    const [searchTerm, setSearchTerm] = useState("")
    const [exporting, setExporting] = useState(false)

    // Fixed column order matching Template TE.xlsx
    const orgHeaders = useMemo(() => {
        if (orgData.length === 0) return ["ST ID", "Title", "Store Manager Name"]
        return [
            "ST ID", "Title", "Store Manager Name", "Gender", "Position (TH)",
            "Mobile", "Age", "Hi Educ Level", "Hiring Date", "Year of Service",
            "Line Manager name", "LM's Position title", "Region",
            "AGM Mobile", "AGM Image URL", "Store Manager Image URL"
        ]
    }, [orgData])

    // AGM Data headers
    const agmHeaders = useMemo(() => {
        if (agmData.length === 0) return ["AGM Name", "AGM ZONE"]
        const keys = new Set<string>()
        const order = ["AGM Name", "Position", "AGM ZONE", "Mobile Phone", "Image URL"]
        order.forEach(k => keys.add(k))

        // Exclude internal or redundant keys from dynamic columns
        const exclude = new Set([
            ...order,
            "Email", "Remark", "AGM Position Title", "AGM Position", "AGM Phone",
            "Position (TH)", "LM's Position title", "AGM Mobile"
        ])

        agmData.forEach(row => {
            Object.keys(row).forEach(k => {
                if (!k.startsWith("_") && !exclude.has(k)) {
                    keys.add(k)
                }
            })
        })
        return Array.from(keys)
    }, [agmData])

    const activeHeaders = activeTab === "org" ? orgHeaders : agmHeaders

    const filteredOrg = orgData.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const filteredAgm = agmData.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const handleExport = async () => {
        console.log("handleExport triggered", { activeTab, orgCount: orgData.length, agmCount: agmData.length })
        if (exporting) return
        setExporting(true)

        try {
            const rawData = activeTab === "org" ? orgData : agmData
            if (!rawData || rawData.length === 0) {
                toast.error("ไม่มีข้อมูลที่จะส่งออก")
                setExporting(false)
                return
            }

            toast.info("กำลังเตรียมข้อมูล... รวมรูปภาพ Base64")

            // Export headers match template directly
            const exportHeaders = [...activeHeaders]

            const headers = exportHeaders.map(h => {
                if (activeTab === "agm" && h === "Image URL") return "AGM Image URL"
                return h
            })

            const escapeCSV = (val: string) => {
                if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
                    return '"' + val.replace(/"/g, '""') + '"'
                }
                return val
            }

            const csvRows: string[] = []
            csvRows.push(headers.map(escapeCSV).join(","))

            // Process each row, loading Base64 images from IndexedDB
            for (const row of rawData) {
                const values: string[] = []
                for (const h of exportHeaders) {
                    if (h === "Image Base64") {
                        // Try to get Base64 from imageCache or IndexedDB
                        let base64 = ""
                        const imgUrl = String((row as any)["Image URL"] || "")
                        if (imgUrl.startsWith("localdb://")) {
                            const fileId = imgUrl.replace("localdb://", "")
                            if (imageCache[fileId]) {
                                base64 = imageCache[fileId]
                            } else {
                                // Try IndexedDB directly
                                try {
                                    const fromDb = await storageService.getImageBase64(fileId)
                                    if (fromDb) base64 = fromDb
                                } catch { }
                            }
                        } else if (imgUrl.startsWith("data:")) {
                            base64 = imgUrl
                        }
                        values.push(escapeCSV(base64))
                    } else if (h === "AGM Image URL") {
                        let val = String((row as any)[h] || "")
                        if (!val) {
                            const lmName = (row as any)["Line Manager name"]
                            const agm = agmData.find(a => a["AGM Name"] === lmName)
                            val = agm?.["Image URL"] || agm?._localImage || ""
                        }
                        values.push(escapeCSV(val))
                    } else if (h === "Hiring Date") {
                        let val = (row as any)[h]
                        values.push(escapeCSV(formatDate(val)))
                    } else if (h === "Year of Service") {
                        const hiringDate = (row as any)["Hiring Date"]
                        const yos = calculateYearOfService(hiringDate)
                        values.push(escapeCSV(yos || String((row as any)[h] || "")))
                    } else {
                        let value = String((row as any)[h] || "")
                        values.push(escapeCSV(value))
                    }
                }
                csvRows.push(values.join(","))
            }

            // BOM + CSV content
            const bom = "\uFEFF"
            const csvContent = bom + csvRows.join("\r\n")
            const fileName = `te_export_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`

            console.log("CSV ready:", fileName, "rows:", csvRows.length, "size:", csvContent.length)

            // === Method 1: File System Access API (showSaveFilePicker) ===
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await (window as any).showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{
                            description: 'CSV File',
                            accept: { 'text/csv': ['.csv'] }
                        }]
                    })
                    const writable = await handle.createWritable()
                    await writable.write(csvContent)
                    await writable.close()
                    toast.success(`บันทึกสำเร็จ: ${fileName}`)
                    console.log("Saved via File System Access API")
                    setExporting(false)
                    return
                } catch (err: any) {
                    // User cancelled the save dialog
                    if (err.name === 'AbortError') {
                        toast.info("ยกเลิกการบันทึก")
                        setExporting(false)
                        return
                    }
                    console.warn("showSaveFilePicker failed, trying fallback:", err)
                }
            }

            // === Method 2: Blob download link fallback ===
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = fileName
            a.style.display = "none"
            document.body.appendChild(a)
            a.click()
            setTimeout(() => {
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
            }, 3000)

            toast.success(`ส่งออกสำเร็จ: ${fileName}`)
            console.log("Export via blob link:", fileName)
        } catch (err) {
            console.error("Export error:", err)
            toast.error("ส่งออกไฟล์ล้มเหลว: " + (err instanceof Error ? err.message : String(err)))
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] glass-card overflow-hidden">
            {/* Tab Switcher & Toolbar */}
            <div className="flex items-center justify-between border-b px-6 py-4 bg-secondary/30">
                <div className="flex bg-muted p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab("org")}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "org" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        ORG DATA ({orgData.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("agm")}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "agm" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        AGM DATA ({agmData.length})
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="ค้นหาข้อมูล..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-xl border-none bg-white/50 text-sm focus:ring-2 focus:ring-primary/20 w-64"
                        />
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-all active:scale-95 ${exporting ? "bg-gray-400 cursor-wait" : "bg-orange-500 hover:bg-orange-600"
                            }`}
                    >
                        <Download className={`h-4 w-4 ${exporting ? "animate-bounce" : ""}`} />
                        {exporting ? "กำลังส่งออก..." : "Export CSV"}
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const response = await fetch("/api/template");
                                const csvContent = await response.text();
                                const fileName = "import-template.csv";

                                // === Method 1: File System Access API (showSaveFilePicker) ===
                                if ('showSaveFilePicker' in window) {
                                    try {
                                        const handle = await (window as any).showSaveFilePicker({
                                            suggestedName: fileName,
                                            types: [{
                                                description: 'CSV File',
                                                accept: { 'text/csv': ['.csv'] }
                                            }]
                                        });
                                        const writable = await handle.createWritable();
                                        await writable.write(csvContent);
                                        await writable.close();
                                        toast.success(`ดาวน์โหลด Template สำเร็จ: ${fileName}`);
                                        return;
                                    } catch (err: any) {
                                        if (err.name === 'AbortError') {
                                            toast.info("ยกเลิกการดาวน์โหลด");
                                            return;
                                        }
                                        console.warn("showSaveFilePicker failed, trying fallback:", err);
                                    }
                                }

                                // === Method 2: Blob download link fallback ===
                                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = fileName;
                                a.style.display = "none";
                                document.body.appendChild(a);
                                a.click();
                                setTimeout(() => {
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);
                                }, 3000);
                                toast.success(`ดาวน์โหลด Template สำเร็จ: ${fileName}`);
                            } catch (error) {
                                console.error("Error downloading template:", error);
                                toast.error("ไม่สามารถดาวน์โหลด Template ได้");
                            }
                        }}
                        className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-600 transition-all active:scale-95"
                    >
                        <Download className="h-4 w-4" />
                        Template
                    </button>


                    <button
                        onClick={() => {
                            if (activeTab === "org") {
                                onAddOrg({
                                    "ST ID": "New",
                                    "Title": "",
                                    "Store Manager Name": "",
                                    "Gender": "",
                                    "Position (TH)": "",
                                    "Mobile": "",
                                    "Age": "",
                                    "Hi Educ Level": "",
                                    "Hiring Date": "",
                                    "Year of Service": "",
                                    "Line Manager name": "",
                                    "LM's Position title": "",
                                    "Region": "",
                                    "AGM Mobile": "",
                                    "AGM Image URL": "",
                                    "Store Manager Image URL": ""
                                })
                            }
                        }}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:shadow-lg transition-all active:scale-95"
                    >
                        <Plus className="h-4 w-4" /> เพิ่มแถว
                    </button>

                    <button
                        onClick={() => {
                            if (confirm("ระวัง! คุณต้องการลบข้อมูลทั้งหมดและเริ่มใหม่ใช่หรือไม่?")) {
                                onReset?.()
                                toast.success("รีเซ็ตข้อมูลแล้ว")
                            }
                        }}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                        title="Reset Data"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Spreadsheet Grid */}
            <div className="flex-1 overflow-auto bg-white/50 relative">
                <div className="min-w-max">
                    <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md">
                            <tr>
                                <th className="px-4 py-3 border text-left bg-muted w-10">#</th>
                                {activeHeaders.map(h => (
                                    <th key={h} className="px-4 py-3 border text-left font-semibold text-primary/80 whitespace-nowrap">
                                        {(activeTab === "agm" ? AGM_COLUMN_DISPLAY_NAMES[h] : null) || h}
                                    </th>
                                ))}
                                <th className="px-4 py-3 border text-center w-32 sticky right-0 bg-muted/90 backdrop-blur-md shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(activeTab === "org" ? filteredOrg : filteredAgm).map((row, idx) => (
                                <tr key={idx} className="hover:bg-primary/5 group transition-colors">
                                    <td className="px-4 py-2 border text-center text-muted-foreground font-mono bg-muted/20">{idx + 1}</td>
                                    {activeHeaders.map(col => {
                                        let cellValue = String(row[col as keyof typeof row] || "");

                                        // UI Fallback for images
                                        if (activeTab === "org") {
                                            if (col === "AGM Image URL" && !cellValue) {
                                                const lmName = (row as any)["Line Manager name"]
                                                const agm = agmData.find(a => a["AGM Name"] === lmName)
                                                cellValue = agm?.["Image URL"] || agm?._localImage || ""
                                            } else if (col === "Year of Service") {
                                                const hiringDate = (row as any)["Hiring Date"]
                                                const yos = calculateYearOfService(hiringDate)
                                                if (yos) cellValue = yos
                                            }
                                        }

                                        return (
                                            <Cell
                                                key={col}
                                                value={cellValue}
                                                onSave={(v) => {
                                                    if (activeTab === "org") {
                                                        onUpdateOrg(idx, { ...row as any, [col]: v })
                                                    } else {
                                                        onUpdateAgm({ ...row as AgmRecord, [col]: v })
                                                    }
                                                }}
                                                isPhone={col.includes("Mobile") || col.includes("Phone")}
                                                isUrl={col.includes("URL")}
                                                isDate={col === "Hiring Date"}
                                                readOnly={false}
                                            />
                                        )
                                    })}
                                    <td className="px-4 py-2 border text-center sticky right-0 bg-white/95 group-hover:bg-primary/5 transition-colors shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                        <div className="flex items-center justify-center gap-1">
                                            {activeTab === "org" && onReorderOrg && (
                                                <>
                                                    <button
                                                        disabled={idx === 0}
                                                        onClick={() => onReorderOrg(idx, idx - 1)}
                                                        className="p-1.5 text-slate-400 hover:text-primary disabled:opacity-30 rounded-md hover:bg-primary/10 transition-all"
                                                    >
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        disabled={idx === (activeTab === "org" ? orgData.length : agmData.length) - 1}
                                                        onClick={() => onReorderOrg(idx, idx + 1)}
                                                        className="p-1.5 text-slate-400 hover:text-primary disabled:opacity-30 rounded-md hover:bg-primary/10 transition-all"
                                                    >
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (activeTab === "org") onDeleteOrg(idx)
                                                    else onDeleteAgm((row as AgmRecord)["AGM Name"])
                                                }}
                                                className="p-2 text-destructive opacity-40 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 rounded-lg"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function Cell({ value, onSave, isPhone, isUrl, isDate, displayValue, readOnly }: {
    value: string;
    onSave: (v: string) => void;
    isPhone?: boolean;
    isUrl?: boolean;
    isDate?: boolean;
    displayValue?: string;
    readOnly?: boolean;
}) {
    const [editing, setEditing] = useState(false)
    const [localValue, setLocalValue] = useState(value)

    if (editing && !readOnly) {
        return (
            <td className="p-0 border focus-within:ring-2 focus-within:ring-primary/40 relative z-10 min-w-[150px]">
                <input
                    autoFocus
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={() => {
                        setEditing(false)
                        onSave(localValue)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            setEditing(false)
                            onSave(localValue)
                        }
                        if (e.key === "Escape") {
                            setEditing(false)
                            setLocalValue(value)
                        }
                    }}
                    className="w-full h-full px-4 py-2 bg-white outline-none font-medium"
                />
            </td>
        )
    }

    return (
        <td
            onDoubleClick={() => !readOnly && setEditing(true)}
            className={`px-4 py-2 border whitespace-nowrap min-w-[120px] max-w-[300px] overflow-hidden text-ellipsis ${readOnly ? "bg-muted/30 cursor-default" : "cursor-text"}`}
        >
            <span className={!value && !displayValue ? "text-muted-foreground italic text-xs" : ""}>
                {displayValue || (
                    isDate ? formatDate(value) :
                        (isPhone && value) ? formatPhone(value) :
                            (isUrl && value && (value.startsWith("http") || value.startsWith("data:image"))) ? (
                                <div className="flex items-center gap-2">
                                    {value.startsWith("data:image") ? (
                                        <img src={value} alt="Preview" className="h-6 w-6 rounded object-cover border" />
                                    ) : (
                                        <div className="h-6 w-6 flex items-center justify-center bg-muted rounded border">
                                            <Download className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                    )}
                                    <span className="max-w-[150px] truncate opacity-60 text-xs font-mono">{value}</span>
                                </div>
                            ) : (value || "(ว่าง)")
                )}
            </span>
        </td>
    )
}
