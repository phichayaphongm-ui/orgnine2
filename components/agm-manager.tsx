"use client"

import { useState } from "react"
import Image from "next/image"
import type { AgmRecord } from "@/lib/types"
import {
  Users,
  Plus,
  RefreshCw,
  Trash2,
  Camera,
  Save,
  Loader2,
  Image as ImageIcon,
  ChevronRight,
  User,
} from "lucide-react"
import { uploadAndSaveImage } from "@/lib/store"

interface AgmManagerProps {
  agmData: AgmRecord[]
  imageCache: Record<string, string>
  onSave: (row: AgmRecord) => Promise<void>
  onDelete: (name: string) => Promise<void>
  onRefresh: () => Promise<void>
  actionLoading: boolean
}

export default function AgmManager({
  agmData,
  imageCache,
  onSave,
  onDelete,
  onRefresh,
  actionLoading,
}: AgmManagerProps) {
  const [editing, setEditing] = useState<AgmRecord | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  const handleEdit = (agm: AgmRecord) => {
    setEditing({ ...agm })
  }

  const handleNew = () => {
    setEditing({
      "AGM Name": "",
      "AGM ZONE": "",
      "Mobile Phone": "",
      Remark: "",
      "Image URL": "",
    } as AgmRecord)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !editing) return
    const file = e.target.files[0]
    try {
      // Use AGM Name as refId, or "new" if not yet named
      const refId = editing["AGM Name"] || "new-agm"
      const { url } = await uploadAndSaveImage(file, refId, "agm")
      setEditing({ ...editing, "Image URL": url })
    } catch (err) {
      alert("Error uploading image")
    }
  }

  const getDisplayImage = (url?: string) => {
    if (!url) return null
    if (url.startsWith("localdb://")) {
      return imageCache[url.replace("localdb://", "")] || null
    }
    return url
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">จัดการข้อมูล AGM</h2>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">Area General Manager Directory</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-black text-white shadow-xl shadow-primary/20 premium-button"
          >
            <Plus className="h-4 w-4" />
            เพิ่ม AGM ใหม่
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agmData.map((agm) => {
          const img = getDisplayImage(agm["Image URL"])
          return (
            <div key={agm["AGM Name"]} className="glass-card flex flex-col p-5 hover-lift group">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl border-2 border-muted shadow-sm group-hover:ring-2 group-hover:ring-primary/20 transition-all">
                  {img ? (
                    <Image src={img} alt={agm["AGM Name"]} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <User className="h-8 w-8 text-muted-foreground opacity-20" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="truncate text-base font-black text-foreground">{agm["AGM Name"]}</h4>
                  <p className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{agm["AGM ZONE"]}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => handleEdit(agm)}
                  className="w-full rounded-xl bg-secondary py-2.5 text-xs font-black text-primary hover:bg-primary hover:text-white transition-all"
                >
                  แก้ไขข้อมูล
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-sm glass-card p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-foreground mb-6 text-center uppercase tracking-widest">
              {editing["AGM Name"] ? "แก้ไขข้อมูล AGM" : "เพิ่ม AGM ใหม่"}
            </h3>

            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-24 w-24 overflow-hidden rounded-3xl shadow-premium ring-4 ring-primary/10">
                  {getDisplayImage(editing["Image URL"]) ? (
                    <Image src={getDisplayImage(editing["Image URL"])!} alt="Preview" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground opacity-20" />
                    </div>
                  )}
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                    <Camera className="h-6 w-6 text-white" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
                <p className="text-[0.6rem] font-black uppercase text-muted-foreground tracking-widest">คลิกเพื่อเปลี่ยนรูป</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">ชื่อ - นามสกุล</label>
                  <input
                    type="text"
                    value={editing["AGM Name"]}
                    onChange={(e) => setEditing({ ...editing, "AGM Name": e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">ภูมิภาค / เขต (Region / Zone)</label>
                  <input
                    type="text"
                    value={editing["AGM ZONE"]}
                    onChange={(e) => setEditing({ ...editing, "AGM ZONE": e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                    placeholder="เช่น North Region, South Region"
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">เบอร์โทรศัพท์ (Mobile)</label>
                  <input
                    type="text"
                    value={editing["Mobile Phone"]}
                    onChange={(e) => setEditing({ ...editing, "Mobile Phone": e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                    placeholder="000-000-0000"
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">หมายเหตุ (Remark)</label>
                  <textarea
                    value={editing.Remark}
                    onChange={(e) => setEditing({ ...editing, Remark: e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner min-h-[80px]"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-2xl py-4 text-sm font-black text-muted-foreground hover:bg-muted transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={async () => {
                    await onSave(editing)
                    setEditing(null)
                  }}
                  disabled={actionLoading || !editing["AGM Name"]}
                  className="flex-1 rounded-2xl bg-primary py-4 text-sm font-black text-white shadow-xl shadow-primary/20 premium-button disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "บันทึกข้อมูล"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
