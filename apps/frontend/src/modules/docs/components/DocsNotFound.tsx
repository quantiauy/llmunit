import React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Home, FileQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocsNotFoundProps {
    docId?: string
    className?: string
}

export const DocsNotFound: React.FC<DocsNotFoundProps> = ({ docId, className }) => {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center min-h-[60vh] px-6 py-12 text-center',
                className
            )}
        >
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 text-amber-600 mb-6">
                <FileQuestion size={40} strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
                This page went off-prompt.
            </h1>
            <p className="text-slate-600 max-w-md mb-1">
                The doc you're looking for doesn't exist (or the model hallucinated the URL).
            </p>
            {docId && (
                <p className="text-sm text-slate-400 font-mono mb-8">
                    <code>/docs/{docId}</code>
                </p>
            )}
            {!docId && <div className="mb-8" />}
            <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                    to="/docs/why-llmunit"
                    className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                        'bg-blue-600 text-white hover:bg-blue-700 transition-colors'
                    )}
                >
                    <BookOpen size={18} />
                    Start at Why LLMUnit
                </Link>
                <Link
                    to="/prompts"
                    className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                        'bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors'
                    )}
                >
                    <Home size={18} />
                    Back to Prompts
                </Link>
            </div>
        </div>
    )
}
