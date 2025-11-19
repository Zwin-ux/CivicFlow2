"use client"

import DemoLayout from "@/components/layout/DemoLayout"
import { IntakeFlow } from "@/components/demo/IntakeFlow"

export default function IntakePage() {
    return (
        <DemoLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Intake Pipeline</h1>
                <p className="text-gray-500 mt-2">
                    Upload documents to automatically extract data and initialize applications.
                </p>
            </div>
            <IntakeFlow />
        </DemoLayout>
    )
}
