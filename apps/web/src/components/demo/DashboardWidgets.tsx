"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, Clock, CheckCircle2, AlertCircle, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"

interface StatCardProps {
    title: string
    value: string
    change?: string
    trend?: "up" | "down" | "neutral"
    icon: React.ElementType
    color?: string
}

export function StatCard({ title, value, change, trend, icon: Icon, color = "violet" }: StatCardProps) {
    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 group"
        >
            <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity", `text-${color}-600`)}>
                <Icon className="w-24 h-24 -mr-4 -mt-4" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2 rounded-lg bg-gray-50", `text-${color}-600`)}>
                        <Icon className="w-5 h-5" />
                    </div>
                    {change && (
                        <div className={cn(
                            "flex items-center text-xs font-medium px-2 py-1 rounded-full",
                            trend === "up" ? "text-green-700 bg-green-50" :
                                trend === "down" ? "text-red-700 bg-red-50" : "text-gray-600 bg-gray-50"
                        )}>
                            {trend === "up" ? <ArrowUpRight className="w-3 h-3 mr-1" /> :
                                trend === "down" ? <ArrowDownRight className="w-3 h-3 mr-1" /> : null}
                            {change}
                        </div>
                    )}
                </div>
                <h3 className="text-sm font-medium text-gray-500">{title}</h3>
                <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
            </div>
        </motion.div>
    )
}

interface ActivityItem {
    id: string
    type: "application" | "review" | "alert" | "system"
    title: string
    description: string
    time: string
}

export function ActivityFeed() {
    const activities: ActivityItem[] = [
        { id: "1", type: "application", title: "New Application Received", description: "Acme Corp Inc. submitted a loan request", time: "2 min ago" },
        { id: "2", type: "alert", title: "Risk Flag Detected", description: "High debt-to-income ratio for Application #4829", time: "15 min ago" },
        { id: "3", type: "review", title: "Underwriting Complete", description: "TechStart LLC approved for $500k", time: "1 hour ago" },
        { id: "4", type: "system", title: "System Update", description: "Compliance ruleset v2.4 applied", time: "3 hours ago" },
    ]

    return (
        <Card className="h-full border-none shadow-sm bg-white/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">Live Activity</CardTitle>
                <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {activities.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex gap-4"
                        >
                            <div className="relative">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 relative",
                                    item.type === "application" ? "bg-blue-100 text-blue-600" :
                                        item.type === "alert" ? "bg-amber-100 text-amber-600" :
                                            item.type === "review" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                                )}>
                                    {item.type === "application" ? <FileText className="w-4 h-4" /> :
                                        item.type === "alert" ? <AlertCircle className="w-4 h-4" /> :
                                            item.type === "review" ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                </div>
                                {idx !== activities.length - 1 && (
                                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-100 -z-0" />
                                )}
                            </div>
                            <div className="flex-1 pt-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">{item.time}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
