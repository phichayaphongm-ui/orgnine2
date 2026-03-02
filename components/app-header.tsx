"use client"

import Image from "next/image"
import type { PageId } from "@/lib/types"
import {
  LayoutDashboard,
  Users,
  Database,
  FileBarChart,
  Settings,
  ChevronRight,
  LogOut,
} from "lucide-react"

interface AppHeaderProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  onOpenSheet: () => void
  onOpenSettings: () => void
  onLogout: () => void
  onExcelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function AppHeader({
  activePage,
  onNavigate,
  onOpenSheet,
  onOpenSettings,
  onLogout,
  onExcelUpload,
}: AppHeaderProps) {
  const navItems: { id: PageId; label: string; icon: any }[] = [
    { id: "dash", label: "หน้าหลัก", icon: LayoutDashboard },
    { id: "org", label: "ผังองค์กร", icon: FileBarChart },
    { id: "data", label: "จัดการสาขา", icon: Database },
    { id: "agm", label: "จัดการ AGM", icon: Users },
  ]

  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-[1400px] px-5 pointer-events-none">
      <div className="glass-card flex h-16 items-center justify-between px-6 pointer-events-auto">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => onNavigate("dash")}>
            <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-premium group-active:scale-95 transition-transform">
              <Image
                src="/images/logo.jpg"
                alt="Logo"
                fill
                className="object-cover"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-black tracking-tight text-primary uppercase leading-tight">
                Talent Experience
              </h1>
              <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-widest">
                HR Intelligence Portal
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 rounded-2xl bg-muted/50 p-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activePage === item.id
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                  }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Upload Button */}
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-emerald-50 px-4 text-xs font-black text-emerald-600 transition-all hover:bg-emerald-100 hover:shadow-sm active:scale-95 premium-button">
            <FileBarChart className="h-4 w-4" />
            <span className="hidden sm:inline">นำเข้า CSV / EXCEL</span>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={onExcelUpload} className="hidden" />
          </label>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Data Sheet Mockup Link */}
          <button
            onClick={onOpenSheet}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePage === ("sheet" as any)
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "bg-secondary text-primary hover:bg-primary hover:text-white"
              } premium-button`}
          >
            <Database className="h-4 w-4" />
            <span className="hidden md:inline">จัดการฐานข้อมูล</span>
          </button>

          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-muted/50 text-muted-foreground hover:text-primary hover:bg-white hover:shadow-sm transition-all premium-button"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            onClick={() => {
              if (confirm("คุณแน่ใจว่าต้องการออกจากระบบ?")) {
                onLogout()
              }
            }}
            className="p-2.5 rounded-xl bg-muted/50 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 hover:shadow-sm transition-all premium-button"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
