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
            className={cn(
                "relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
                isDragging
                    ? "border-violet-500 bg-violet-50"
                    : "border-gray-200 hover:border-violet-400 hover:bg-gray-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.png"
            />

            <div className="flex flex-col items-center gap-4">
                <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                    isDragging ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-500"
                )}>
                    <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        Upload your documents
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Drag and drop or click to browse
                    </p>
                </div>
                <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600">PDF</span>
                    <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600">DOCX</span>
                    <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600">JPG</span>
                </div>
            </div>
        </motion.div>
    )
}
