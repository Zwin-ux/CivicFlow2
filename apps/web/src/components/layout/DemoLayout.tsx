"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { LayoutDashboard, FileText, MessageSquare, ShieldCheck, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DemoLayoutProps {
    children: React.ReactNode
}

export default function DemoLayout({ children }: DemoLayoutProps) {
    const pathname = usePathname()

    const navItems = [
        { href: "/demo", label: "Overview", icon: LayoutDashboard },
        { href: "/demo/intake", label: "Intake", icon: FileText },
        { href: "/demo/timeline", label: "Timeline", icon: MessageSquare },
        { href: "/demo/underwriting", label: "Underwriting", icon: ShieldCheck },
        { href: "/demo/walkthrough", label: "Walkthrough", icon: PlayCircle },
    ]

    return (
        <div className="min-h-screen bg-background flex relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-3xl" />
            </div>

            {/* Navigation Drawer (Sidebar) */}
            <aside className="w-80 bg-surface/80 backdrop-blur-xl border-r border-outline-variant/40 hidden md:flex flex-col fixed h-full z-20">
                <div className="p-6">
                    <div className="flex items-center gap-3 font-semibold text-xl tracking-tight text-on-surface">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20">
                            C
                        </div>
                        CivicFlow
                    </div>
                    <div className="mt-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Demo Mode Active
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto mt-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "text-primary bg-primary/10 shadow-sm"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-primary/10 rounded-xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <Icon className={cn("w-5 h-5 relative z-10", isActive ? "fill-current" : "")} />
                                <span className="relative z-10">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-6 border-t border-outline-variant">
                    <div className="rounded-[20px] bg-surface p-4 shadow-sm border border-outline-variant/50">
                        <p className="text-xs font-medium text-on-surface-variant mb-2">Session Status</p>
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            System Operational
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-80 min-h-screen transition-all duration-300 ease-in-out">
                <div className="max-w-6xl mx-auto p-8 md:p-12">
                    {children}
                </div>
            </main>
        </div>
    )
}
