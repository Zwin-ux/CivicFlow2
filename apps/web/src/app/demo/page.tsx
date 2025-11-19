"use client"

import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, FileText, Shield, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import DemoLayout from "@/components/layout/DemoLayout"

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
        <motion.div variants={item} className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Welcome to CivicFlow Institutional
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl">
            Experience the future of SBA lending. This interactive demo showcases our
            AI-powered intake, underwriting, and compliance workflows.
          </p>
          <div className="flex gap-4 pt-4">
            <Link href="/demo/intake">
              <Button size="lg" className="gap-2">
                Start Intake Demo <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/demo/walkthrough">
              <Button variant="outline" size="lg" className="gap-2">
                Watch Walkthrough
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div variants={item} className="grid md:grid-cols-3 gap-6 pt-8">
          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                <FileText className="w-5 h-5" />
              </div>
              <CardTitle>Smart Intake</CardTitle>
              <CardDescription>
                AI-driven document classification and data extraction.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Instant OCR & Validation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Auto-generated Checklists
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 mb-2">
                <Shield className="w-5 h-5" />
              </div>
              <CardTitle>Risk & Compliance</CardTitle>
              <CardDescription>
                Real-time eligibility checks and fraud detection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  SBA 504/7(a) Rule Engine
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Automated KYC/KYB
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 mb-2">
                <Users className="w-5 h-5" />
              </div>
              <CardTitle>Collaboration</CardTitle>
              <CardDescription>
                Seamless communication between applicants and lenders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Secure Messaging
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Audit Trail
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DemoLayout>
  )
}
