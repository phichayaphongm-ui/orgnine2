"use client"

import Image from "next/image"

export default function AppFooter() {
    return (
        <footer className="mt-12 border-t border-border bg-card/50 py-10 backdrop-blur-sm">
            <div className="mx-auto max-w-[1440px] px-5">
                <div className="flex flex-col items-center justify-center gap-8">
                    {/* Employee Group Image - Moved from Banner to Footer */}
                    <div className="flex w-full flex-col items-center justify-between gap-6 pt-6 border-t border-border lg:flex-row">
                        <div className="flex items-center gap-4">
                            <Image
                                src="/images/logo.jpg"
                                alt="Logo"
                                width={100}
                                height={35}
                                className="h-8 w-auto grayscale opacity-50 transition-all hover:grayscale-0 hover:opacity-100"
                            />
                            <div className="h-4 w-px bg-border hidden sm:block" />
                            <p className="text-xs text-muted-foreground">
                                © {new Date().getFullYear()} Talent Experience. All rights reserved.
                            </p>
                        </div>

                        <div className="flex items-center gap-6">
                            <p className="text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase">
                                HR Technology | Org-chart System
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
