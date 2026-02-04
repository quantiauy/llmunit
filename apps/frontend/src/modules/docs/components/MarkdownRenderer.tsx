import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
    content: string
    className?: string
}

function getTextFromNode(node: unknown): string {
    if (!node || typeof node !== 'object') return ''
    const n = node as { type?: string; value?: string; children?: unknown[] }
    if (n.type === 'text' && typeof n.value === 'string') return n.value
    if (Array.isArray(n.children)) return n.children.map(getTextFromNode).join('')
    return ''
}

function PreWithCopy({
    node,
    children,
    className,
    ...props
}: React.ComponentPropsWithoutRef<'pre'> & { node?: unknown }) {
    const [copied, setCopied] = useState(false)
    const text = getTextFromNode(node)
    const canCopy =
        typeof navigator !== 'undefined' &&
        !!navigator.clipboard?.writeText

    const handleCopy = async () => {
        if (!text || !canCopy) return
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="relative group w-full min-w-0 max-w-full rounded-lg border border-slate-700/50 bg-slate-800 my-4 overflow-hidden">
            {canCopy && (
                <button
                    type="button"
                    aria-label={copied ? 'Copied' : 'Copy to clipboard'}
                    className={cn(
                        'absolute top-2 right-2 p-2 rounded-md z-10',
                        'bg-slate-700/80 text-slate-200 hover:bg-slate-600 hover:text-white',
                        'transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800'
                    )}
                    onClick={handleCopy}
                >
                    {copied ? (
                        <Check size={16} className="text-emerald-400" />
                    ) : (
                        <Copy size={16} />
                    )}
                </button>
            )}
            <pre
                className={cn(className, 'w-full min-w-0 max-w-full !my-0 !rounded-none !border-0 !bg-transparent !p-4 whitespace-pre-wrap break-words')}
                style={{ overflowWrap: 'anywhere' }}
                {...props}
            >
                {children}
            </pre>
        </div>
    )
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
    return (
        <div className={cn(
            "prose prose-slate w-full min-w-0 max-w-full overflow-x-hidden",
            "prose-headings:font-bold prose-h1:text-2xl prose-h1:mt-0 prose-h1:mb-4 prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2",
            "prose-p:my-3 prose-p:leading-snug prose-p:break-words prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5 prose-li:break-words",
            "prose-pre:max-w-full prose-pre:text-slate-50",
            "prose-pre:[&>code]:text-inherit prose-pre:[&>code]:bg-transparent prose-pre:[&>code]:px-0 prose-pre:[&>code]:rounded-none prose-pre:[&>code]:block prose-pre:[&>code]:whitespace-pre-wrap prose-pre:[&>code]:break-words",
            "prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded",
            "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline",
            "prose-li:marker:text-blue-500",
            "prose-hr:my-6",
            className
        )}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ pre: PreWithCopy }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}
