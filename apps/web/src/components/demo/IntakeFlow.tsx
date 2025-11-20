"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Loader2, FileText, ArrowRight, AlertCircle } from "lucide-react"
import { DocumentUpload } from "./DocumentUpload"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { cn } from "@/lib/utils"

type Step = "upload" | "processing" | "review" | "complete"

interface ProcessingStep {
    id: string
    label: string
    status: "pending" | "processing" | "complete" | "error"
}

export function IntakeFlow() {
    const [step, setStep] = React.useState<Step>("upload")
    const [file, setFile] = React.useState<File | null>(null)
    const [processingSteps, setProcessingSteps] = React.useState<ProcessingStep[]>([
        { id: "virus", label: "Security Scan", status: "pending" },
        { id: "ocr", label: "OCR Text Extraction", status: "pending" },
        { id: "class", label: "Document Classification", status: "pending" },
        { id: "valid", label: "Data Validation", status: "pending" },
    ])

    // Confetti effect
    const triggerConfetti = () => {
        const colors = ['#6750A4', '#E8DEF8', '#625B71'];
        // Simple CSS-based confetti or just rely on the visual change for now if no lib
        // For now, we'll use a visual "pop" in the UI
    }

    const simulateProcessing = async () => {
        setStep("processing")

        const steps = [...processingSteps]

        for (let i = 0; i < steps.length; i++) {
            setProcessingSteps(prev => prev.map((s, idx) =>
                idx === i ? { ...s, status: "processing" } : s
            ))

            await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800))

            setProcessingSteps(prev => prev.map((s, idx) =>
                idx === i ? { ...s, status: "complete" } : s
            ))
        }

        await new Promise(resolve => setTimeout(resolve, 800))
        setStep("review")
    }

    const handleUpload = (uploadedFile: File) => {
        setFile(uploadedFile)
        simulateProcessing()
    }

    return (
        <div className="max-w-3xl mx-auto space-y-12">
            {/* Polished Progress Stepper */}
            <div className="relative flex items-center justify-between px-8">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -z-10 -translate-y-1/2" />
                {["Upload", "Processing", "Review", "Complete"].map((label, idx) => {
                    const stepIdx = ["upload", "processing", "review", "complete"].indexOf(step)
                    const isComplete = stepIdx > idx
                    const isCurrent = stepIdx === idx

                    return (
                        <div key={label} className="flex flex-col items-center gap-3 relative z-10 bg-background px-2">
                            <motion.div
                                initial={false}
                                animate={{
                                    scale: isCurrent ? 1.1 : 1,
                                    backgroundColor: isComplete || isCurrent ? "var(--color-primary)" : "#F3F4F6",
                                    color: isComplete || isCurrent ? "#FFFFFF" : "#9CA3AF"
                                }}
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors duration-500",
                                    isCurrent && "ring-4 ring-primary/20"
                                )}
                            >
                                {isComplete ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                            </motion.div>
                            <span className={cn(
                                "text-xs font-bold uppercase tracking-wider transition-colors duration-300",
                                isCurrent ? "text-primary" : "text-gray-400"
                            )}>{label}</span>
                        </div>
                    )
                })}
            </div>

            <AnimatePresence mode="wait">
                {step === "upload" && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden">
                            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-6">
                                <CardTitle className="text-xl font-semibold text-gray-900">Upload Application Packet</CardTitle>
                                <CardDescription className="text-sm text-gray-500">
                                    Supported formats: PDF, JPG, PNG. Max file size: 25MB.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <DocumentUpload onUpload={handleUpload} />
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {step === "processing" && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative"
                    >
                        <Card className="border-none shadow-2xl shadow-primary/10 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                            <CardContent className="p-12 flex flex-col items-center">
                                {/* Scanning Animation */}
                                <div className="relative w-32 h-40 bg-white rounded-xl border border-gray-200 shadow-sm mb-12 overflow-hidden">
                                    <div className="absolute inset-0 p-4 space-y-2 opacity-30">
                                        <div className="w-3/4 h-2 bg-gray-200 rounded" />
                                        <div className="w-full h-2 bg-gray-200 rounded" />
                                        <div className="w-full h-2 bg-gray-200 rounded" />
                                        <div className="w-1/2 h-2 bg-gray-200 rounded" />
                                        <div className="mt-4 w-full h-20 bg-gray-100 rounded" />
                                    </div>

                                    {/* Laser Line */}
                                    <motion.div
                                        className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(103,80,164,0.5)] z-10"
                                        animate={{ top: ["0%", "100%", "0%"] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    />

                                    {/* Scanning Overlay */}
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent"
                                        animate={{ top: ["-100%", "100%"] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    />
                                </div>

                                <h3 className="text-lg font-medium text-gray-900 mb-8 font-mono">PROCESSING_DOCUMENT...</h3>

                                <div className="w-full max-w-md space-y-2">
                                    {processingSteps.map((s) => (
                                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100 shadow-sm transition-all duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                                                    s.status === "complete" ? "bg-green-100 text-green-600" :
                                                        s.status === "processing" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"
                                                )}>
                                                    {s.status === "complete" ? <CheckCircle2 className="w-4 h-4" /> :
                                                        s.status === "processing" ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                                            <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    s.status === "pending" ? "text-gray-400" : "text-gray-700"
                                                )}>{s.label}</span>
                                            </div>
                                            {s.status === "processing" && (
                                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider animate-pulse">Running</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {step === "review" && (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card className="border-none shadow-xl shadow-gray-200/50">
                            <CardHeader className="border-b border-gray-100 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-semibold">Data Verification</CardTitle>
                                        <CardDescription className="text-xs">Confirm extracted entities below.</CardDescription>
                                    </div>
                                    <div className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wide">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Confidence: 98.4%
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-primary/30 transition-all duration-200">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Applicant Name</label>
                                        <div className="font-medium text-base text-gray-900">Acme Corp Inc.</div>
                                    </div>
                                    <div className="group p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-primary/30 transition-all duration-200">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Tax ID (EIN)</label>
                                        <div className="font-medium text-base text-gray-900">12-3456789</div>
                                    </div>
                                    <div className="group p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-primary/30 transition-all duration-200">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Annual Revenue</label>
                                        <div className="font-medium text-base text-gray-900">$1,250,000</div>
                                    </div>
                                    <div className="group p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 transition-all duration-200">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1 block">Missing Field</label>
                                        <div className="font-medium text-base text-amber-900">Incorporation Date</div>
                                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                                            <AlertCircle className="w-3 h-3" /> ACTION REQUIRED
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <Button variant="outline" onClick={() => setStep("upload")}>Cancel</Button>
                                    <Button onClick={() => {
                                        triggerConfetti()
                                        setStep("complete")
                                    }}>
                                        Confirm & Create Application <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {step === "complete" && (
                    <motion.div
                        key="complete"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-16"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                            className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-100"
                        >
                            <CheckCircle2 className="w-12 h-12" />
                        </motion.div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Application Created!</h2>
                        <p className="text-gray-500 mb-10 text-lg max-w-md mx-auto">
                            The document has been processed and a new application for <strong className="text-gray-900">Acme Corp Inc.</strong> has been initialized.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" size="lg" onClick={() => {
                                setStep("upload")
                                setProcessingSteps(prev => prev.map(s => ({ ...s, status: "pending" })))
                            }}>Process Another</Button>
                            <Button size="lg" className="shadow-lg shadow-primary/20">View Application</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
