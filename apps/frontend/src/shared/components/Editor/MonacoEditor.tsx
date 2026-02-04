import React from 'react'
import Editor from '@monaco-editor/react'

const EDITOR_TYPOGRAPHY = {
    fontSize: 12,
    lineHeight: 20,
    padding: { top: 6, bottom: 12 },
    contentPaddingLeft: 8
} as const

interface MonacoEditorProps {
    value: string
    language: 'markdown' | 'json' | 'typescript'
    onChange?: (value: string | undefined) => void
    readOnly?: boolean
    height?: string
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
    value,
    language,
    onChange,
    readOnly = false,
    height = '600px'
}) => {
    return (
        <div className="llmunit-monaco-editor h-full w-full overflow-hidden">
            <style>{`
                .llmunit-monaco-editor .monaco-editor .margin {
                    background-color: rgb(241, 245, 249);
                }
                .llmunit-monaco-editor .monaco-editor .margin-view-overlays {
                    text-align: left;
                    padding-left: 4px;
                }
                .llmunit-monaco-editor .monaco-editor .lines-content.monaco-editor-background {
                    padding-left: ${EDITOR_TYPOGRAPHY.contentPaddingLeft}px;
                }
            `}</style>
            <Editor
                height={height}
                language={language}
                value={value}
                theme="vs-light"
                options={{
                    minimap: { enabled: false },
                    fontSize: EDITOR_TYPOGRAPHY.fontSize,
                    lineHeight: EDITOR_TYPOGRAPHY.lineHeight,
                    readOnly,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: 'on',
                    wrappingIndent: 'indent',
                    padding: EDITOR_TYPOGRAPHY.padding,
                    renderLineHighlight: 'line',
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    lineNumbersMinChars: 4,
                    glyphMargin: false,
                    lineDecorationsWidth: 10,
                    folding: false
                }}
                onChange={onChange}
            />
        </div>
    )
}
