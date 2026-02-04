import { z } from 'zod';

export const PromptSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  content: z.string().min(1),
  description: z.string().optional(),
  filePath: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Prompt = z.infer<typeof PromptSchema>;

export const CreatePromptSchema = PromptSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePrompt = z.infer<typeof CreatePromptSchema>;
