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
        <div className="min-h-screen bg-gray-50/50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-10">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white font-bold">
                            C
                        </div>
                        CivicFlow
                    </div>
                    <div className="mt-2 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                        Demo Mode
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                                    isActive
                                        ? "text-violet-700 bg-violet-50"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {item.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute left-0 w-1 h-6 bg-violet-600 rounded-r-full"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                    />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="rounded-lg bg-gray-50 p-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">Session Status</p>
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Active
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 min-h-screen">
                <div className="max-w-5xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
