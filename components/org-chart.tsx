"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import Image from "next/image"
import type { OrgRecord, AgmRecord } from "@/lib/types"
import {
  FileDown,
  Search,
  Filter,
  User,
  Phone,
  Printer,
  MapPin,
  ChevronDown,
  ChevronRight,
  Building2,
} from "lucide-react"
import { formatPhone, calculateYearOfService } from "@/lib/utils"

interface OrgChartProps {
  orgData: OrgRecord[]
  agmData: AgmRecord[]
  imageCache: Record<string, string>
  onEditAgm: (name: string) => void
  onShowDetail: (s: OrgRecord) => void
  onExportPptx: () => void
  onFilteredDataChange?: (stores: OrgRecord[]) => void
}

export default function OrgChart({
  orgData,
  agmData,
  imageCache,
  onEditAgm,
  onShowDetail,
  onExportPptx,
  onFilteredDataChange,
}: OrgChartProps) {
  const [selectedZone, setSelectedZone] = useState<string>("all")
  const [selectedAgm, setSelectedAgm] = useState<string>("all")
  const [collapsedAgms, setCollapsedAgms] = useState<Set<string>>(new Set())
  const chartRef = useRef<HTMLDivElement>(null)

  /* ─── Build Region → AGM → [stores] tree ─────────────────── */
  const tree = useMemo(() => {
    const regionMap: Record<string, Record<string, OrgRecord[]>> = {}
    orgData.forEach(r => {
      const region = r["Region"]
      const agm = r["Line Manager name"]
      const sid = r["ST ID"]

      // Condition: Must have Line Manager name, Region, and ST ID to be in the chart
      if (!region || !agm || !sid) return

      if (!regionMap[region]) regionMap[region] = {}
      if (!regionMap[region][agm]) regionMap[region][agm] = []
      regionMap[region][agm].push(r)
    })
    return regionMap
  }, [orgData])

  const filteredTree = useMemo(() => {
    const result: typeof tree = {}
    for (const [region, agms] of Object.entries(tree)) {
      if (selectedZone !== "all" && region !== selectedZone) continue
      const filteredAgms: Record<string, OrgRecord[]> = {}
      for (const [agm, stores] of Object.entries(agms)) {
        if (selectedAgm !== "all" && agm !== selectedAgm) continue
        const matches = stores.filter(s =>
          selectedAgm === "all" || agm === selectedAgm
        )
        if (matches.length) filteredAgms[agm] = matches
      }
      if (Object.keys(filteredAgms).length) result[region] = filteredAgms
    }
    return result
  }, [tree, selectedZone, selectedAgm])

  const allRegions = useMemo(() => Object.keys(tree).sort(), [tree])
  const allAgms = useMemo(() => {
    const agms = new Set<string>()
    Object.values(tree).forEach(regionAgms => {
      Object.keys(regionAgms).forEach(agm => agms.add(agm))
    })
    return [...agms].sort()
  }, [tree])
  const filteredStores = useMemo(() => Object.values(filteredTree).flatMap(a => Object.values(a).flat()), [filteredTree])
  const totalVisible = filteredStores.length

  // Notify parent whenever filter changes (for filter-aware export)
  useEffect(() => {
    onFilteredDataChange?.(filteredStores)
  }, [filteredStores, onFilteredDataChange])

  const toggleAgm = (agm: string) =>
    setCollapsedAgms(prev => { const n = new Set(prev); n.has(agm) ? n.delete(agm) : n.add(agm); return n })

  const getImg = (url?: string, record?: OrgRecord | AgmRecord) => {
    if (record?._localImage) return record._localImage
    if (!url) return null
    return url.startsWith("localdb://") ? imageCache[url.replace("localdb://", "")] || null : url
  }

  /* ─── Region style config ──────────────────────────────────── */
  const regionCfg: Record<string, { gradient: string; accent: string; icon: string; label: string }> = {
    "Hyper Operations - North Region": { gradient: "from-sky-600 to-blue-800", accent: "bg-sky-500", icon: "🧭", label: "ภาคเหนือ / North Region" },
    "Hyper Operations - South Region": { gradient: "from-emerald-500 to-teal-800", accent: "bg-emerald-500", icon: "🏝️", label: "ภาคใต้ / South Region" },
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 5mm; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="glass-card no-print flex flex-wrap gap-2 sm:gap-3 p-4 sm:p-5 items-center">

        {/* Zone filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <select
            value={selectedZone}
            onChange={e => setSelectedZone(e.target.value)}
            className="flex-1 sm:flex-none rounded-2xl border-none bg-white py-3 pl-4 pr-8 text-sm font-bold shadow-sm appearance-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">ทุก Region</option>
            {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* AGM filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <select
            value={selectedAgm}
            onChange={e => setSelectedAgm(e.target.value)}
            className="flex-1 sm:flex-none rounded-2xl border-none bg-white py-3 pl-4 pr-8 text-sm font-bold shadow-sm appearance-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">ทุก AGM ({allAgms.length})</option>
            {allAgms.map(agm => {
              const count = Object.values(filteredTree).reduce((acc, regionAgms) => acc + (regionAgms[agm]?.length || 0), 0)
              if (count === 0) return null
              return (
                <option key={agm} value={agm}>{agm} ({count} สาขา)</option>
              )
            })}
          </select>
        </div>

        {/* Stats & Buttons Wrapper */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-secondary/50 px-4 py-2.5">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-black text-primary uppercase tracking-wider">{totalVisible} สาขา</span>
          </div>

          <button onClick={onExportPptx}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20">
            <FileDown className="h-4 w-4" /> PowerPoint
          </button>
        </div>
      </div>

      {/* ── Hierarchy Legend ──────────────────────────────────── */}
      <div className="no-print flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground px-1 flex-wrap">
        <span className="rounded-lg bg-blue-100 text-blue-700 px-3 py-1.5">🌏 Region</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="rounded-lg bg-amber-100 text-amber-700 px-3 py-1.5">👤 AGM</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="rounded-lg bg-emerald-100 text-emerald-700 px-3 py-1.5">🧑‍💼 Store Manager</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="rounded-lg bg-slate-100 text-slate-700 px-3 py-1.5">🏪 Store Name</span>
      </div>


      {/* ── Org Chart Tree ─────────────────────────────────────── */}
      <div ref={chartRef} className="overflow-x-auto pb-8 scrollbar-hide -mx-2 px-2">
        <div className="min-w-max space-y-14 px-4">
          {Object.entries(filteredTree).sort().map(([region, agms]) => {
            const cfg = regionCfg[region]

            return (
              <div key={region} className="relative">
                <div className="flex flex-col items-center mb-8">
                  <div className={`inline-flex items-center gap-3 rounded-3xl bg-gradient-to-r ${cfg?.gradient || "from-slate-600 to-slate-800"} px-8 py-4 shadow-2xl border border-white/10`}>
                    <div className="ml-4 flex gap-3">
                      <div className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur-sm">
                        <p className={`font-black text-white text-2xl`}>{Object.values(agms).flat().length}</p>
                        <p className="text-[0.5rem] font-bold uppercase text-white/50">สาขา</p>
                      </div>
                      <div className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur-sm">
                        <p className={`font-black text-white text-2xl`}>{Object.keys(agms).length}</p>
                        <p className="text-[0.5rem] font-bold uppercase text-white/50">AGM</p>
                      </div>
                    </div>
                  </div>
                  {/* connector down */}
                  <div className={`w-0.5 bg-gradient-to-b from-primary/40 to-transparent h-8`} />
                </div>

                {/* ─ Level 2: AGMs ─ */}
                <div className="space-y-10">
                  {Object.entries(agms).sort().map(([agmName, stores]) => {
                    const agmRec = agmData.find(a => a["AGM Name"] === agmName)
                    const agmImg = getImg(agmRec?.["Image URL"], agmRec)
                    const isCollapsed = collapsedAgms.has(agmName)

                    return (
                      <div key={agmName}>
                        {/* AGM Node */}
                        <div className="flex flex-col items-center">
                          <div className={`glass-card border-2 border-amber-300/60 bg-gradient-to-br from-white to-amber-50 shadow-xl text-center transition-all hover:border-amber-400/80 p-6 w-60`}>
                            {/* AGM Photo */}
                            <div className={`relative mx-auto overflow-hidden rounded-2xl border-4 border-amber-200 shadow-lg h-24 w-24 mb-4 bg-white`}>
                              {agmImg ? (
                                <img src={agmImg} alt={agmName} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100">
                                  <User className={`text-amber-300 h-10 w-10`} />
                                </div>
                              )}
                            </div>
                            {/* 1. Name */}
                            <h4 className={`font-black text-foreground leading-snug text-sm mb-1.5`}>{agmName}</h4>
                            {/* 2. Position */}
                            <p className={`font-black text-amber-700 uppercase tracking-widest text-[0.55rem] mb-1.5`}>
                              {agmRec?.Position || "Area General Manager"}
                            </p>
                            {/* 3. Mobile Phone */}
                            {agmRec?.["Mobile Phone"] && (
                              <div className={`flex items-center justify-center gap-1 text-amber-600 mt-1`}>
                                <Phone className={"h-3.5 w-3.5"} />
                                <span className={`font-bold text-xs`}>{formatPhone(agmRec?.["Mobile Phone"])}</span>
                              </div>
                            )}
                            <div className="mt-4 flex gap-2">
                              <button onClick={() => onEditAgm(agmName)}
                                className="flex-1 rounded-xl bg-amber-100 py-2 text-[0.65rem] font-black text-amber-700 hover:bg-amber-200 transition-all">
                                แก้ไข
                              </button>
                              <button onClick={() => toggleAgm(agmName)}
                                className="rounded-xl bg-muted p-2 text-muted-foreground hover:text-primary transition-all">
                                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                          {/* Connector down to SM level */}
                          {!isCollapsed && <div className={`w-0.5 bg-gradient-to-b from-amber-300 to-border h-8`} />}
                        </div>

                        {/* ─ Level 3+4: Store Manager + Store Name ─ */}
                        {!isCollapsed && (
                          <div className="relative">
                            {/* Horizontal bar across all SM cards */}
                            {stores.length > 1 && (
                              <div className="absolute -top-3 left-[4%] right-[4%] h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />
                            )}

                            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-3`}>
                              {stores.sort((a, b) => (a["Store Manager Name"] || "").localeCompare(b["Store Manager Name"] || "")).map((s, idx) => {
                                const smImgRaw = getImg(s["Store Manager Image URL"], s)
                                const smName = s["Store Manager Name"] || ""
                                const storeName = s["Title"] || ""

                                // Aggressive cleanse: if SM image is identical to AGM image but they are different people, it's a data pollution bug
                                const smImg = (smImgRaw && smImgRaw === agmImg && smName.trim() !== agmName.trim()) ? null : smImgRaw

                                return (
                                  <div
                                    key={idx}
                                    onClick={() => onShowDetail(s)}
                                    className={`relative flex flex-col items-center cursor-pointer group hover:z-10 transition-all text-center glass-card p-4 rounded-2xl bg-white/90 hover:ring-2 hover:ring-primary/20 hover:shadow-lg w-36 sm:w-40 md:w-44`}
                                  >
                                    {/* Vertical connector from top bar */}
                                    <div className="absolute -top-3 left-1/2 w-0.5 h-3 bg-border -translate-x-1/2" />

                                    {/* ─ Level 3: Store Manager photo ─ */}
                                    <div className={`relative overflow-hidden border-2 border-emerald-200 bg-muted/30 h-20 w-20 rounded-2xl mb-2.5 bg-white`}>
                                      {smImg ? (
                                        <img src={smImg || ""} alt={storeName} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-50">
                                          <User className={`text-emerald-200 h-10 w-10`} />
                                        </div>
                                      )}
                                    </div>

                                    {/* ─ 1. Name ─ */}
                                    {smName ? (
                                      <p className={`font-black text-slate-800 group-hover:text-emerald-700 transition-colors leading-tight w-full truncate text-[0.8rem]`}>
                                        {smName}
                                      </p>
                                    ) : (
                                      <p className={`italic text-muted-foreground/50 w-full truncate text-[0.7rem]`}>— SM —</p>
                                    )}

                                    {/* ─ 2. Position ─ */}
                                    {s["Position (TH)"] && (
                                      <p className={`w-full text-[0.65rem] text-slate-500 font-bold mt-1.5 leading-snug line-clamp-2`}>
                                        {s["Position (TH)"]}
                                      </p>
                                    )}

                                    {/* ─ 3. Mobile ─ */}
                                    {s["Mobile"] && (
                                      <div className={`flex items-center justify-center gap-1 text-emerald-600 mt-1.5`}>
                                        <Phone className={"h-3 w-3"} />
                                        <span className={`font-bold text-[0.7rem]`}>
                                          {formatPhone(s["Mobile"])}
                                        </span>
                                      </div>
                                    )}

                                    {/* ─ 4. Age ─ */}
                                    {s.Age && (
                                      <p className={`w-full truncate text-[0.65rem] mt-1.5 ${parseInt(s.Age) >= 60 ? 'text-red-600 font-black' : 'text-slate-600 font-bold'}`}>
                                        อายุ: {s.Age}
                                      </p>
                                    )}

                                    {/* ─ 5. Tenure / Year of Service ─ */}
                                    {s["Hiring Date"] && (() => {
                                      const yos = calculateYearOfService(s["Hiring Date"])
                                      return yos ? (
                                        <p className={`w-full truncate text-[0.65rem] text-slate-600 font-bold mt-0.5`}>
                                          อายุงาน: {yos}
                                        </p>
                                      ) : null
                                    })()}

                                    {/* Spacer to push ST ID to bottom if card grows */}
                                    <div className="flex-1 min-h-[8px]"></div>

                                    {/* ─ 6. ST ID ─ */}
                                    {s["ST ID"] && (
                                      <div className={`w-full border-t border-slate-100 pt-2 mt-1`}>
                                        <p className={`w-full truncate text-[0.8rem] text-blue-600 font-black tracking-widest`}>
                                          #{s["ST ID"]}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        {/* Empty state */}
        {Object.keys(filteredTree).length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 glass-card border-dashed border-2">
            <Search className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <span className="text-sm font-bold text-muted-foreground">ไม่พบข้อมูลที่ค้นหา</span>
          </div>
        )}
      </div>
    </div>
  )
}
