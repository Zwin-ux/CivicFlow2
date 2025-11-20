"use client"

import { motion } from "framer-motion"
import { ArrowRight, FileText, Users, Shield, Plus, Search, Bell, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import DemoLayout from "@/components/layout/DemoLayout"
import { StatCard, ActivityFeed } from "@/components/demo/DashboardWidgets"

export default function DemoPage() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <DemoLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Command Center</h1>
            <p className="text-gray-500 mt-1">Welcome back, Officer Anderson. You have 3 pending reviews.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-full">
              <Search className="w-5 h-5 text-gray-500" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full relative">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </Button>
            <Link href="/demo/intake">
              <Button className="gap-2 rounded-full shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" /> New Application
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Applications"
            value="1,284"
            change="+12% this week"
            trend="up"
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="Avg. Risk Score"
            value="84/100"
            change="-2.4% risk reduction"
            trend="down"
            icon={Shield}
            color="violet"
          />
          <StatCard
            title="Processing Time"
            value="1.2 Days"
            change="-4 hours avg"
            trend="up"
            icon={Clock}
            color="green"
          />
          <StatCard
            title="Pending Review"
            value="14"
            change="+3 since yesterday"
            trend="neutral"
            icon={Users}
            color="amber"
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Activity & Tasks */}
          <motion.div variants={item} className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Priority Queue</h2>
                <Button variant="ghost" size="sm" className="text-primary">View All</Button>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-500 font-bold border border-gray-200 group-hover:border-primary/30 group-hover:text-primary transition-colors">
                        {i}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Application #{202400 + i}</h3>
                        <p className="text-sm text-gray-500">Acme Corp • $1.2M Request</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        Needs Review
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white relative overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-violet-500/20 transition-all group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <FileText className="w-32 h-32 -mr-8 -mt-8" />
                </div>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">Start Intake</h3>
                  <p className="text-violet-100 text-sm mt-1">Launch new application workflow</p>
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-gray-200 text-gray-900 relative overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-primary">
                  <Shield className="w-32 h-32 -mr-8 -mt-8" />
                </div>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">Risk Center</h3>
                  <p className="text-gray-500 text-sm mt-1">View compliance reports</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Feed */}
          <motion.div variants={item} className="lg:col-span-1">
            <ActivityFeed />
          </motion.div>
        </div>
      </motion.div>
    </DemoLayout>
  )
}
