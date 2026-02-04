import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MonacoEditor } from '../../shared/components/Editor/MonacoEditor'
import { ExecutionLiveView } from '../testing/ExecutionLiveView'
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Save, Terminal, FileJson, FileText, Play, History, Clock, CheckCircle2, XCircle, RefreshCcw, AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RunTestModal } from '../testing/RunTestModal'

const API_BASE_URL = 'http://localhost:3000/api/v1'

export const PromptDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    // State for temporary edits
    const [promptContent, setPromptContent] = useState<string>('')
    const [testsJson, setTestsJson] = useState<string>('')
    const [mocksTs, setMocksTs] = useState<string>('')

    // Test execution state
    const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null)
    const [isLogOpen, setIsLogOpen] = useState(false)
    const [isRunModalOpen, setIsRunModalOpen] = useState(false)
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('prompt')

    const { data: prompt, isLoading, error } = useQuery({
        queryKey: ['prompt', id],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/prompts/${id}`)
            if (!response.ok) throw new Error('Failed to fetch prompt details')
            const data = await response.json()

            setPromptContent(data.content || '')

            const simplifiedTests = data.testCases?.map((tc: any) => ({
                id: tc.id,
                name: tc.name,
                initialContext: tc.initialContext ? JSON.parse(tc.initialContext) : {},
                memory: tc.memory ? JSON.parse(tc.memory) : [],
                steps: tc.steps?.map((s: any) => ({
                    userInput: s.userInput || s.message,
                    expectedBehavior: s.expectedBehavior,
                    input: s.input ? JSON.parse(s.input) : {}
                }))
            })) || []
            setTestsJson(JSON.stringify(simplifiedTests, null, 2))

            const defaultMock = data.testCases?.[0]?.mocks?.[0]?.code || '// No mocks found'
            setMocksTs(defaultMock)

            return data
        }
    })

    const { data: history } = useQuery({
        queryKey: ['history', id],
        queryFn: async () => {
            if (!prompt?.testCases?.[0]?.id) return []
            const response = await fetch(`${API_BASE_URL}/testing/history/${prompt.testCases[0].id}`)
            if (!response.ok) throw new Error('Failed to fetch history')
            return response.json()
        },
        enabled: !!prompt?.testCases?.[0]?.id
    })

    const updateMutation = useMutation({
        mutationFn: async (updatedData: any) => {
            const response = await fetch(`${API_BASE_URL}/prompts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            })
            if (!response.ok) throw new Error('Failed to update prompt')
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompt', id] })
            toast.success("Prompt saved successfully!")
        },
        onError: (err: Error) => {
            toast.error("Failed to save: " + err.message)
        }
    })
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(`${API_BASE_URL}/prompts/${id}`, {
                method: 'DELETE',
            })
            if (!response.ok) throw new Error('Failed to delete prompt')
        },
        onSuccess: () => {
            toast.success("Prompt deleted successfully!")
            navigate('/prompts')
        },
        onError: (err: Error) => {
            toast.error("Failed to delete: " + err.message)
            setIsDeleteAlertOpen(false)
        }
    })

    const runTestMutation = useMutation({
        mutationFn: async (config: { model: string; judgeModel: string }) => {
            if (!prompt?.testCases?.[0]?.id) throw new Error('No test cases found')
            const response = await fetch(`${API_BASE_URL}/testing/${prompt.testCases[0].id}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            if (!response.ok) throw new Error('Failed to trigger test')
            return response.json()
        },
        onSuccess: (data) => {
            setActiveExecutionId(data.executionId)
            setIsLogOpen(true)
            setIsRunModalOpen(false)
            toast.info("Execution started", { description: "Logs are streaming in the window." })
            queryClient.invalidateQueries({ queryKey: ['history', id] })
        },
        onError: (err: Error) => {
            toast.error("Execution failed: " + err.message)
        }
    })

    const refreshExecutionHistory = () => {
        queryClient.invalidateQueries({ queryKey: ['history', id] })
    }

    const handleCloseLog = () => {
        setIsLogOpen(false)
        refreshExecutionHistory()
    }

    if (isLoading) return <div className="flex items-center justify-center min-h-[400px]">Loading details...</div>
    if (error) return <div className="p-4 text-red-500">Error: {(error as Error).message}</div>

    const tabLabels: Record<string, string> = {
        prompt: 'Prompt Template',
        tests: 'Test Cases',
        mocks: 'Tool Mocks',
        history: 'Execution History'
    }

    const editorTabWrapperClass = 'flex-1 min-h-[300px] h-full'

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <div className="py-2.5 px-0 border-b bg-slate-50/50 shrink-0">
                <Breadcrumb>
                    <BreadcrumbList className="text-sm">
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/prompts">Prompts</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href={`/prompts/${id}`}>{prompt?.name}</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="font-medium text-slate-700">{tabLabels[activeTab]}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <Card className="mt-2 border-slate-200/60 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                <CardContent className="p-0 flex flex-col flex-1 min-h-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 w-full">
                        <div className="pl-0 pr-3 py-0 bg-slate-100/80 border-b border-slate-200 flex items-stretch justify-between shrink-0 min-h-[36px]">
                            <TabsList className="flex bg-transparent gap-0 h-full min-h-[36px] p-0 border-b-0 items-stretch">
                                <TabsTrigger value="prompt" className="tabs-trigger-ide"><FileText size={14} /> Prompt Template</TabsTrigger>
                                <TabsTrigger value="tests" className="tabs-trigger-ide"><FileJson size={14} /> Test Cases</TabsTrigger>
                                <TabsTrigger value="mocks" className="tabs-trigger-ide"><Terminal size={14} /> Tool Mocks</TabsTrigger>
                                <TabsTrigger value="history" className="tabs-trigger-ide"><History size={14} /> Execution History</TabsTrigger>
                            </TabsList>

                            <div className="flex gap-1.5 pb-1.5">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setIsRunModalOpen(true)}
                                    disabled={runTestMutation.isPending || !prompt?.testCases?.length}
                                    className="shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50 h-7 w-7"
                                    title="Run Test"
                                >
                                    <Play size={14} />
                                </Button>
                                <Button
                                    size="icon"
                                    onClick={() => {
                                        const testCases = JSON.parse(testsJson)
                                        if (testCases.length > 0) {
                                            testCases[0].mocks = [{ name: 'default', code: mocksTs }]
                                        }
                                        updateMutation.mutate({ content: promptContent, testCases })
                                    }}
                                    disabled={updateMutation.isPending}
                                    className="shadow-md bg-blue-600 hover:bg-blue-700 h-7 w-7"
                                    title="Save Changes"
                                >
                                    <Save size={14} />
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => setIsDeleteAlertOpen(true)}
                                    className="shadow-md h-7 w-7"
                                    title="Delete Prompt"
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col overflow-auto">
                            <TabsContent value="prompt" className="animate-fade-in flex-1 min-h-0 flex flex-col mt-0 outline-none data-[state=inactive]:hidden">
                                <div className={editorTabWrapperClass}>
                                    <MonacoEditor value={promptContent} language="markdown" onChange={(val) => setPromptContent(val || '')} height="100%" />
                                </div>
                            </TabsContent>

                            <TabsContent value="tests" className="animate-fade-in flex-1 min-h-0 flex flex-col mt-0 outline-none data-[state=inactive]:hidden">
                                <div className={editorTabWrapperClass}>
                                    <MonacoEditor value={testsJson} language="json" onChange={(val) => setTestsJson(val || '')} height="100%" />
                                </div>
                            </TabsContent>

                            <TabsContent value="mocks" className="animate-fade-in flex-1 min-h-0 flex flex-col mt-0 outline-none data-[state=inactive]:hidden">
                                <div className={editorTabWrapperClass}>
                                    <MonacoEditor value={mocksTs} language="typescript" onChange={(val) => setMocksTs(val || '')} height="100%" />
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="animate-fade-in flex-1 min-h-0 flex flex-col mt-0 outline-none space-y-4 data-[state=inactive]:hidden px-4">
                                <div className="flex justify-between items-center mb-2 shrink-0 pt-4">
                                    <h3 className="text-sm font-semibold text-slate-700">Recent Executions</h3>
                                    <Button
                                        variant="outline"
                                        size="xs"
                                        className="h-7 gap-1.5 text-xs text-slate-500 hover:text-blue-600 border-slate-200"
                                        onClick={refreshExecutionHistory}
                                    >
                                        <RefreshCcw size={12} className={cn(isLoading && "animate-spin")} />
                                        Refresh
                                    </Button>
                                </div>
                                <ScrollArea className="flex-1 min-h-0 pr-4">
                                    <div className="space-y-3">
                                        {history?.map((exec: any) => {
                                            const totalSteps = exec.results?.length || 0;
                                            const passedSteps = exec.results?.filter((r: any) => r.passed).length || 0;
                                            const isSuccess = exec.status === 'COMPLETED' && totalSteps > 0 && passedSteps === totalSteps;
                                            const isPartial = exec.status === 'COMPLETED' && passedSteps > 0 && passedSteps < totalSteps;
                                            const isFailure = exec.status === 'FAILED' || (exec.status === 'COMPLETED' && passedSteps === 0);

                                            return (
                                                <div key={exec.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "p-2 rounded-full",
                                                            isSuccess && "bg-green-100 text-green-600",
                                                            isPartial && "bg-amber-100 text-amber-600",
                                                            isFailure && "bg-red-100 text-red-600",
                                                            !isSuccess && !isPartial && !isFailure && "bg-slate-100 text-slate-600"
                                                        )}>
                                                            {isSuccess && <CheckCircle2 size={18} />}
                                                            {isPartial && <AlertCircle size={18} />}
                                                            {isFailure && <XCircle size={18} />}
                                                            {!isSuccess && !isPartial && !isFailure && <Clock size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 flex items-center gap-2">
                                                                Execution {exec.id.slice(0, 8)}
                                                                <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 font-mono">
                                                                    <span className="font-bold text-slate-400">MOD:</span> {exec.model}
                                                                    <span className="text-slate-300 mx-0.5">|</span>
                                                                    <span className="font-bold text-slate-400">JDG:</span> {exec.judgeModel}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                                                <Clock size={12} /> {new Date(exec.startedAt).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <div className={cn(
                                                                "text-sm font-bold",
                                                                isSuccess ? "text-green-700" : isPartial ? "text-amber-700" : "text-red-700"
                                                            )}>
                                                                {passedSteps}/{totalSteps} Passed
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Steps</div>
                                                        </div>
                                                        <Button variant="ghost" size="sm" onClick={() => { setActiveExecutionId(exec.id); setIsLogOpen(true); }}>
                                                            View Logs
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {!history?.length && <div className="text-center py-20 text-slate-400">No executions found yet. Run your first test!</div>}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isLogOpen} onOpenChange={(open) => { setIsLogOpen(open); if (!open) refreshExecutionHistory(); }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Test Execution Logs</DialogTitle>
                        <DialogDescription>Real-time evaluation and agent step tracer.</DialogDescription>
                    </DialogHeader>
                    {activeExecutionId && (
                        <ExecutionLiveView executionId={activeExecutionId} onClose={handleCloseLog} promptName={prompt?.name ?? undefined} />
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the prompt
                            <span className="font-bold text-slate-900"> {prompt?.name} </span>
                            and remove all associated files from the filesystem.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                deleteMutation.mutate()
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Prompt'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <RunTestModal
                open={isRunModalOpen}
                onOpenChange={setIsRunModalOpen}
                onConfirm={(config) => runTestMutation.mutate(config)}
                isPending={runTestMutation.isPending}
            />

            <style>{`
              .tabs-trigger-ide {
                @apply h-full min-h-[36px] rounded-none border-0 border-b-0 border-r border-slate-200 bg-slate-200/60 text-slate-600 gap-1.5 px-3 text-xs font-medium;
                @apply first:rounded-tl-md last:rounded-tr-md last:border-r-0;
                @apply ml-[-1px] first:ml-0;
                @apply hover:bg-slate-200/80 hover:text-slate-800;
                @apply data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:border-slate-200 data-[state=active]:border-b-2 data-[state=active]:border-b-white data-[state=active]:shadow-none data-[state=active]:relative data-[state=active]:z-10 data-[state=active]:mb-[-1px];
              }
              .animate-fade-in {
                @apply m-0 space-y-4 outline-none animate-in fade-in-50 duration-300;
              }
            `}</style>
        </div>
    )
}
