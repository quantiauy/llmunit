import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DocNavLink } from '../docs.config'
import { cn } from '@/lib/utils'

interface DocNavButtonsProps {
    prev?: DocNavLink
    next?: DocNavLink
    className?: string
}

export const DocNavButtons: React.FC<DocNavButtonsProps> = ({ prev, next, className }) => {
    if (!prev && !next) return null

    return (
        <nav
            className={cn(
                'mt-12 pt-8 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4',
                className
            )}
            aria-label="Documentation navigation"
        >
            <div>
                {prev ? (
                    <Link
                        to={`/docs/${prev.id}`}
                        className={cn(
                            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                            'text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors'
                        )}
                    >
                        <ChevronLeft size={18} />
                        {prev.title}
                    </Link>
                ) : null}
            </div>
            <div>
                {next ? (
                    <Link
                        to={`/docs/${next.id}`}
                        className={cn(
                            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                            'text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors'
                        )}
                    >
                        {next.title}
                        <ChevronRight size={18} />
                    </Link>
                ) : null}
            </div>
        </nav>
    )
}
