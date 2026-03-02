"use client"

import { useState } from "react"
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
  Menu,
  X,
  FilePlus,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems: { id: PageId; label: string; icon: any }[] = [
    { id: "dash", label: "หน้าหลัก", icon: LayoutDashboard },
    { id: "org", label: "ผังองค์กร", icon: FileBarChart },
    { id: "data", label: "จัดการสาขา", icon: Database },
    { id: "agm", label: "จัดการ AGM", icon: Users },
  ]

  const handleNavigate = (id: PageId) => {
    onNavigate(id)
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-[1400px] px-4 sm:px-5 pointer-events-none">
      <div className="glass-card flex h-16 items-center justify-between px-4 sm:px-6 pointer-events-auto relative">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleNavigate("dash")}>
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-xl shadow-premium group-active:scale-95 transition-transform">
              <Image
                src="/images/logo.jpg"
                alt="Logo"
                fill
                className="object-cover"
              />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-[0.7rem] sm:text-sm font-black tracking-tight text-primary uppercase leading-tight">
                Talent Experience
              </h1>
              <p className="text-[0.5rem] sm:text-[0.6rem] font-bold text-muted-foreground uppercase tracking-widest">
                HR Intelligence Portal
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 rounded-2xl bg-muted/50 p-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
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

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Actions - Desktop/Tablet */}
          <div className="hidden sm:flex items-center gap-2">
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-emerald-50 px-4 text-xs font-black text-emerald-600 transition-all hover:bg-emerald-100 hover:shadow-sm active:scale-95 premium-button">
              <FilePlus className="h-4 w-4" />
              <span className="hidden md:inline">นำเข้า CSV / EXCEL</span>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={onExcelUpload} className="hidden" />
            </label>

            <button
              onClick={onOpenSheet}
              className={`flex h-10 items-center justify-center gap-2 px-4 rounded-xl text-xs font-bold transition-all ${activePage === ("sheet" as any)
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-secondary text-primary hover:bg-primary hover:text-white"
                } premium-button`}
            >
              <Database className="h-4 w-4" />
              <span className="hidden md:inline">ฐานข้อมูล</span>
            </button>
          </div>

          <div className="hidden sm:block h-6 w-px bg-border mx-1" />

          {/* Icon Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenSettings}
              className="p-2 sm:p-2.5 rounded-xl bg-muted/50 text-muted-foreground hover:text-primary hover:bg-white hover:shadow-sm transition-all premium-button"
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
              className="p-2 sm:p-2.5 rounded-xl bg-muted/50 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 hover:shadow-sm transition-all premium-button"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 sm:p-2.5 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 transition-all premium-button active:scale-95"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Overlay */}
        {mobileMenuOpen && (
          <div className="absolute top-20 left-0 right-0 glass-card p-4 flex flex-col gap-2 animate-in slide-in-from-top-4 duration-300 pointer-events-auto lg:hidden">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-xs font-black transition-all ${activePage === item.id
                    ? "bg-primary text-white shadow-lg"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="h-px bg-border mx-2 mb-2" />

            <div className="flex flex-col gap-2">
              <label className="flex h-12 cursor-pointer items-center justify-center gap-3 rounded-2xl bg-emerald-50 px-4 text-xs font-black text-emerald-600 transition-all active:scale-95">
                <FilePlus className="h-5 w-5" />
                นำเข้า CSV / EXCEL
                <input type="file" accept=".csv,.xlsx,.xls" onChange={onExcelUpload} className="hidden" />
              </label>

              <button
                onClick={() => {
                  onOpenSheet()
                  setMobileMenuOpen(false)
                }}
                className={`flex h-12 items-center justify-center gap-3 px-4 rounded-2xl text-xs font-black transition-all ${activePage === ("sheet" as any)
                  ? "bg-primary text-white shadow-lg"
                  : "bg-secondary text-primary"
                  }`}
              >
                <Database className="h-5 w-5" />
                จัดการฐานข้อมูล
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
