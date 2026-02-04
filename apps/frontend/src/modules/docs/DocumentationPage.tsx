import React, { useEffect, useState } from 'react'
import { useParams, NavLink, Navigate } from 'react-router-dom'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { DOCS_CONFIG, findDocById, getPrevNextDoc } from './docs.config'
import { MarkdownRenderer } from './components/MarkdownRenderer'
import { DocNavButtons } from './components/DocNavButtons'
import { DocsNotFound } from './components/DocsNotFound'
import { ChevronRight, FileText, BookOpen } from 'lucide-react'

export const DocumentationPage: React.FC = () => {
    const { docId } = useParams<{ docId?: string }>()
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(true)

    // Default to 'why-llmunit' if no docId is provided
    if (!docId) {
        return <Navigate to="/docs/why-llmunit" replace />
    }

    const currentDoc = findDocById(docId)

    // When docId is unknown, stop loading and we'll show 404
    useEffect(() => {
        if (docId && !currentDoc) {
            setLoading(false)
        }
    }, [docId, currentDoc])

    useEffect(() => {
        if (!currentDoc?.contentPath) return
        setLoading(true)
        fetch(`/docs/${currentDoc.contentPath}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to load doc: ${res.status} ${res.statusText}`)
                }
                return res.text()
            })
            .then(text => {
                setContent(text)
                setLoading(false)
            })
            .catch(err => {
                console.error('Failed to load doc:', err)
                setContent('# Error\nFailed to load documentation.')
                setLoading(false)
            })
    }, [docId, currentDoc])

    return (
        <div className="flex h-[calc(100vh-2rem)] w-full gap-6">
            {/* Docs Sidebar */}
            <aside className="w-64 shrink-0 flex flex-col border rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-slate-50/50">
                    <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                        <BookOpen size={18} className="text-blue-600" />
                        Documentation
                    </h3>
                </div>
                <ScrollArea className="flex-1">
                    <nav className="p-2 space-y-1">
                        {DOCS_CONFIG.map((section) => (
                            <div key={section.id} className="space-y-1">
                                {section.contentPath ? (
                                    <NavLink
                                        to={`/docs/${section.id}`}
                                        className={({ isActive }) =>
                                            cn(
                                                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                                                isActive
                                                    ? "bg-blue-50 text-blue-700 font-medium shadow-sm"
                                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            )
                                        }
                                    >
                                        <FileText size={16} />
                                        {section.title}
                                    </NavLink>
                                ) : (
                                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4 first:mt-0">
                                        {section.title}
                                    </div>
                                )}

                                {section.items && (
                                    <div className="ml-4 space-y-1 border-l pl-2">
                                        {section.items.map((item) => (
                                            <NavLink
                                                key={item.id}
                                                to={`/docs/${item.id}`}
                                                className={({ isActive }) =>
                                                    cn(
                                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                                                        isActive
                                                            ? "bg-blue-50 text-blue-700 font-medium shadow-sm"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                    )
                                                }
                                            >
                                                <ChevronRight size={14} className={cn("transition-transform", docId === item.id && "rotate-90")} />
                                                {item.title}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>
                </ScrollArea>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 h-full">
                    <div className="w-full max-w-4xl mx-auto px-6 py-8 min-w-0 overflow-x-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-10 bg-slate-100 rounded-md w-1/3" />
                                <div className="h-4 bg-slate-100 rounded-md w-full" />
                                <div className="h-4 bg-slate-100 rounded-md w-5/6" />
                                <div className="h-4 bg-slate-100 rounded-md w-full" />
                            </div>
                        ) : !currentDoc ? (
                            <DocsNotFound docId={docId} />
                        ) : (
                            <>
                                <MarkdownRenderer content={content} />
                                <DocNavButtons {...getPrevNextDoc(docId)} />
                            </>
                        )}
                    </div>
                </ScrollArea>
            </main>
        </div>
    )
}
