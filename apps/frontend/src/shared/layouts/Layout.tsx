import React, { useState, useMemo } from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from "@/lib/utils"
import { Sparkles, Bot, Settings, ChevronLeft, ChevronRight, FileText, BookOpen, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"

const API_BASE_URL = 'http://localhost:3000/api/v1'

interface PromptListItem {
    id: string
    name: string
}

export const Layout: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [filter, setFilter] = useState('')
    const { id: currentPromptId } = useParams<{ id?: string }>()

    const { data: prompts } = useQuery<PromptListItem[]>({
        queryKey: ['prompts'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/prompts`)
            if (!response.ok) throw new Error('Failed to fetch prompts')
            return response.json()
        }
    })

    const filteredPrompts = useMemo(() => {
        if (!prompts) return []
        const sorted = prompts.slice().sort((a, b) => a.name.localeCompare(b.name))
        if (!filter.trim()) return sorted
        return sorted.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
    }, [prompts, filter])

    return (
        <div className="flex h-screen w-full bg-slate-50/50">
            <aside className={cn(
                "border-r bg-white flex flex-col shadow-sm transition-all duration-300 ease-in-out relative",
                isCollapsed ? "w-16" : "w-64"
            )}>
                <div className={cn(
                    "px-4 py-3 border-b transition-all duration-300",
                    isCollapsed && "p-2"
                )}>
                    <h2 className={cn(
                        "flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 transition-all duration-300",
                        isCollapsed && "justify-center"
                    )}>
                        <span className="p-1.5 bg-blue-600 rounded-md text-white shrink-0 flex items-center justify-center">
                            <Sparkles size={18} />
                        </span>
                        {!isCollapsed && "LLMUNIT"}
                    </h2>
                </div>

                <nav className="flex-1 flex flex-col min-h-0 p-4">
                    <NavLink
                        to="/prompts"
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors shrink-0",
                                isActive
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                                isCollapsed && "justify-center px-2"
                            )
                        }
                        title={isCollapsed ? "Prompts" : ""}
                    >
                        <Bot size={18} className="shrink-0" />
                        {!isCollapsed && "Prompts"}
                    </NavLink>

                    {!isCollapsed && (
                        <>
                            <div className="relative mt-2 mb-2">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <Input
                                    type="text"
                                    placeholder="Filter prompts..."
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="pl-9 pr-9 h-9 text-sm"
                                />
                                {filter && (
                                    <button
                                        type="button"
                                        onClick={() => setFilter('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        aria-label="Clear filter"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <ScrollArea className="flex-1 min-h-0 -mx-1">
                                <div className="space-y-0.5 pr-2">
                                    {filteredPrompts.map((prompt) => (
                                    <NavLink
                                        key={prompt.id}
                                        to={`/prompts/${prompt.id}`}
                                        className={({ isActive }) =>
                                            cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors truncate",
                                                "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                                (isActive || currentPromptId === prompt.id)
                                                    ? "bg-slate-100 text-slate-900 font-medium"
                                                    : ""
                                            )
                                        }
                                        title={prompt.name}
                                    >
                                        <FileText size={14} className="shrink-0 text-slate-400" />
                                        <span className="truncate">{prompt.name}</span>
                                    </NavLink>
                                ))}
                                    {filteredPrompts.length === 0 && prompts && prompts.length > 0 && (
                                        <p className="px-3 py-2 text-xs text-slate-400">No matches found</p>
                                    )}
                                    {prompts?.length === 0 && (
                                        <p className="px-3 py-2 text-xs text-slate-400">No prompts yet</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </>
                    )}

                    <NavLink
                        to="/docs/why-llmunit"
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors shrink-0",
                                isActive || window.location.pathname.startsWith('/docs')
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                                isCollapsed && "justify-center px-2"
                            )
                        }
                        title={isCollapsed ? "Documentation" : ""}
                    >
                        <BookOpen size={18} className="shrink-0" />
                        {!isCollapsed && "Documentation"}
                    </NavLink>

                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors shrink-0 mt-2",
                                isActive
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                                isCollapsed && "justify-center px-2"
                            )
                        }
                        title={isCollapsed ? "Settings" : ""}
                    >
                        <Settings size={18} className="shrink-0" />
                        {!isCollapsed && "Settings"}
                    </NavLink>
                </nav>

                {/* Toggle Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(
                        "absolute -right-3 top-6 h-6 w-6 rounded-full border bg-white shadow-md hover:bg-slate-50 p-0 z-10",
                        "flex items-center justify-center"
                    )}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </Button>
            </aside>

            <main className="flex-1 flex flex-col min-h-0 overflow-auto">
                <div className="container mx-auto px-4 pt-1 pb-4 max-w-7xl flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
