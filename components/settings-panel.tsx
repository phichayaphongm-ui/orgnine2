"use client"

import { useState, useEffect } from "react"
import { storageService } from "@/lib/storage-service"
import { Settings, ShieldCheck, AlertCircle, Download, Upload, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  onSave: () => void
}

export default function SettingsPanel({ open, onClose, onSave }: SettingsPanelProps) {
  const [stats, setStats] = useState({ orgCount: 0, agmCount: 0 })

  useEffect(() => {
    async function fetchStats() {
      if (open) {
        const orgData = await storageService.getOrgData()
        const agmData = await storageService.getAgmData()
        setStats({
          orgCount: orgData.length,
          agmCount: agmData.length
        })
      }
    }
    fetchStats()
  }, [open])

  async function handleExport() {
    const data = {
      orgData: await storageService.getOrgData(),
      agmData: await storageService.getAgmData(),
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `talent-experience-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("ส่งออกข้อมูลสำเร็จ")
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.orgData) await storageService.saveOrgData(data.orgData)
        if (data.agmData) await storageService.saveAgmData(data.agmData)

        toast.success("นำเข้าข้อมูลสำเร็จ")
        setStats({
          orgCount: data.orgData?.length || 0,
          agmCount: data.agmData?.length || 0
        })
        onSave()
      } catch (err) {
        toast.error("ไฟล์ไม่ถูกต้อง")
      }
    }
    reader.readAsText(file)
  }

  async function handleSync() {
    const t = toast.loading("กำลังซิงค์ข้อมูลขึ้น Cloud...")
    try {
      await storageService.syncToCloud()
      const orgData = await storageService.getOrgData()
      const agmData = await storageService.getAgmData()
      setStats({
        orgCount: orgData.length,
        agmCount: agmData.length
      })
      toast.success("ซิงค์ข้อมูลสำเร็จ! ข้อมูลของคุณออนไลน์แล้ว", { id: t })
      onSave()
    } catch (err) {
      toast.error("ซิงค์ข้อมูลล้มเหลว กรุณาลองใหม่", { id: t })
    }
  }

  async function handleReset() {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด? ข้อมูลทั้งในเครื่องและบน Cloud จะหายไปถาวร!")) {
      await storageService.resetAllData()
      toast.success("ล้างข้อมูลสำเร็จ")
      setStats({ orgCount: 0, agmCount: 0 })
      onSave()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg animate-in zoom-in-95 overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
            <Settings className="h-4 w-4" />
            การตั้งค่าระบบ
          </h3>
          <button onClick={onClose} className="text-lg text-muted-foreground hover:text-foreground">&times;</button>
        </div>

        <div className="space-y-5 p-6 max-h-[80vh] overflow-y-auto">
          {/* Status */}
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                โหมดทำงานแบบออนไลน์ (Supabase Protected)
              </p>
              <p className="text-xs text-muted-foreground">
                ข้อมูลถูกจัดเก็บแบบส่วนตัวบน Cloud และแชร์ได้ทุกอุปกรณ์
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-background p-3 text-center">
              <p className="text-xs text-muted-foreground font-semibold">จำนวนสาขา</p>
              <p className="text-lg font-black text-primary">{stats.orgCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 text-center">
              <p className="text-xs text-muted-foreground font-semibold">จำนวน AGM</p>
              <p className="text-lg font-black text-primary">{stats.agmCount}</p>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Cloud Actions */}
          <div className="space-y-3">
            <p className="text-[0.6rem] font-black uppercase tracking-widest text-muted-foreground px-1">ระบบคลาวด์</p>
            <button
              onClick={handleSync}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-white transition-all hover:bg-primary/90 hover:shadow-lg active:scale-95"
            >
              <Upload className="h-4 w-4" />
              ซิงค์ข้อมูลขึ้น Cloud (SYNC NOW)
            </button>
          </div>

          <div className="h-px bg-border/50" />

          {/* Local Storage Actions */}
          <div className="space-y-3">
            <p className="text-[0.6rem] font-black uppercase tracking-widest text-muted-foreground px-1">จัดการข้อมูลสำรอง</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-[0.7rem] font-bold transition-all hover:bg-secondary hover:border-primary/30"
              >
                <Download className="h-4 w-4" />
                ส่งออก (EXPORT)
              </button>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-[0.7rem] font-bold transition-all hover:bg-secondary hover:border-primary/30">
                <Upload className="h-4 w-4" />
                นำเข้า (IMPORT)
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>

            <button
              onClick={handleReset}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 py-3 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              ล้างข้อมูลทั้งหมด (RESET)
            </button>
          </div>

          <div className="rounded-xl bg-accent/5 p-4 border border-dashed border-accent/20">
            <p className="flex items-center gap-2 text-xs font-black text-foreground uppercase tracking-wider">
              <AlertCircle className="h-3.5 w-3.5 text-accent" />
              คำแนะนำระบบออนไลน์
            </p>
            <p className="mt-1 text-[0.65rem] text-muted-foreground leading-relaxed">
              ในโหมดออนไลน์ ข้อมูลของคุณจะถูกเก็บไว้ที่ Supabase ซึ่งมีความปลอดภัยสูงและคุณสามารถเข้าถึงข้อมูลเดียวกันได้จากทุกที่ที่เข้าสู่ระบบ
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4 bg-muted/20">
          <button
            onClick={onClose}
            className="rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg active:scale-95"
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  )
}

