import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './shared/layouts/Layout'
import { PromptsPage } from './modules/prompts/PromptsPage'
import { PromptDetailsPage } from './modules/prompts/PromptDetailsPage'

import { SettingsPage } from './modules/settings/SettingsPage'
import { DocumentationPage } from './modules/docs/DocumentationPage'
import { Toaster } from './components/ui/sonner'
import './index.css'

const queryClient = new QueryClient()

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Navigate to="/prompts" replace />} />
                        <Route path="/prompts" element={<PromptsPage />} />
                        <Route path="/prompts/:id" element={<PromptDetailsPage />} />

                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/docs" element={<DocumentationPage />} />
                        <Route path="/docs/:docId" element={<DocumentationPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
            <Toaster position="top-right" richColors />
        </QueryClientProvider>
    )
}

export default App
