"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { UploadCloud, File as FileIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

interface DocumentUploadProps {
    onUpload: (file: File) => void
}

export function DocumentUpload({ onUpload }: DocumentUploadProps) {
    const [isDragging, setIsDragging] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) {
            onUpload(file)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onUpload(file)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={cn(
                "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer group overflow-hidden",
                isDragging
                    ? "border-primary bg-primary/5 scale-[1.02] shadow-xl shadow-primary/10"
                    : "border-gray-200 hover:border-primary/50 hover:bg-gray-50/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            {/* Breathing Background Effect */}
            {isDragging && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.png"
            />

            <div className="relative z-10 flex flex-col items-center gap-6">
                <div className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm",
                    isDragging
                        ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110"
                        : "bg-white text-gray-400 group-hover:text-primary group-hover:scale-110 group-hover:shadow-md"
                )}>
                    <UploadCloud className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary transition-colors">
                        Upload your documents
                    </h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto">
                        Drag and drop your loan application, tax returns, or financial statements here
                    </p>
                </div>
                <div className="flex gap-2">
                    {["PDF", "DOCX", "JPG"].map((ext) => (
                        <span key={ext} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 border border-gray-200 group-hover:border-primary/20 group-hover:text-primary/70 transition-colors">
                            {ext}
                        </span>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
