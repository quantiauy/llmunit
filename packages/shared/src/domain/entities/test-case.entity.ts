import { z } from 'zod';

export const TestStepSchema = z.object({
  id: z.string().uuid().optional(),
  testCaseId: z.string().uuid().optional(),
  stepOrder: z.number().int().min(0),
  userInput: z.string().optional(),
  message: z.string().optional(), // Alias for userInput
  input: z.record(z.any()).optional(),
  expectedBehavior: z.string().min(1),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type TestStep = z.infer<typeof TestStepSchema>;

export const TestCaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  promptId: z.string().uuid().optional(),
  promptName: z.string().optional(),
  initialContext: z.record(z.any()).optional(),
  memory: z.array(z.any()).optional(),
  steps: z.array(TestStepSchema),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type TestCase = z.infer<typeof TestCaseSchema>;

export const CreateTestCaseSchema = TestCaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTestCase = z.infer<typeof CreateTestCaseSchema>;
