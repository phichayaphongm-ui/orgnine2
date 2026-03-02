"use client"

import Image from "next/image"
import { MapPin, Building2, Plus, ArrowRight } from "lucide-react"
import type { OrgRecord, AgmRecord } from "@/lib/types"

interface ProvinceDetailModalProps {
    province: string
    orgData: OrgRecord[]
    agmData: AgmRecord[]
    imageCache: Record<string, string>
    onClose: () => void
}

export default function ProvinceDetailModal({
    province,
    orgData,
    agmData,
    imageCache,
    onClose,
}: ProvinceDetailModalProps) {
    const getImg = (url?: string) => {
        if (!url) return null
        if (url.startsWith("localdb://")) return imageCache[url.replace("localdb://", "")] || null
        return url
    }

    const stores = orgData.filter((s) => (s as any).Province === province || s["Region"] === province)

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center md:items-center p-0 md:p-12 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full h-auto max-h-[95vh] md:h-auto md:max-w-4xl md:max-h-[85vh] overflow-hidden rounded-b-[2.5rem] md:rounded-[2.5rem] bg-white shadow-4xl flex flex-col animate-in slide-in-from-top-10 md:zoom-in-95 duration-300">
                {/* Modal Header */}
                <div className="px-6 py-6 md:px-10 md:py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className="p-2.5 md:p-3 bg-blue-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-blue-200">
                            <MapPin className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-none">{province}</h2>
                            <p className="text-[0.6rem] md:text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1.5 md:mt-2 flex items-center gap-2">
                                <Building2 className="h-3 w-3" /> Branch Details • {stores.length} Stores
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 md:h-12 md:w-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-400">
                        <Plus className="h-5 w-5 md:h-6 md:w-6 rotate-45" />
                    </button>
                </div>

                {/* Modal Content - Store List */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-4">
                    {stores.map((store, idx) => {
                        const agm = agmData.find((a) => a["AGM Name"] === store["Line Manager name"])
                        const agmImg = agm ? getImg(agm["Image URL"]) : null
                        const storeImg = getImg(store["Store Manager Image URL"])

                        return (
                            <div
                                key={idx}
                                className="group flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 rounded-3xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all gap-4"
                            >
                                <div className="flex items-center gap-4 md:gap-6">
                                    <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 flex-shrink-0">
                                        {storeImg ? (
                                            <Image src={storeImg} alt="Store" width={56} height={56} className="object-cover" />
                                        ) : (
                                            <Building2 className="h-5 w-5 md:h-6 md:w-6" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-base md:text-lg font-black text-slate-900 leading-tight">{store["Store Manager Name"] || store["ST ID"]}</p>
                                        <div className="mt-1 flex flex-col">
                                            <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Manager</p>
                                            <p className="text-[0.75rem] md:text-xs font-bold text-slate-600">{store["Store Manager Name"] || "N/A"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm transition-all group-hover:border-blue-200 md:group-hover:shadow-blue-100 self-start md:self-auto">
                                    {agmImg ? (
                                        <div className="h-8 w-8 rounded-full overflow-hidden relative border border-slate-200 flex-shrink-0">
                                            <Image src={agmImg} alt="AGM" fill className="object-cover" />
                                        </div>
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[0.6rem] font-black text-slate-400 flex-shrink-0">
                                            {store["Line Manager name"]?.[0]}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[0.65rem] font-black text-slate-700 leading-none">{store["Line Manager name"]}</p>
                                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase mt-0.5 whitespace-nowrap">AGM Level</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Modal Footer */}
                <div className="px-10 py-6 md:py-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-center pb-12 md:pb-8">
                    <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.2em]">End of Branch List</p>
                </div>
            </div>
        </div>
    )
}
