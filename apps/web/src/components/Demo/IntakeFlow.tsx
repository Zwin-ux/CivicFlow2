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
        { id: "virus", label: "Virus Scan", status: "pending" },
        { id: "ocr", label: "OCR Extraction", status: "pending" },
        { id: "class", label: "Document Classification", status: "pending" },
        { id: "valid", label: "Data Validation", status: "pending" },
    ])

    const simulateProcessing = async () => {
        setStep("processing")

        const steps = [...processingSteps]

        for (let i = 0; i < steps.length; i++) {
            // Set current to processing
            setProcessingSteps(prev => prev.map((s, idx) =>
                idx === i ? { ...s, status: "processing" } : s
            ))

            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000))

            // Set current to complete
            setProcessingSteps(prev => prev.map((s, idx) =>
                idx === i ? { ...s, status: "complete" } : s
            ))
        }

        await new Promise(resolve => setTimeout(resolve, 500))
        setStep("review")
    }

    const handleUpload = (uploadedFile: File) => {
        setFile(uploadedFile)
        simulateProcessing()
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Progress Stepper */}
            <div className="flex items-center justify-between px-8">
                {["Upload", "Processing", "Review", "Complete"].map((label, idx) => {
                    const stepIdx = ["upload", "processing", "review", "complete"].indexOf(step)
                    const isComplete = stepIdx > idx
                    const isCurrent = stepIdx === idx

                    return (
                        <div key={label} className="flex flex-col items-center gap-2 relative z-10">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-500",
                                isComplete ? "bg-green-500 text-white" :
                                    isCurrent ? "bg-violet-600 text-white ring-4 ring-violet-100" :
                                        "bg-gray-200 text-gray-500"
                            )}>
                                {isComplete ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                            </div>
                            <span className={cn(
                                "text-xs font-medium transition-colors duration-300",
                                isCurrent ? "text-violet-700" : "text-gray-500"
                            )}>{label}</span>
                        </div>
                    )
                })}
                {/* Progress Bar Background */}
                <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200 -z-0 hidden" />
            </div>

            <AnimatePresence mode="wait">
                {step === "upload" && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>New Application Intake</CardTitle>
                                <CardDescription>Upload a loan application form, tax return, or financial statement.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DocumentUpload onUpload={handleUpload} />
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {step === "processing" && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Analyzing Document</CardTitle>
                                <CardDescription>Our AI is extracting and validating data from {file?.name}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {processingSteps.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            {s.status === "pending" && <div className="w-2 h-2 rounded-full bg-gray-300" />}
                                            {s.status === "processing" && <Loader2 className="w-4 h-4 animate-spin text-violet-600" />}
                                            {s.status === "complete" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                            <span className={cn(
                                                "text-sm font-medium",
                                                s.status === "pending" ? "text-gray-400" : "text-gray-700"
                                            )}>{s.label}</span>
                                        </div>
                                        {s.status === "processing" && <span className="text-xs text-violet-600 animate-pulse">Processing...</span>}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {step === "review" && (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Extraction Results</CardTitle>
                                <CardDescription>Please review the extracted data before proceeding.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg border border-gray-200 space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Applicant Name</label>
                                        <div className="font-medium text-gray-900">Acme Corp Inc.</div>
                                        <div className="inline-flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                            <CheckCircle2 className="w-3 h-3" /> 98% Confidence
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg border border-gray-200 space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Tax ID (EIN)</label>
                                        <div className="font-medium text-gray-900">12-3456789</div>
                                        <div className="inline-flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                            <CheckCircle2 className="w-3 h-3" /> 99% Confidence
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg border border-gray-200 space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Annual Revenue</label>
                                        <div className="font-medium text-gray-900">$1,250,000</div>
                                        <div className="inline-flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                            <CheckCircle2 className="w-3 h-3" /> 95% Confidence
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 space-y-1">
                                        <label className="text-xs font-medium text-amber-700">Missing Field</label>
                                        <div className="font-medium text-amber-900">Incorporation Date</div>
                                        <div className="inline-flex items-center gap-1 text-[10px] text-amber-700">
                                            <AlertCircle className="w-3 h-3" /> Action Required
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <Button variant="outline" onClick={() => setStep("upload")}>Cancel</Button>
                                    <Button onClick={() => setStep("complete")}>
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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-12"
                    >
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Created!</h2>
                        <p className="text-gray-500 mb-8">
                            The document has been processed and a new application for <strong>Acme Corp Inc.</strong> has been initialized.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={() => {
                                setStep("upload")
                                setProcessingSteps(prev => prev.map(s => ({ ...s, status: "pending" })))
                            }}>Process Another</Button>
                            <Button>View Application</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
