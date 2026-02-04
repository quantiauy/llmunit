import { z } from 'zod';

export const StepResultSchema = z.object({
  id: z.string().uuid().optional(),
  executionId: z.string().uuid().optional(),
  stepOrder: z.number().int().min(0),
  userInput: z.string(),
  actualResponse: z.string(),
  passed: z.boolean(),
  score: z.number().int().min(0).max(10),
  feedback: z.string(),
  createdAt: z.date().optional(),
});

export type StepResult = z.infer<typeof StepResultSchema>;

export const ExecutionStatusSchema = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const TestExecutionSchema = z.object({
  id: z.string().uuid().optional(),
  testCaseId: z.string().uuid(),
  model: z.string(),
  judgeModel: z.string(),
  status: ExecutionStatusSchema,
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  errorMessage: z.string().optional(),
  results: z.array(StepResultSchema).optional(),
});

export type TestExecution = z.infer<typeof TestExecutionSchema>;
