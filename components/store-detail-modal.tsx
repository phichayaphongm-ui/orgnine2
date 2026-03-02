"use client"

import type { OrgRecord } from "@/lib/types"
import { formatPhone, calculateYearOfService } from "@/lib/utils"

interface StoreDetailModalProps {
  store: OrgRecord | null
  imageCache: Record<string, string>
  onClose: () => void
}

export default function StoreDetailModal({ store, imageCache, onClose }: StoreDetailModalProps) {
  if (!store) return null

  let img = store._localImage || store["Store Manager Image URL"]

  // Resolve localdb protocol
  if (img?.startsWith("localdb://")) {
    const id = img.replace("localdb://", "")
    img = imageCache[id] || ""
  }

  const fields = [
    { label: "ST ID", value: store["ST ID"] },
    { label: "Title", value: store["Title"] },
    { label: "Store Manager Name", value: store["Store Manager Name"] },
    { label: "Gender", value: store["Gender"] },
    { label: "Position (TH)", value: store["Position (TH)"] },
    { label: "Mobile", value: formatPhone(store["Mobile"]) },
    { label: "Age", value: store["Age"] },
    { label: "Hi Educ Level", value: store["Hi Educ Level"] },
    { label: "Hiring Date", value: store["Hiring Date"] },
    { label: "Year of Service", value: calculateYearOfService(store["Hiring Date"]) || store["Year of Service"] },
    { label: "Line Manager name", value: store["Line Manager name"] },
    { label: "Region", value: store["Region"] },
  ]


  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md animate-in zoom-in-95 rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-sm font-bold text-primary">ข้อมูลสาขา</h3>
          <button onClick={onClose} className="text-lg text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>
        <div className="p-6">
          {img && (
            <img
              src={img}
              alt=""
              className="mx-auto mb-4 h-20 w-20 rounded-full border-[3px] border-primary object-cover"
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="text-sm font-medium text-foreground">{f.value || "-"}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
