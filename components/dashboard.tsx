import { useMemo, useState } from "react"
import Image from "next/image"
import type { OrgRecord, AgmRecord, PageId } from "@/lib/types"
import {
  Users,
  Building2,
  LayoutDashboard,
  Plus,
  FileSpreadsheet,
  ChevronRight,
  Phone,
  MapPin,
  Globe,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  GraduationCap,
} from "lucide-react"
import { getServiceYears } from "@/lib/utils"

interface DashboardProps {
  orgData: OrgRecord[]
  agmData: AgmRecord[]
  imageCache: Record<string, string>
  onNavigate: (page: PageId) => void
  onOpenSheet: () => void
}

export default function Dashboard({
  orgData,
  agmData,
  imageCache,
  onNavigate,
  onOpenSheet,
}: DashboardProps) {

  const getImg = (url?: string) => {
    if (!url) return null
    return url.startsWith("localdb://") ? imageCache[url.replace("localdb://", "")] || null : url
  }

  /* ── geo stats ─────────────────────────────────────── */
  const zoneSummary = useMemo(() => {
    const map: Record<string, { stores: number; agms: Set<string> }> = {}
    orgData.forEach(s => {
      const z = s["Region"] || "Unknown"
      if (!map[z]) map[z] = { stores: 0, agms: new Set() }
      map[z].stores++
      if (s["Line Manager name"]) map[z].agms.add(s["Line Manager name"])
    })
    return Object.entries(map).map(([zone, d]) => ({
      zone, stores: d.stores, agms: d.agms.size,
    })).sort((a, b) => b.stores - a.stores)
  }, [orgData])

  const allAGMs = useMemo(() => [...new Set(orgData.map(s => s["Line Manager name"]).filter(Boolean))], [orgData])

  /* AGM list for photo strip */
  const agmList = useMemo(() => {
    if (agmData.length > 0) return agmData
    return allAGMs.map(name => ({
      "AGM Name": name,
      "AGM ZONE": "",
      "Mobile Phone": "",
      Email: "",
      "Image URL": "",
      Remark: ""
    } as AgmRecord))
  }, [agmData, allAGMs])

  /* ── Zone-level analytics for infographic ─── */
  const zoneAnalytics = useMemo(() => {
    const zones = [...new Set(orgData.map(s => s["Region"] || "Unknown"))].sort()
    return zones.map(zone => {
      const records = orgData.filter(s => (s["Region"] || "Unknown") === zone)
      // Gender from Gender field
      let male = 0, female = 0, unknownGender = 0
      records.forEach(r => {
        const g = (r["Gender"] || "").toLowerCase().trim()
        const name = (r["Store Manager Name"] || "").trim()

        // 1. Check Gender field (English & Thai & Abbreviations)
        if (g === "male" || g === "m" || g === "ชาย" || g === "ช") {
          male++
        } else if (g === "female" || g === "f" || g === "หญิง" || g === "ญ") {
          female++
        } else {
          // 2. Fallback to name prefix if Gender is missing or unknown
          const malePrefixes = ["นาย", "น.", "mr."]
          const femalePrefixes = ["นางสาว", "นาง", "น.ส.", "ms.", "mrs."]

          const isMale = malePrefixes.some(p => name.startsWith(p))
          const isFemale = femalePrefixes.some(p => name.startsWith(p))

          if (isMale) male++
          else if (isFemale) female++
          else unknownGender++
        }
      })
      // Age distribution
      const ageBuckets: Record<string, number> = { '20-29': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 }
      let ageCount = 0, ageSum = 0
      records.forEach(r => {
        const age = parseFloat(r["Age"] || "")
        if (!isNaN(age) && age > 0) {
          ageCount++; ageSum += age
          if (age < 30) ageBuckets['20-29']++
          else if (age < 40) ageBuckets['30-39']++
          else if (age < 50) ageBuckets['40-49']++
          else if (age < 60) ageBuckets['50-59']++
          else ageBuckets['60+']++
        }
      })
      // Service year buckets (Calculated from Hiring Date)
      const svcBuckets: Record<string, number> = { '<1 Yr': 0, '1-<3 Yrs': 0, '3-<5 Yrs': 0, '5-<10 Yrs': 0, '10+ Yrs': 0 }
      let svcCount = 0, svcSum = 0
      records.forEach(r => {
        const yr = getServiceYears(r["Hiring Date"])
        if (!isNaN(yr) && yr >= 0) {
          svcCount++; svcSum += yr
          if (yr < 1) svcBuckets['<1 Yr']++
          else if (yr < 3) svcBuckets['1-<3 Yrs']++
          else if (yr < 5) svcBuckets['3-<5 Yrs']++
          else if (yr < 10) svcBuckets['5-<10 Yrs']++
          else svcBuckets['10+ Yrs']++
        }
      })
      // Education
      const edu: Record<string, number> = {}
      records.forEach(r => {
        const e = (r["Hi Educ Level"] || "").trim()
        if (e) edu[e] = (edu[e] || 0) + 1
      })
      // Core age group (highest bucket)
      const coreAge = Object.entries(ageBuckets).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0])
      return {
        zone, total: records.length,
        male, female, unknownGender,
        ageBuckets, ageCount, avgAge: ageCount > 0 ? (ageSum / ageCount) : 0,
        avgService: svcCount > 0 ? (svcSum / svcCount) : 0,
        svcBuckets,
        coreAge: { range: coreAge[0], count: coreAge[1] },
        edu: Object.entries(edu).sort((a, b) => b[1] - a[1]),
      }
    })
  }, [orgData])

  /* ── Overall analytics (all zones combined) ─── */
  const overallAnalytics = useMemo(() => {
    if (zoneAnalytics.length === 0) return null
    const agg = {
      total: 0, male: 0, female: 0, unknownGender: 0,
      ageBuckets: { '20-29': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 } as Record<string, number>,
      ageCount: 0, ageSum: 0,
      svcBuckets: { '<1 Yr': 0, '1-<3 Yrs': 0, '3-<5 Yrs': 0, '5-<10 Yrs': 0, '10+ Yrs': 0 } as Record<string, number>,
      svcSum: 0, svcCount: 0,
      edu: {} as Record<string, number>,
    }
    zoneAnalytics.forEach(z => {
      agg.total += z.total; agg.male += z.male; agg.female += z.female; agg.unknownGender += z.unknownGender
      agg.ageCount += z.ageCount
      Object.entries(z.ageBuckets).forEach(([k, v]) => { agg.ageBuckets[k] = (agg.ageBuckets[k] || 0) + v })
      Object.entries(z.svcBuckets).forEach(([k, v]) => { agg.svcBuckets[k] = (agg.svcBuckets[k] || 0) + v })
      z.edu.forEach(([k, v]) => { agg.edu[k] = (agg.edu[k] || 0) + v })
      agg.ageSum += z.avgAge * z.ageCount
      agg.svcSum += z.avgService * z.total; agg.svcCount += z.total
    })
    const coreAge = Object.entries(agg.ageBuckets).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0])
    return {
      total: agg.total, male: agg.male, female: agg.female, unknownGender: agg.unknownGender,
      ageBuckets: agg.ageBuckets, ageCount: agg.ageCount,
      avgAge: agg.ageCount > 0 ? agg.ageSum / agg.ageCount : 0,
      avgService: agg.svcCount > 0 ? agg.svcSum / agg.svcCount : 0,
      svcBuckets: agg.svcBuckets,
      coreAge: { range: coreAge[0], count: coreAge[1] },
      edu: Object.entries(agg.edu).sort((a, b) => b[1] - a[1]),
    }
  }, [zoneAnalytics])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ══ HERO SECTION - Clean & Focused ════════════════════════ */}
      <section className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-2xl px-6 py-10 md:px-10 md:py-16">
        {/* Abstract Background Decoration */}
        <div className="absolute inset-0 opacity-[0.06] z-0"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl z-0" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl z-0" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="mb-4 md:mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 md:px-5 md:py-2 text-[0.6rem] md:text-[0.7rem] font-black uppercase tracking-[0.25em] text-white/80 backdrop-blur-md border border-white/10">
            <Globe className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400" />
            Organization Intelligence
          </div>
          <h1 className="text-3xl md:text-6xl font-black text-white leading-tight">
            Talent Acquisition <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              Operation Map
            </span>
          </h1>
          <p className="mt-4 md:mt-6 text-slate-400 text-base md:text-lg font-medium leading-relaxed">
            ภาพรวมโครงสร้าง แบ่งตามภูมิภาค<br className="hidden sm:block" />
            ยกระดับการบริหารจัดการสาขาด้วยข้อมูลที่แม่นยำ
          </p>
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row justify-center gap-3 md:gap-4 w-full sm:w-auto px-4 sm:px-0">
            <button
              onClick={() => onNavigate("org")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white text-slate-900 px-8 py-4 text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
            >
              ดูผังองค์กร <ArrowUpRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate("data")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 text-white border border-white/20 px-8 py-4 text-sm font-black backdrop-blur-md transition-all hover:bg-white/20"
            >
              จัดการข้อมูลสาขา
            </button>
          </div>
        </div>
      </section>

      {/* ══ TEAM & STATISTICS SECTION ══════════════════════════════ */}
      <section className="group relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-3xl min-h-[450px] md:min-h-[550px] flex flex-col justify-end">
        {/* Background Image - High Clarity */}
        <div className="absolute inset-0 z-0 text-center">
          <Image
            src="/images/employees.png"
            alt="Talent Acquisition Team"
            fill
            className="object-cover opacity-100 object-center md:object-[center_20%] transition-transform duration-[3000ms] group-hover:scale-105"
            priority
          />
          {/* Subtle gradient to ensure stats readability - Lightened on mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent md:from-slate-950 md:via-slate-900/40" />
        </div>

        {/* Stats Overlay - Premium Glassmorphism */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-white/10 bg-slate-950/60 md:bg-slate-950/70 backdrop-blur-xl border-t border-white/10">
          {[
            { val: zoneSummary.length, label: "Zones", sub: "เขตบริหาร", icon: "🌏" },
            { val: allAGMs.length, label: "AGMs", sub: "ผู้บริหารเขต", icon: "👤" },
            { val: orgData.length, label: "Total Stores", sub: "สาขาทั้งหมด", icon: "🏪" },
            { val: "2026", label: "Fiscal Year", sub: "ปีงบประมาณ", icon: "📅" },
          ].map((s, i) => (
            <div key={i} className={`flex flex-col items-center justify-center py-6 md:py-10 px-4 hover:bg-white/5 transition-all group/stat ${i === 2 ? 'col-span-1' : ''}`}>
              <span className="text-xl md:text-2xl mb-1 md:mb-2 transform transition-transform group-hover/stat:scale-110 duration-500">{s.icon}</span>
              <p className="text-2xl md:text-4xl font-black text-white tabular-nums drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">{s.val}</p>
              <p className="text-[0.6rem] md:text-[0.7rem] font-black uppercase tracking-[0.2em] text-white/80 mt-1 md:mt-2">{s.label}</p>
              <p className="text-[0.55rem] md:text-[0.65rem] font-medium text-white/50">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PHOTO SHOWCASE (AGM & STAFF) ═══════════════════════════ */}
      <div className="glass-card px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-primary/60">Area General Managers</p>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {agmList.map(agm => {
                const img = getImg(agm["Image URL"])
                const zone = agm["AGM ZONE"] || orgData.find(s => s["Line Manager name"] === agm["AGM Name"])?.["Region"]
                const isSouth = (zone || "").includes("South")
                return (
                  <button key={agm["AGM Name"]} onClick={() => onNavigate("agm")} className="group flex flex-col items-center gap-2 hover:scale-110 transition-all">
                    <div className={`relative h-14 w-14 overflow-hidden rounded-2xl border-2 shadow-lg transition-all group-hover:border-primary ${isSouth ? "border-emerald-400/40" : "border-sky-400/40"}`}>
                      {img ? <Image src={img} alt={agm["AGM Name"]} fill className="object-cover" /> :
                        <div className={`flex h-full w-full items-center justify-center text-base font-black bg-gradient-to-br ${isSouth ? "from-emerald-800 to-teal-900" : "from-blue-800 to-sky-900"} text-white/50`}>
                          {agm["AGM Name"]?.[0]}
                        </div>}
                    </div>
                    <p className="text-[0.6rem] font-black text-primary/70 truncate max-w-[60px]">{agm["AGM Name"]}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>


      {/* ══ DEMOGRAPHIC INFOGRAPHICS ════════════════════════════ */}
      {overallAnalytics && (() => {
        const o = overallAnalytics
        const totalG = o.male + o.female + o.unknownGender
        const fPct = totalG > 0 ? ((o.female / totalG) * 100).toFixed(1) : '0'
        const mPct = totalG > 0 ? ((o.male / totalG) * 100).toFixed(1) : '0'
        const fFrac = totalG > 0 ? o.female / totalG : 0
        const mFrac = totalG > 0 ? o.male / totalG : 0
        const cDash = 2 * Math.PI * 42
        const ageE = Object.entries(o.ageBuckets)
        const maxA = Math.max(...ageE.map(e => e[1]), 1)
        const cW = 400, cH = 140, stp = cW / (ageE.length - 1)
        const pts = ageE.map(([, v], i) => ({ x: i * stp, y: cH - (v / maxA) * (cH - 24) }))
        const aP = `M${pts.map(p => `${p.x},${p.y}`).join(' L')} L${cW},${cH} L0,${cH} Z`
        const lP = `M${pts.map(p => `${p.x},${p.y}`).join(' L')}`
        return (
          <section className="space-y-8">
            {/* ── OVERALL FULL-WIDTH CARD ── */}
            <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2b46 50%, #162d50 100%)' }}>
              {/* Title */}
              <div className="px-8 pt-8 pb-4">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Store Manager <span style={{ color: '#f97316' }}>Demographic</span> <br className="md:hidden" />
                  <span style={{ color: '#f97316' }}>Overview</span>
                  <span className="text-white/60 ml-2 text-base md:text-lg">(Total: {o.total})</span>
                </h2>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">2026 Snapshot — All Regions</p>
              </div>

              {/* KPI Cards */}
              <div className="px-6 md:px-8 pb-5 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: 'Total Headcount', val: `${o.total}`, sub: 'Store Managers', color: '#f97316' },
                  { label: 'Female Led', val: `${fPct}%`, sub: `${o.female} persons`, color: '#ec4899' },
                  { label: 'Core Age Group', val: `${o.coreAge.range}`, sub: `${o.coreAge.count} persons`, color: '#8b5cf6' },
                  { label: 'Avg Service', val: `${o.avgService.toFixed(1)} Yrs`, sub: 'Average tenure', color: '#06b6d4' },
                ].map(kpi => (
                  <div key={kpi.label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-4">
                    <p className="text-[0.55rem] font-bold uppercase tracking-widest text-white/50">{kpi.label}</p>
                    <p className="text-2xl md:text-3xl font-black tabular-nums mt-1" style={{ color: kpi.color }}>{kpi.val}</p>
                    <p className="text-[0.55rem] font-medium text-white/40 mt-0.5">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* Main Grid */}
              <div className="px-6 md:px-8 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* GENDER */}
                <div className="rounded-2xl bg-white p-5">
                  <p className="text-[0.6rem] font-black uppercase tracking-wider mb-4">
                    <span className="text-orange-500">GENDER:</span> <span className="text-slate-600">Diversity Split</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-28 h-28 flex-shrink-0">
                      <svg viewBox="0 0 90 90" className="w-full h-full -rotate-90">
                        <circle cx="45" cy="45" r="42" fill="none" stroke="#f1f5f9" strokeWidth="9" />
                        <circle cx="45" cy="45" r="42" fill="none" stroke="#ec4899" strokeWidth="9"
                          strokeDasharray={`${fFrac * cDash} ${cDash}`} strokeLinecap="round" />
                        <circle cx="45" cy="45" r="42" fill="none" stroke="#3b82f6" strokeWidth="9"
                          strokeDasharray={`${mFrac * cDash} ${cDash}`}
                          strokeDashoffset={`-${fFrac * cDash}`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-slate-800 tabular-nums">{totalG}</span>
                        <span className="text-[0.45rem] font-bold text-slate-400 uppercase">Total</span>
                      </div>
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-pink-500" />
                        <span className="text-xs font-bold text-slate-600">Female:</span>
                        <span className="text-sm font-black text-pink-500 tabular-nums">{fPct}% <span className="text-slate-400 font-medium">({o.female})</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-xs font-bold text-slate-600">Male:</span>
                        <span className="text-sm font-black text-blue-500 tabular-nums">{mPct}% <span className="text-slate-400 font-medium">({o.male})</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AGE GROUP - Area Chart */}
                <div className="md:col-span-2 rounded-2xl bg-white p-5">
                  <p className="text-[0.6rem] font-black uppercase tracking-wider mb-2">
                    <span className="text-purple-500">AGE GROUP:</span> <span className="text-slate-600">Workforce Maturity</span>
                    <span className="ml-2 text-xs font-black text-orange-500 tabular-nums">({o.ageCount} คน)</span>
                  </p>
                  <div className="overflow-x-auto pb-2 scrollbar-hide">
                    <div className="min-w-[400px]">
                      <svg viewBox={`-25 -10 ${cW + 50} ${cH + 35}`} className="w-full h-auto">
                        <defs>
                          <linearGradient id="overallAgeFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
                          <line key={i} x1="0" y1={cH - f * (cH - 24)} x2={cW} y2={cH - f * (cH - 24)} stroke="#e2e8f0" strokeWidth="0.5" />
                        ))}
                        <path d={aP} fill="url(#overallAgeFill)" />
                        <path d={lP} fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinejoin="round" />
                        {pts.map((p, i) => {
                          const [rng, cnt] = ageE[i]
                          const is60 = rng === '60+'
                          return (
                            <g key={rng}>
                              <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={is60 ? '#ef4444' : '#06b6d4'} strokeWidth="2.5" />
                              <text x={p.x} y={p.y - 12} textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'} fontSize="11" fontWeight="900" fill={is60 ? '#ef4444' : '#0e7490'}>
                                {`${rng}: ${cnt}`}
                              </text>
                              <text x={p.x} y={cH + 18} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="700">{rng}</text>
                            </g>
                          )
                        })}
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Right Column: Education + Stability */}
                <div className="space-y-4">
                  {/* EDUCATION */}
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[0.6rem] font-black uppercase tracking-wider mb-3">
                      <span className="text-emerald-500">EDUCATION:</span> <span className="text-slate-600">Background</span>
                    </p>
                    <div className="space-y-1.5">
                      {o.edu.slice(0, 5).map(([lv, ct], i) => {
                        const cols = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#6b7280']
                        return (
                          <div key={lv} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cols[i] }} />
                            <span className="text-[0.6rem] font-bold text-slate-600 flex-1 truncate">{lv}</span>
                            <span className="text-xs font-black text-slate-800 tabular-nums">({ct})</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {/* POSITION STABILITY */}
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[0.6rem] font-black uppercase tracking-wider mb-3">
                      <span className="text-cyan-500">STABILITY:</span>
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(o.svcBuckets).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([rng, ct]) => {
                        const pct = o.total > 0 ? (ct / o.total) * 100 : 0
                        return (
                          <div key={rng} className="flex items-center gap-1.5">
                            <span className="text-[0.55rem] font-bold text-slate-500 w-14 flex-shrink-0">{rng}</span>
                            <div className="flex-1 h-3.5 rounded bg-slate-100 overflow-hidden">
                              <div className="h-full rounded" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: '#06b6d4' }} />
                            </div>
                            <span className="text-xs font-black text-slate-700 tabular-nums w-7 text-right">({ct})</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 md:px-8 py-4 border-t border-white/10 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-6 min-w-max">
                  <span className="text-[0.6rem] font-black text-orange-400 uppercase tracking-widest flex-shrink-0">Key Insights</span>
                  <div className="flex items-center gap-4 flex-nowrap">
                    <span className="text-[0.6rem] text-white/50 whitespace-nowrap">1. {parseFloat(fPct) > 50 ? 'Strong Female Leadership' : 'Male Dominant Workforce'}</span>
                    <span className="text-[0.6rem] text-white/50 whitespace-nowrap">2. Core Age {o.coreAge.range} yrs</span>
                    <span className="text-[0.6rem] text-white/50 whitespace-nowrap">3. Avg Service {o.avgService.toFixed(1)} yrs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BY REGION HEADER ── */}
            <div className="flex items-center gap-4 pt-2">
              <div className="h-10 w-1.5 rounded-full bg-gradient-to-b from-orange-400 to-pink-500" />
              <div>
                <h2 className="text-xl font-black text-foreground">Demographic <span className="text-orange-500">By Region</span></h2>
                <p className="text-xs text-muted-foreground font-medium">Individual zone breakdown</p>
              </div>
            </div>

            {/* ── PER-ZONE CARDS ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {zoneAnalytics.map(z => {
                const isSouth = z.zone.includes("South")
                const totalGender = z.male + z.female + z.unknownGender
                const femalePct = totalGender > 0 ? ((z.female / totalGender) * 100).toFixed(1) : '0'
                const malePct = totalGender > 0 ? ((z.male / totalGender) * 100).toFixed(1) : '0'
                const bgGrad = isSouth ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' : 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #3730a3 100%)'
                const accentColor = isSouth ? '#34d399' : '#60a5fa'
                const femaleColor = '#ec4899'
                const maleColor = isSouth ? '#34d399' : '#60a5fa'
                const strokeDash = 2 * Math.PI * 42
                const femaleFrac = totalGender > 0 ? z.female / totalGender : 0
                const maleFrac = totalGender > 0 ? z.male / totalGender : 0
                const ageEntries = Object.entries(z.ageBuckets)
                const maxAge = Math.max(...ageEntries.map(e => e[1]), 1)
                const chartW = 260, chartH = 120
                const step = chartW / (ageEntries.length - 1)
                const points = ageEntries.map(([, v], i) => ({ x: i * step, y: chartH - (v / maxAge) * (chartH - 20) }))
                const areaPath = `M${points.map(p => `${p.x},${p.y}`).join(' L')} L${chartW},${chartH} L0,${chartH} Z`
                const linePath = `M${points.map(p => `${p.x},${p.y}`).join(' L')}`

                return (
                  <div key={z.zone} className="rounded-2xl overflow-hidden shadow-lg" style={{ background: bgGrad }}>
                    {/* Title */}
                    <div className="px-6 pt-6 pb-3">
                      <h3 className="text-base font-black text-white tracking-tight">
                        <span style={{ color: accentColor }}>{z.zone}</span>
                        <span className="text-white/60 ml-2 text-sm">— Store Manager Overview (Total: {z.total})</span>
                      </h3>
                      <p className="text-[0.6rem] font-bold text-white/30 uppercase tracking-widest mt-1">2026 Snapshot</p>
                    </div>

                    {/* KPI Cards */}
                    <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3">
                        <p className="text-[0.55rem] font-bold text-white/50 uppercase">Headcount:</p>
                        <p className="text-2xl font-black tabular-nums" style={{ color: accentColor }}>{z.total}</p>
                        <p className="text-[0.55rem] font-medium text-white/40">Managers</p>
                      </div>
                      <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3">
                        <p className="text-[0.55rem] font-bold text-white/50 uppercase">Female Led:</p>
                        <p className="text-2xl font-black text-pink-400 tabular-nums">{femalePct}%</p>
                      </div>
                      <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3">
                        <p className="text-[0.55rem] font-bold text-white/50 uppercase">Core Age:</p>
                        <p className="text-xl font-black text-white tabular-nums">{z.coreAge.range} Yrs</p>
                        <p className="text-[0.55rem] font-medium text-white/40">({z.coreAge.count})</p>
                      </div>
                    </div>

                    {/* Content Grid */}
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* GENDER */}
                      <div className="rounded-xl bg-white p-4">
                        <p className="text-[0.6rem] font-black uppercase tracking-wider mb-3">
                          <span className="text-pink-500">GENDER:</span> <span className="text-slate-600">Diversity</span>
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="relative w-20 h-20 flex-shrink-0">
                            <svg viewBox="0 0 90 90" className="w-full h-full -rotate-90">
                              <circle cx="45" cy="45" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                              <circle cx="45" cy="45" r="42" fill="none" stroke={femaleColor} strokeWidth="8"
                                strokeDasharray={`${femaleFrac * strokeDash} ${strokeDash}`} strokeLinecap="round" />
                              <circle cx="45" cy="45" r="42" fill="none" stroke={maleColor} strokeWidth="8"
                                strokeDasharray={`${maleFrac * strokeDash} ${strokeDash}`}
                                strokeDashoffset={`-${femaleFrac * strokeDash}`} strokeLinecap="round" />
                            </svg>
                          </div>
                          <div className="space-y-1 flex-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">♀</span>
                              <span className="font-black text-pink-500">{femalePct}%</span>
                              <span className="text-slate-400">({z.female})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">♂</span>
                              <span className="font-black" style={{ color: maleColor }}>{malePct}%</span>
                              <span className="text-slate-400">({z.male})</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AGE GROUP */}
                      <div className="rounded-xl bg-white p-4">
                        <p className="text-[0.6rem] font-black uppercase tracking-wider mb-1">
                          <span className="text-cyan-500">AGE GROUP:</span> <span className="text-slate-600">Maturity</span>
                        </p>
                        <div className="overflow-x-auto pb-2 scrollbar-hide">
                          <div className="min-w-[260px]">
                            <svg viewBox={`-20 -10 ${chartW + 40} ${chartH + 35}`} className="w-full h-auto">
                              <defs>
                                <linearGradient id={`zFill-${z.zone.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
                                  <stop offset="100%" stopColor={accentColor} stopOpacity="0.05" />
                                </linearGradient>
                              </defs>
                              {[0, 0.5, 1].map((f, i) => (
                                <line key={i} x1="0" y1={chartH - f * (chartH - 20)} x2={chartW} y2={chartH - f * (chartH - 20)} stroke="#e2e8f0" strokeWidth="0.5" />
                              ))}
                              <path d={areaPath} fill={`url(#zFill-${z.zone.replace(/\s/g, '')})`} />
                              <path d={linePath} fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinejoin="round" />
                              {points.map((p, i) => {
                                const [range, count] = ageEntries[i]
                                const is60 = range === '60+'
                                return (
                                  <g key={range}>
                                    <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={is60 ? '#ef4444' : accentColor} strokeWidth="2" />
                                    <text x={p.x} y={p.y - 10} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="9" fontWeight="900" fill={is60 ? '#ef4444' : '#1e293b'}>
                                      {`${range}: ${count}`}
                                    </text>
                                    <text x={p.x} y={chartH + 16} textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="700">{range}</text>
                                  </g>
                                )
                              })}
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* EDUCATION */}
                      <div className="rounded-xl bg-white p-4">
                        <p className="text-[0.6rem] font-black uppercase tracking-wider mb-2">
                          <span className="text-emerald-500">EDUCATION</span>
                        </p>
                        <div className="space-y-1.5">
                          {z.edu.slice(0, 5).map(([level, count], i) => {
                            const colors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#6b7280']
                            return (
                              <div key={level} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i] }} />
                                <span className="text-[0.6rem] font-bold text-slate-600 flex-1 truncate">{level}</span>
                                <span className="text-xs font-black text-slate-700 tabular-nums">({count})</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* POSITION STABILITY */}
                      <div className="rounded-xl bg-white p-4">
                        <p className="text-[0.6rem] font-black uppercase tracking-wider mb-2">
                          <span className="text-amber-500">STABILITY</span>
                        </p>
                        <div className="space-y-1.5">
                          {Object.entries(z.svcBuckets).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([range, count]) => {
                            const pct = z.total > 0 ? (count / z.total) * 100 : 0
                            return (
                              <div key={range} className="flex items-center gap-1.5">
                                <span className="text-[0.55rem] font-bold text-slate-500 w-14 flex-shrink-0">{range}</span>
                                <div className="flex-1 h-3.5 rounded bg-slate-100 overflow-hidden">
                                  <div className="h-full rounded" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: accentColor }} />
                                </div>
                                <span className="text-xs font-black text-slate-700 tabular-nums w-7 text-right">({count})</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-2.5 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-[0.55rem] font-black uppercase tracking-widest" style={{ color: accentColor }}>Key Insights</span>
                        <span className="text-[0.55rem] text-white/40">1. {parseFloat(femalePct) > 50 ? 'Female Led' : 'Male Dominant'}</span>
                        <span className="text-[0.55rem] text-white/40">2. Core {z.coreAge.range} yrs</span>
                        <span className="text-[0.55rem] text-white/40">3. Avg {z.avgService.toFixed(1)} yrs</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* ══ QUICK ACTIONS ═════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "ผังองค์กร", sub: "Org Chart", icon: LayoutDashboard, page: "org", color: "bg-blue-50 text-blue-600" },
          { label: "เพิ่มสาขา", sub: "Store", icon: Plus, page: "data", color: "bg-emerald-50 text-emerald-600" },
          { label: "AGM", sub: "Manager", icon: Users, page: "agm", color: "bg-amber-50 text-amber-600" },
          { label: "ฐานข้อมูล", sub: "Sheet", icon: FileSpreadsheet, action: onOpenSheet, color: "bg-purple-50 text-purple-600" },
        ].map((qa) => (
          <button key={qa.label} onClick={() => qa.page ? onNavigate(qa.page as PageId) : qa.action?.()}
            className="flex flex-col items-center gap-3 rounded-[1.5rem] md:rounded-[2rem] glass-card p-4 md:p-6 hover:translate-y-[-4px] transition-all group">
            <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${qa.color.split(" ")[0]} group-hover:scale-110 transition-transform`}>
              <qa.icon className={`h-5 w-5 md:h-6 md:w-6 ${qa.color.split(" ")[1]}`} />
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm font-black text-foreground">{qa.label}</p>
              <p className="text-[0.5rem] md:text-[0.6rem] font-bold text-muted-foreground uppercase tracking-widest">{qa.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
