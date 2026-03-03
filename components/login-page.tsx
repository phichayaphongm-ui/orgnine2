"use client"

import { useState } from "react"
import { Lock, User, LogIn, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react"
import Image from "next/image"

interface LoginPageProps {
    onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(false)

        setTimeout(() => {
            if (username === "Temanagement" && password === "retail1920") {
                localStorage.setItem("te_auth", "true")
                onLogin()
            } else {
                setError(true)
                setLoading(false)
            }
        }, 800)
    }

    const handleForgotPassword = () => {
        window.location.href = "mailto:wanich342516@gmail.com?subject=Request Password Reset for Talent Acquisition"
    }

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0a0c10]">
            {/* --- ANIMATED BACKGROUND LAYER --- */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                {/* Primary Mesh Gradient */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-float-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[150px] rounded-full animate-float-slower" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full animate-pulse-slow" />

                {/* Moving Lines / Grid Effect */}
                <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />

                {/* Radial Overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0c10_80%)]" />
            </div>

            <style jsx global>{`
                @keyframes float-slow {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(10%, 5%) scale(1.1); }
                }
                @keyframes float-slower {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-5%, -10%) scale(1.05); }
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.6; }
                }
                .animate-float-slow { animation: float-slow 15s ease-in-out infinite; }
                .animate-float-slower { animation: float-slower 20s ease-in-out infinite; }
                .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
                
                .glass-card-auth {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                .input-field-auth {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .input-field-auth:focus {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: #3b82f6;
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
                }
            `}</style>

            <div className="relative z-10 w-full max-w-[450px] px-6 py-12 animate-in fade-in zoom-in-95 duration-1000">
                <div className="glass-card-auth rounded-[2.5rem] p-8 md:p-12 text-center">
                    {/* Header/Logo */}
                    <div className="mb-10 inline-flex items-center justify-center">
                        <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 p-0.5 shadow-2xl">
                            <div className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-[#0a0c10]">
                                <ShieldCheck className="h-8 w-8 text-blue-400" />
                            </div>
                        </div>
                    </div>

                    <div className="mb-10">
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                            Talent <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Acquisition</span>
                        </h1>
                        <p className="text-slate-400 font-medium text-sm">HR Intelligence Portal</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 text-left">
                        <div className="space-y-2">
                            <label className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Identity Access</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="input-field-auth w-full rounded-2xl py-4.5 pl-12 pr-4 text-white font-medium outline-none placeholder:text-slate-600 border-none"
                                    placeholder="Username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-500">Security Key</label>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-[0.65rem] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
                                >
                                    Forgot Access?
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field-auth w-full rounded-2xl py-4.5 pl-12 pr-4 text-white font-medium outline-none placeholder:text-slate-600 border-none"
                                    placeholder="Password"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-400 text-xs font-bold animate-in shake-in-1">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                Access denied. Please verify your credentials.
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative group overflow-hidden rounded-2xl py-4.5 text-sm font-black text-white transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 group-hover:to-blue-400 transition-all" />
                            <div className="relative flex items-center justify-center gap-2">
                                {loading ? (
                                    <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Authenticate System
                                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-white/5">
                        <p className="text-[0.6rem] text-slate-600 font-bold uppercase tracking-[0.3em]">
                            © {new Date().getFullYear()} Talent Acquisition Systems
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
