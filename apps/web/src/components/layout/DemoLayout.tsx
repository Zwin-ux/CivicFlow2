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
        <div className="min-h-screen bg-background flex">
            {/* Navigation Drawer (Sidebar) */}
            <aside className="w-80 bg-surface-variant/30 border-r border-outline-variant hidden md:flex flex-col fixed h-full z-10">
                <div className="p-6">
                    <div className="flex items-center gap-3 font-semibold text-xl tracking-tight text-on-surface">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
                            C
                        </div>
                        CivicFlow
                    </div>
                    <div className="mt-4 inline-flex items-center rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs font-medium text-on-surface-variant">
                        <span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
                        Demo Mode Active
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-4 px-4 py-3.5 rounded-full text-sm font-medium transition-all relative overflow-hidden group",
                                    isActive
                                        ? "text-on-secondary-container bg-secondary-container"
                                        : "text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface"
                                )}
                            >
                                {/* Ripple container */}
                                <span className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-current transition-opacity" />

                                <Icon className={cn("w-6 h-6", isActive ? "fill-current" : "")} />
                                {item.label}
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
