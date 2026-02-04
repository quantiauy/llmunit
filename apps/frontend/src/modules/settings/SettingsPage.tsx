import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Settings, Save, ShieldCheck, Key, Cpu, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_BASE_URL = 'http://localhost:3000/api/v1';

export const SettingsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [keyInput, setKeyInput] = useState('');

    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const resp = await fetch(`${API_BASE_URL}/settings`);
            if (!resp.ok) throw new Error('Failed to load settings');
            return resp.json();
        }
    });

    const mutation = useMutation({
        mutationFn: async (newSettings: any) => {
            const resp = await fetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
            if (!resp.ok) throw new Error('Failed to update settings');
            return resp.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            toast.success('Settings updated successfully!', {
                description: 'Environment variables have been synchronized.'
            });
            setKeyInput('');
        },
        onError: (err: Error) => {
            toast.error('Update failed', { description: err.message });
        }
    });

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const updates: any = {
            DEFAULT_MODEL: formData.get('DEFAULT_MODEL'),
            DEFAULT_JUDGE_MODEL: formData.get('DEFAULT_JUDGE_MODEL'),
        };

        if (keyInput) {
            updates.OPENROUTER_API_KEY = keyInput;
        }

        mutation.mutate(updates);
    };

    if (isLoading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="flex flex-col flex-1 min-h-0 space-y-4 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center gap-3 py-2.5 px-4 border-b bg-slate-50/50 shrink-0">
                <Settings size={18} className="text-slate-500 shrink-0" />
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Settings</h1>
                <p className="text-sm text-slate-500">Manage your global environment variables and AI model configurations.</p>
            </header>

            <form onSubmit={handleSave} className="space-y-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Cpu className="text-slate-400" size={18} />
                            <CardTitle>Model Defaults</CardTitle>
                        </div>
                        <CardDescription>Configure which models are used for testing and evaluation.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="DEFAULT_MODEL">Target Simulation Model</Label>
                            <Input
                                id="DEFAULT_MODEL"
                                name="DEFAULT_MODEL"
                                defaultValue={settings?.DEFAULT_MODEL}
                                placeholder="e.g. openai/gpt-oss-safeguard-20b"
                            />
                            <p className="text-[11px] text-slate-400">The primary model used to simulate agent responses.</p>
                        </div>
                        <div className="grid gap-2 pt-2">
                            <Label htmlFor="DEFAULT_JUDGE_MODEL">Model Judge / Evaluator</Label>
                            <Input
                                id="DEFAULT_JUDGE_MODEL"
                                name="DEFAULT_JUDGE_MODEL"
                                defaultValue={settings?.DEFAULT_JUDGE_MODEL}
                                placeholder="e.g. openai/gpt-oss-safeguard-20b"
                            />
                            <p className="text-[11px] text-slate-400">The model responsible for scoring and providing feedback on results.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Key className="text-slate-400" size={18} />
                            <CardTitle>Authentication</CardTitle>
                        </div>
                        <CardDescription>OpenRouter API configuration for LLM access.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="OPENROUTER_API_KEY">OpenRouter API Key</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="OPENROUTER_API_KEY"
                                    type="password"
                                    value={keyInput || settings?.OPENROUTER_API_KEY}
                                    onChange={(e) => setKeyInput(e.target.value)}
                                    placeholder={settings?.IS_KEY_SET ? "••••••••••••••••" : "Paste your sk-or-... key here"}
                                    className={keyInput ? "border-blue-300 ring-1 ring-blue-100" : ""}
                                />
                                {settings?.IS_KEY_SET && !keyInput && (
                                    <div className="flex items-center gap-1.5 px-3 bg-green-50 text-green-600 rounded-md border border-green-100 text-xs font-medium">
                                        <ShieldCheck size={14} /> Active
                                    </div>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400">Your key is stored in the root <code>.env</code> file and synchronized with the backend.</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <div className="flex gap-3">
                        <div className="p-2 bg-blue-100 rounded-full h-fit text-blue-600">
                            <RotateCcw size={16} />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-blue-900">Restart Required</h4>
                            <p className="text-xs text-blue-700/80">Changes to <code>.env</code> usually require a server restart to take full effect globally.</p>
                        </div>
                    </div>
                    <Button
                        type="submit"
                        disabled={mutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 shadow-md gap-2"
                    >
                        <Save size={16} />
                        {mutation.isPending ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </form>
        </div>
    );
};
