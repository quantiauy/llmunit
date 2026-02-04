import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Prompt } from '@llmunit/shared'
import { Plus, Eye, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const API_BASE_URL = 'http://localhost:3000/api/v1'

export const PromptsPage: React.FC = () => {
    const navigate = useNavigate()
    const [isNewPromptOpen, setIsNewPromptOpen] = useState(false)
    const [newPromptName, setNewPromptName] = useState('')
    const queryClient = useQueryClient()

    const { data: prompts, isLoading, error } = useQuery<Prompt[]>({
        queryKey: ['prompts'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/prompts`)
            if (!response.ok) throw new Error('Network response was not ok')
            return response.json()
        }
    })

    const createPromptMutation = useMutation({
        mutationFn: async (name: string) => {
            const response = await fetch(`${API_BASE_URL}/prompts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, content: '', description: '' })
            })
            if (!response.ok) throw new Error('Failed to create prompt')
            return response.json()
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] })
            setIsNewPromptOpen(false)
            setNewPromptName('')
            navigate(`/prompts/${data.id}`)
        }
    })

    const handleCreatePrompt = () => {
        if (!newPromptName.trim()) return
        createPromptMutation.mutate(newPromptName)
    }

    if (isLoading) return <div className="flex items-center justify-center min-h-[400px]">Loading prompts...</div>
    if (error) return <div className="p-4 text-red-500 bg-red-50 rounded-md border border-red-100">Error: {(error as Error).message}</div>

    return (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
            <header className="flex justify-between items-center py-2.5 px-4 border-b bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Prompts</h1>
                    <p className="text-sm text-slate-500">Manage and test your AI instruction templates.</p>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => setIsNewPromptOpen(true)}>
                    <Plus size={14} />
                    New Prompt
                </Button>
            </header>

            <Card className="border-slate-200/60 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="w-[300px] py-4">Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {prompts?.map((prompt) => (
                                <TableRow
                                    key={prompt.id}
                                    className="cursor-pointer hover:bg-slate-50/50 transition-colors group"
                                    onClick={() => navigate(`/prompts/${prompt.id}`)}
                                >
                                    <TableCell className="font-semibold text-slate-700">
                                        {prompt.name}
                                    </TableCell>
                                    <TableCell className="text-slate-500 max-w-md truncate">
                                        {prompt.description || 'Global tech support agent configuration.'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link to={`/prompts/${prompt.id}`} className="gap-2">
                                                <Eye size={14} />
                                                Details
                                                <ChevronRight size={14} />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {prompts?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-48 text-center text-slate-400">
                                        No prompts found. Click "New Prompt" to start.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Dialog open={isNewPromptOpen} onOpenChange={setIsNewPromptOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create New Prompt</DialogTitle>
                        <DialogDescription>
                            Enter a name for your new prompt workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={newPromptName}
                                onChange={(e) => setNewPromptName(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g., Code Assistant"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreatePrompt()
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewPromptOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreatePrompt} disabled={createPromptMutation.isPending}>
                            {createPromptMutation.isPending ? 'Creating...' : 'Create Prompt'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
