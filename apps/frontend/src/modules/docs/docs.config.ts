export interface DocSection {
    id: string
    title: string
    contentPath: string
    items?: DocSection[]
}

export const DOCS_CONFIG: DocSection[] = [
    {
        id: 'why-llmunit',
        title: 'Why LLMUnit',
        contentPath: 'WhyLLMUnit.md'
    },
    {
        id: 'setup',
        title: 'Setup',
        contentPath: 'Setup.md'
    },
    {
        id: 'installation',
        title: 'Installation',
        contentPath: 'Installation.md'
    },
    {
        id: 'blocks',
        title: 'Blocks',
        contentPath: '',
        items: [
            {
                id: 'prompt',
                title: 'Prompt',
                contentPath: 'blocks/Prompt.md'
            },
            {
                id: 'test-case',
                title: 'Test Case',
                contentPath: 'blocks/TestCase.md'
            },
            {
                id: 'tool-mocks',
                title: 'Tool Mocks',
                contentPath: 'blocks/ToolMocks.md'
            },
            {
                id: 'execution-history',
                title: 'Execution History',
                contentPath: 'blocks/ExecutionHistory.md'
            },
            {
                id: 'cli',
                title: 'CLI',
                contentPath: 'blocks/Cli.md'
            }
        ]
    }
]

export const findDocById = (id: string, sections: DocSection[] = DOCS_CONFIG): DocSection | undefined => {
    for (const section of sections) {
        if (section.id === id) return section
        if (section.items) {
            const found = findDocById(id, section.items)
            if (found) return found
        }
    }
    return undefined
}

function getOrderedDocIds(sections: DocSection[] = DOCS_CONFIG): string[] {
    const ids: string[] = []
    for (const section of sections) {
        if (section.contentPath) ids.push(section.id)
        if (section.items) {
            for (const item of section.items) ids.push(item.id)
        }
    }
    return ids
}

export interface DocNavLink {
    id: string
    title: string
}

export const getPrevNextDoc = (
    currentId: string,
    sections: DocSection[] = DOCS_CONFIG
): { prev?: DocNavLink; next?: DocNavLink } => {
    const ordered = getOrderedDocIds(sections)
    const index = ordered.indexOf(currentId)
    if (index === -1) return {}
    const prevId = index > 0 ? ordered[index - 1] : undefined
    const nextId = index < ordered.length - 1 ? ordered[index + 1] : undefined
    const prev = prevId ? findDocById(prevId, sections) : undefined
    const next = nextId ? findDocById(nextId, sections) : undefined
    return {
        prev: prev ? { id: prev.id, title: prev.title } : undefined,
        next: next ? { id: next.id, title: next.title } : undefined
    }
}
