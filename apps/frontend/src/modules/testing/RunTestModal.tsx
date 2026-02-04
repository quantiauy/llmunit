import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Sparkles, Gavel, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const API_BASE_URL = 'http://localhost:3000/api/v1';

interface RunTestModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (config: { model: string; judgeModel: string }) => void;
    isPending?: boolean;
}

export const RunTestModal: React.FC<RunTestModalProps> = ({
    open,
    onOpenChange,
    onConfirm,
    isPending
}) => {
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [selectedJudge, setSelectedJudge] = useState<string>('');

    // 1. Fetch system defaults
    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const resp = await fetch(`${API_BASE_URL}/settings`);
            return resp.json();
        },
        enabled: open
    });

    // 2. Fetch available models
    const { data: models, isLoading: isLoadingModels } = useQuery({
        queryKey: ['available-models'],
        queryFn: async () => {
            const resp = await fetch(`${API_BASE_URL}/settings/models`);
            return resp.json();
        },
        enabled: open
    });

    useEffect(() => {
        if (settings) {
            if (!selectedModel) setSelectedModel(settings.DEFAULT_MODEL);
            if (!selectedJudge) setSelectedJudge(settings.DEFAULT_JUDGE_MODEL);
        }
    }, [settings, open]);

    const handleRun = () => {
        onConfirm({
            model: selectedModel,
            judgeModel: selectedJudge
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Play className="text-blue-600 fill-blue-600" size={18} />
                        Configure Test Run
                    </DialogTitle>
                    <DialogDescription>
                        Select the models you want to use for this specific execution.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Simulation Model */}
                    <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                            <Sparkles size={14} className="text-amber-500" />
                            Simulation Model
                        </Label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {isLoadingModels ? (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader2 className="animate-spin text-slate-400" size={16} />
                                    </div>
                                ) : (
                                    models?.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name || m.id}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-400">Model that will simulate the agent's behavior.</p>
                    </div>

                    {/* Judge Model */}
                    <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                            <Gavel size={14} className="text-slate-500" />
                            Judge Model
                        </Label>
                        <Select value={selectedJudge} onValueChange={setSelectedJudge}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select judge" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {isLoadingModels ? (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader2 className="animate-spin text-slate-400" size={16} />
                                    </div>
                                ) : (
                                    models?.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name || m.id}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-400">Model that will evaluate and score each step.</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleRun}
                        disabled={isPending || !selectedModel || !selectedJudge}
                        className="bg-blue-600 hover:bg-blue-700 gap-2"
                    >
                        {isPending ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                        Start Execution
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
