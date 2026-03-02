"use client"

import { useState, useEffect, useCallback, useSyncExternalStore } from "react"
import type { PageId, OrgRecord, AgmRecord } from "@/lib/types"
import {
  subscribe,
  getState,
  loadAllData,
  loadExcelFromFile,
  addRow,
  updateRow,
  deleteRow,
  saveAgm,
  deleteAgm,
  bulkImportOrg,
  getImageFromCache,
  uploadAndSaveImage,
} from "@/lib/store"
import AppHeader from "@/components/app-header"
import Dashboard from "@/components/dashboard"
import OrgChart from "@/components/org-chart"
import AgmManager from "@/components/agm-manager"
import StoreManager from "@/components/store-manager"
import StoreDetailModal from "@/components/store-detail-modal"
import SettingsPanel from "@/components/settings-panel"
import MockSheet from "@/components/mock-sheet"
import ProvinceDetailModal from "@/components/province-detail-modal"
import LoginPage from "@/components/login-page"
import AppFooter from "@/components/app-footer"
import { saveAs } from "file-saver"
import { Loader2, Settings, FileUp } from "lucide-react"
import { calculateYearOfService } from "@/lib/utils"

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [page, setPage] = useState<PageId | "sheet">("dash")
  const [detailStore, setDetailStore] = useState<OrgRecord | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [filteredOrgData, setFilteredOrgData] = useState<OrgRecord[]>([])

  const state = useSyncExternalStore(subscribe, getState, getState)
  const { orgData, agmData, loading, error, imageCache } = state

  // Load on mount
  useEffect(() => {
    setMounted(true)
    const auth = localStorage.getItem("te_auth")
    setIsAuthenticated(auth === "true")
    loadAllData()
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem("te_auth")
    window.location.reload()
  }, [])

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleRefresh = useCallback(async () => {
    await loadAllData()
    showToast("โหลดข้อมูลใหม่แล้ว")
  }, [])

  // CRUD Wrappers with loading + toast
  const handleAddRow = useCallback(async (row: OrgRecord) => {
    setActionLoading(true)
    try {
      await addRow(row)
      showToast("เพิ่มสาขาสำเร็จ")
    } catch { showToast("เพิ่มสาขาล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  const handleUpdateRow = useCallback(async (idx: number, row: OrgRecord) => {
    setActionLoading(true)
    try {
      await updateRow(idx, row)
      showToast("บันทึกการแก้ไขแล้ว")
    } catch { showToast("แก้ไขล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  const handleDeleteRow = useCallback(async (idx: number) => {
    setActionLoading(true)
    try {
      await deleteRow(idx)
      showToast("ลบสาขาสำเร็จ")
    } catch { showToast("ลบล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  const handleSaveAgm = useCallback(async (row: AgmRecord) => {
    setActionLoading(true)
    try {
      await saveAgm(row)
      showToast("บันทึก AGM สำเร็จ")
    } catch { showToast("บันทึก AGM ล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  const handleDeleteAgm = useCallback(async (name: string) => {
    setActionLoading(true)
    try {
      await deleteAgm(name)
      showToast("ลบ AGM สำเร็จ")
    } catch { showToast("ลบ AGM ล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  const handleBulkImport = useCallback(async (rows: OrgRecord[]) => {
    setActionLoading(true)
    try {
      await bulkImportOrg(rows)
      showToast(`นำเข้า ${rows.length} สาขาสำเร็จ`)
    } catch { showToast("นำเข้าข้อมูลล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  const handleExcelUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setActionLoading(true)
    try {
      const count = await loadExcelFromFile(file)
      showToast(`โหลดข้อมูลจาก Excel สำเร็จ ${count} รายการ`)
    } catch {
      showToast("อ่านไฟล์ Excel ล้มเหลว", "err")
    }
    setActionLoading(false)
    e.target.value = "" // Reset file input
  }, [])

  // Export handlers
  const handleExportPptx = useCallback(async () => {
    const PptxGenJS = (await import("pptxgenjs")).default
    const pptx = new PptxGenJS()
    pptx.layout = "LAYOUT_16x9"

    const exportData = filteredOrgData.length > 0 ? filteredOrgData : orgData
    const agmMap: Record<string, AgmRecord> = {}
    agmData.forEach((a) => { agmMap[a["AGM Name"]] = a })

    const groups: Record<string, { zone: string; stores: OrgRecord[] }> = {}
    exportData.forEach((r) => {
      const k = r["Line Manager name"] || "N/A"
      if (!groups[k]) groups[k] = { zone: r["Region"] || "", stores: [] }
      groups[k].stores.push(r)
    })

    const getBase64 = (url?: string) => {
      if (!url) return null
      if (url.startsWith("localdb://")) return imageCache[url.replace("localdb://", "")] || null
      if (url.startsWith("data:")) return url
      return null
    }

    const fmtPhone = (raw?: string): string => {
      if (!raw) return ""
      let digits = raw.replace(/\D/g, "")
      if (digits.length === 9) digits = "0" + digits
      if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
      return raw
    }

    const ts = pptx.addSlide()
    ts.background = { color: "1e40af" }
    ts.addText("Talent Experience\nHR Intelligence Portal", {
      x: 0, y: 1.5, w: "100%", h: 2,
      fontSize: 36, fontFace: "Kanit", color: "FFFFFF", bold: true, align: "center",
    })
    ts.addText(`${exportData.length} Stores Found in ${Object.keys(groups).length} Area Managers`, {
      x: 0, y: 4, w: "100%", h: 0.5,
      fontSize: 16, fontFace: "Kanit", color: "e2e8f0", align: "center",
    })

    const GRID_X = 2.75
    const GRID_Y = 0.1
    const GRID_W = 7.1
    const GRID_H = 5.4
    const GAP = 0.06

    for (const [agmName, grp] of Object.entries(groups)) {
      const slide = pptx.addSlide()
      slide.background = { color: "F8FAFC" }
      const agmRec = agmMap[agmName]
      const n = grp.stores.length

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.15, y: 0.15, w: 2.45, h: 5.3,
        fill: { type: "solid", color: "1e40af" }, rectRadius: 0.1,
      })
      const agmPic = getBase64(agmRec?.["Image URL"])
      if (agmPic) {
        slide.addImage({ data: agmPic, x: 0.55, y: 0.4, w: 1.65, h: 1.65, rounding: true })
      } else {
        slide.addShape(pptx.ShapeType.ellipse, { x: 0.55, y: 0.4, w: 1.65, h: 1.65, fill: { color: "3b82f6" } })
      }
      slide.addText("Area General Manager", {
        x: 0.15, y: 2.15, w: 2.45, h: 0.25,
        fontSize: 8.5, fontFace: "Kanit", color: "93c5fd", bold: true, align: "center",
      })
      slide.addText(agmName, {
        x: 0.15, y: 2.45, w: 2.45, h: 0.55,
        fontSize: 13, fontFace: "Kanit", color: "FFFFFF", bold: true, align: "center", valign: "middle", wrap: true,
      })
      const agmPosition = agmRec?.Position || ""
      if (agmPosition) {
        slide.addText(agmPosition, {
          x: 0.15, y: 3.05, w: 2.45, h: 0.35,
          fontSize: 8, fontFace: "Kanit", color: "bfdbfe", align: "center", wrap: true,
        })
      }
      slide.addText(grp.zone, {
        x: 0.15, y: 3.45, w: 2.45, h: 0.4,
        fontSize: 9, fontFace: "Kanit", color: "e2e8f0", align: "center", wrap: true,
      })
      const agmPhone = fmtPhone(agmRec?.["Mobile Phone"])
      if (agmPhone) {
        slide.addText(`📞 ${agmPhone}`, {
          x: 0.15, y: 3.9, w: 2.45, h: 0.3,
          fontSize: 9, fontFace: "Kanit", color: "93c5fd", align: "center",
        })
      }
      slide.addText(`${n} สาขา`, {
        x: 0.15, y: 4.85, w: 2.45, h: 0.3,
        fontSize: 10, fontFace: "Kanit", color: "fbbf24", bold: true, align: "center",
      })

      let cols = Math.min(n, 5)
      let rows = Math.ceil(n / cols)
      if (rows > 4) { cols = Math.min(n, 6); rows = Math.ceil(n / cols) }
      if (rows > 4) { cols = Math.min(n, 7); rows = Math.ceil(n / cols) }

      const cardW = (GRID_W - (cols - 1) * GAP) / cols
      const cardH = (GRID_H - (rows - 1) * GAP) / rows
      const scale = Math.min(cardH / 2.7, 1)
      const imgSize = Math.min(0.65 * scale, 0.65)
      const fName = Math.max(5, 7 * scale)
      const fPos = Math.max(4, 5 * scale)
      const fStore = Math.max(4, 5.5 * scale)
      const fPhone = Math.max(3.5, 5 * scale)
      const fInfo = Math.max(3, 4.5 * scale)
      const fId = Math.max(4, 6 * scale)

      grp.stores.forEach((s, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = GRID_X + col * (cardW + GAP)
        const y = GRID_Y + row * (cardH + GAP)

        slide.addShape(pptx.ShapeType.roundRect, {
          x, y, w: cardW, h: cardH,
          fill: { type: "solid", color: "FFFFFF" },
          line: { color: "e2e8f0", width: 1 }, rectRadius: 0.04,
        })

        const smPic = getBase64(s["Store Manager Image URL"])
        if (smPic) {
          slide.addImage({ data: smPic, x: x + (cardW - imgSize) / 2, y: y + cardH * 0.03, w: imgSize, h: imgSize, rounding: true })
        }

        slide.addText(s["Store Manager Name"] || "N/A", {
          x: x + 0.02, y: y + cardH * 0.30, w: cardW - 0.04, h: cardH * 0.12,
          fontSize: fName, fontFace: "Kanit", color: "0f172a", bold: true, align: "center", wrap: true,
        })
        slide.addText(s["Position (TH)"] || "Manager", {
          x: x + 0.02, y: y + cardH * 0.45, w: cardW - 0.04, h: cardH * 0.12,
          fontSize: fPos, fontFace: "Kanit", color: "64748b", align: "center", wrap: true,
        })
        // Blue Prefix (Title) removed as requested by user
        const smPhone = fmtPhone(s["Mobile"] || "")
        if (smPhone) {
          slide.addText(`📞 ${smPhone}`, {
            x: x + 0.02, y: y + cardH * 0.63, w: cardW - 0.04, h: cardH * 0.08,
            fontSize: fPhone, fontFace: "Kanit", color: "059669", align: "center",
          })
        }
        const age = s["Age"] || ""
        const yrService = calculateYearOfService(s["Hiring Date"]) || s["Year of Service"] || ""
        const infoLineArr = []
        if (age) infoLineArr.push(`อายุ ${age} ปี`)
        if (yrService) infoLineArr.push(`งาน ${yrService}`)

        const infoLine = infoLineArr.join(" | ")
        if (infoLine) {
          slide.addText(infoLine, {
            x: x + 0.02, y: y + cardH * 0.70, w: cardW - 0.04, h: cardH * 0.10,
            fontSize: fInfo, fontFace: "Kanit", color: "475569", align: "center", wrap: true,
          })
        }
        const badgeW = Math.min(cardW * 0.7, 0.85)
        slide.addShape(pptx.ShapeType.roundRect, {
          x: x + (cardW - badgeW) / 2, y: y + cardH * 0.84, w: badgeW, h: cardH * 0.10,
          fill: { type: "solid", color: "FEF3C7" }, rectRadius: 0.04,
        })
        slide.addText(`#${s["ST ID"]}`, {
          x: x + (cardW - badgeW) / 2, y: y + cardH * 0.84, w: badgeW, h: cardH * 0.10,
          fontSize: fId, fontFace: "Kanit", color: "d97706", bold: true, align: "center",
        })
      })
    }
    try {
      const fileName = `TalentExperience_Export_${new Date().toISOString().split('T')[0]}.pptx`
      const zipData = await pptx.write({ outputType: "blob" }) as Blob

      // === Method 1: File System Access API (showSaveFilePicker) ===
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'PowerPoint Presentation',
              accept: { 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'] }
            }]
          })
          const writable = await handle.createWritable()
          await writable.write(zipData)
          await writable.close()
          showToast(`บันทึกสำเร็จ: ${fileName}`)
          return
        } catch (err: any) {
          if (err.name === 'AbortError') {
            showToast("ยกเลิกการบันทึก")
            return
          }
          console.warn("showSaveFilePicker failed, trying fallback:", err)
        }
      }

      // === Method 2: Fallback to file-saver ===
      saveAs(zipData, fileName)
      showToast("กำลังดาวน์โหลดไฟล์...")
    } catch (err) {
      console.error("PPTX write error:", err)
      showToast("สร้างไฟล์ PPTX ล้มเหลว", "err")
    }
  }, [orgData, agmData, filteredOrgData, imageCache])

  if (!mounted || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <AppHeader
        activePage={page as PageId}
        onNavigate={(p) => setPage(p as PageId | "sheet")}
        onOpenSheet={() => setPage("sheet")}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={handleLogout}
        onExcelUpload={handleExcelUpload}
      />

      <main className="flex-1 mx-auto w-full max-w-[1440px] px-5 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-32 animate-in fade-in">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-base font-bold text-primary tracking-wide">กำลังประมวลผลข้อมูล...</p>
          </div>
        )}

        {error && !loading && (
          <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <p className="text-sm font-bold text-blue-600 flex items-center gap-2 mb-3">
              <FileUp className="h-5 w-5" />
              {error}
            </p>
            <div className="flex gap-3 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                <FileUp className="h-4 w-4" />
                นำเข้าไฟล์ Excel (.xlsx) เพื่อเริ่มใช้งาน
                <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
              </label>
              <button onClick={() => loadAllData()} className="rounded-xl border border-border bg-white px-5 py-3 text-sm font-bold text-muted-foreground">
                ลองอีกครั้ง
              </button>
            </div>
          </div>
        )}

        {!loading && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {page === "dash" && (
              <Dashboard
                orgData={orgData}
                agmData={agmData}
                imageCache={imageCache}
                onNavigate={(p) => setPage(p as PageId)}
                onOpenSheet={() => setPage("sheet")}
              />
            )}

            {page === "org" && (
              <div id="org-export-target">
                <OrgChart
                  orgData={orgData}
                  agmData={agmData}
                  imageCache={imageCache}
                  onEditAgm={() => setPage("agm")}
                  onShowDetail={setDetailStore}
                  onExportPptx={handleExportPptx}
                  onFilteredDataChange={setFilteredOrgData}
                />
              </div>
            )}

            {page === "agm" && (
              <AgmManager
                agmData={agmData}
                imageCache={imageCache}
                onSave={handleSaveAgm}
                onDelete={handleDeleteAgm}
                onRefresh={handleRefresh}
                actionLoading={actionLoading}
              />
            )}

            {page === "data" && (
              <StoreManager
                orgData={orgData}
                agmData={agmData}
                imageCache={imageCache}
                onAdd={handleAddRow}
                onUpdate={handleUpdateRow}
                onDelete={handleDeleteRow}
                onBulkImport={handleBulkImport}
                onRefresh={handleRefresh}
                actionLoading={actionLoading}
              />
            )}

            {page === "sheet" && (
              <MockSheet
                orgData={orgData}
                agmData={agmData}
                imageCache={imageCache}
                onUpdateOrg={handleUpdateRow}
                onAddOrg={handleAddRow}
                onDeleteOrg={handleDeleteRow}
                onUpdateAgm={handleSaveAgm}
                onDeleteAgm={handleDeleteAgm}
                onReorderOrg={async (oldIdx, newIdx) => {
                  await (import("@/lib/store")).then(m => m.reorderRow(oldIdx, newIdx))
                }}
                onReset={async () => {
                  await (import("@/lib/store")).then(m => m.resetData())
                }}
              />
            )}
          </div>
        )}
      </main>

      <AppFooter />

      {detailStore && <StoreDetailModal store={detailStore} imageCache={imageCache} onClose={() => setDetailStore(null)} />}
      {selectedProvince && (
        <ProvinceDetailModal
          province={selectedProvince}
          orgData={orgData}
          agmData={agmData}
          imageCache={imageCache}
          onClose={() => setSelectedProvince(null)}
        />
      )}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} onSave={() => loadAllData()} />

      {toast && (
        <div className={`fixed bottom-10 right-10 z-[999] max-w-xs animate-in slide-in-from-bottom-6 rounded-2xl px-6 py-4 text-sm font-bold text-white shadow-2xl ${toast.type === "ok" ? "bg-primary border-b-4 border-primary/30" : "bg-destructive border-b-4 border-destructive/30"}`}>
          {toast.msg}
        </div>
      )}

      {actionLoading && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-background/60 backdrop-blur-md animate-in fade-in">
          <div className="flex flex-col items-center gap-4 p-8 glass-card">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-base font-black text-primary animate-pulse">กำลังบันทึกข้อมูล...</p>
          </div>
        </div>
      )}
    </div>
  )
}
