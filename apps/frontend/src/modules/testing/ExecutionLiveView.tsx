import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Loader2, Play, ChevronRight, MessageSquare, Target, Info, Sparkles, Gavel, Wrench, ChevronDown, Copy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const API_BASE_URL = 'http://localhost:3000/api/v1'

interface ToolExecution {
    toolName: string
    arguments: any
    result: string
    timestamp: string
}

interface StepResult {
    id: string
    stepOrder: number
    userInput: string
    renderedPrompt?: string
    actualResponse: string
    passed: boolean
    score: number
    feedback: string
    toolExecutions?: ToolExecution[]
}

interface Execution {
    id: string
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    model: string
    judgeModel: string
    startedAt: string
    completedAt?: string
    errorMessage?: string
    results: StepResult[]
}

interface ExecutionLiveViewProps {
    executionId: string
    onClose: () => void
    promptName?: string
}

export const ExecutionLiveView: React.FC<ExecutionLiveViewProps> = ({ executionId, onClose, promptName }) => {
    const [isPolling, setIsPolling] = useState(true)
    const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({})
    const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})

    const togglePrompt = (id: string) => {
        setExpandedPrompts(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const toggleTool = (id: string) => {
        setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const { data: execution, isLoading } = useQuery<Execution>({
        queryKey: ['execution', executionId],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/testing/executions/${executionId}`)
            if (!response.ok) throw new Error('Failed to fetch execution')
            const data = await response.json()

            // Parse toolExecutions from JSON string to array
            if (data.results) {
                data.results = data.results.map((result: any) => ({
                    ...result,
                    toolExecutions: result.toolExecutions
                        ? JSON.parse(result.toolExecutions)
                        : undefined
                }))
            }

            return data
        },
        refetchInterval: (query) => {
            const data = query.state.data as Execution | undefined
            if (data?.status === 'COMPLETED' || data?.status === 'FAILED') {
                setIsPolling(false)
                return false
            }
            return 1500 // Poll every 1.5s
        },
        enabled: !!executionId && isPolling
    })

    if (isLoading && !execution) return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-slate-500 font-medium">Initializing execution engine...</p>
        </div>
    )

    const statusColors = {
        PENDING: "bg-slate-100 text-slate-500",
        RUNNING: "bg-blue-100 text-blue-600 animate-pulse",
        COMPLETED: "bg-green-100 text-green-700",
        FAILED: "bg-red-100 text-red-700"
    }

    return (
        <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col gap-4 border-b pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-bold text-slate-900">Live Execution Log</h3>
                        <Badge variant="outline" className={cn("px-2 py-0.5", statusColors[execution?.status || 'PENDING'])}>
                            {execution?.status || 'INITIALIZING'}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">{execution?.id.slice(0, 8)}</span>
                        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
                    </div>
                </div>

                {execution && (
                    <div className="flex flex-wrap gap-3 items-center text-xs">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border rounded-md text-slate-600">
                            <Sparkles size={12} className="text-amber-500" />
                            <span className="font-semibold">Simulator:</span>
                            <span className="font-mono">{execution.model}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border rounded-md text-slate-600">
                            <Gavel size={12} className="text-slate-500" />
                            <span className="font-semibold">Judge:</span>
                            <span className="font-mono">{execution.judgeModel}</span>
                        </div>
                    </div>
                )}
            </div>

            {promptName && execution && (
                <div className="flex flex-col gap-2 border-b pb-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Run in CLI</label>
                    <div className="flex gap-2 items-center">
                        <pre className="flex-1 p-3 bg-slate-50 rounded border text-xs text-slate-700 font-mono whitespace-pre-wrap overflow-x-auto">
                            {`bun run test:cli -- ${promptName} -m ${execution.model} -j ${execution.judgeModel}`}
                        </pre>
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1.5"
                            onClick={() => {
                                const cmd = `bun run test:cli -- ${promptName} -m ${execution.model} -j ${execution.judgeModel}`
                                navigator.clipboard.writeText(cmd).then(() => toast.success("Copied!"))
                            }}
                        >
                            <Copy size={14} /> Copy
                        </Button>
                    </div>
                </div>
            )}

            {execution?.errorMessage && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm flex gap-3">
                    <XCircle size={18} className="shrink-0" />
                    <p><strong>Error:</strong> {execution.errorMessage}</p>
                </div>
            )}

            <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                {execution?.results.sort((a, b) => a.stepOrder - b.stepOrder).map((step, idx) => (
                    <div key={step.id} className="relative pl-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className={cn(
                            "absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center z-10",
                            step.passed ? "bg-green-500 text-white" : "bg-red-500 text-white"
                        )}>
                            {step.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        </div>

                        <Card className="shadow-none border-slate-200 bg-white">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                        <MessageSquare size={14} className="text-slate-400" />
                                        Step {step.stepOrder + 1}
                                    </div>
                                    <Badge className={step.passed ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                                        Score: {step.score}/10
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">User Input</label>
                                        <div className="p-3 bg-slate-50 rounded border italic text-slate-600 text-sm">
                                            "{step.userInput}"
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Judge Feedback</label>
                                        <div className="p-3 bg-blue-50/30 rounded border border-blue-100 text-slate-700 text-sm">
                                            {step.feedback}
                                        </div>
                                    </div>
                                </div>

                                {step.renderedPrompt && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Full Rendered Prompt</label>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-[10px] text-blue-600 hover:text-blue-700"
                                                onClick={() => togglePrompt(step.id)}
                                            >
                                                {expandedPrompts[step.id] ? 'Hide' : 'Show Full Prompt'}
                                            </Button>
                                        </div>
                                        {expandedPrompts[step.id] && (
                                            <pre className="p-3 bg-slate-50 rounded border text-[10px] text-slate-500 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                                                {step.renderedPrompt}
                                            </pre>
                                        )}
                                    </div>
                                )}

                                {step.toolExecutions && step.toolExecutions.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Wrench size={12} className="text-amber-600" />
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tool Executions ({step.toolExecutions.length})</label>
                                        </div>
                                        <div className="space-y-2">
                                            {step.toolExecutions.map((tool, toolIdx) => (
                                                <div key={toolIdx} className="border border-amber-200 rounded-lg bg-amber-50/30 overflow-hidden">
                                                    <div
                                                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-amber-50/50 transition-colors"
                                                        onClick={() => toggleTool(`${step.id}-tool-${toolIdx}`)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Wrench size={14} className="text-amber-600" />
                                                            <span className="font-mono text-sm font-semibold text-amber-900">{tool.toolName}</span>
                                                        </div>
                                                        <ChevronDown
                                                            size={16}
                                                            className={cn(
                                                                "text-amber-600 transition-transform",
                                                                expandedTools[`${step.id}-tool-${toolIdx}`] && "rotate-180"
                                                            )}
                                                        />
                                                    </div>
                                                    {expandedTools[`${step.id}-tool-${toolIdx}`] && (
                                                        <div className="px-3 pb-3 space-y-3 border-t border-amber-200">
                                                            <div className="space-y-1 pt-3">
                                                                <label className="text-[9px] font-bold uppercase tracking-wider text-amber-700 block">Arguments</label>
                                                                <pre className="p-2 bg-white rounded border border-amber-200 text-[11px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                                                                    {JSON.stringify(tool.arguments, null, 2)}
                                                                </pre>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-bold uppercase tracking-wider text-amber-700 block">Result</label>
                                                                <pre className="p-2 bg-white rounded border border-amber-200 text-[11px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                                                                    {tool.result}
                                                                </pre>
                                                            </div>
                                                            <div className="text-[9px] text-amber-600 font-mono">
                                                                {new Date(tool.timestamp).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Agent Response</label>
                                    <pre className="p-4 bg-slate-900 rounded-lg text-xs text-blue-100/90 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto border border-slate-800">
                                        {step.actualResponse}
                                    </pre>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ))}

                {execution?.status === 'RUNNING' && (
                    <div className="relative pl-10">
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-white bg-blue-500 text-white flex items-center justify-center animate-pulse z-10">
                            <Loader2 size={14} className="animate-spin" />
                        </div>
                        <div className="p-4 text-slate-400 text-sm font-medium italic">
                            Agent is thinking...
                        </div>
                    </div>
                )}
            </div>

            {execution?.status === 'COMPLETED' && (
                <div className="p-6 bg-green-50 border border-green-200 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                    <div className="bg-green-500 text-white p-2 rounded-full mb-2">
                        <CheckCircle2 size={24} />
                    </div>
                    <h4 className="text-green-900 font-bold">Execution Completed</h4>
                    <p className="text-green-700 text-sm">All steps have been processed and evaluated by the judge model.</p>
                </div>
            )}
        </div>
    )
}
