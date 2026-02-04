import { z } from 'zod';

export const MockSchema = z.object({
  id: z.string().uuid().optional(),
  testCaseId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  code: z.string().min(1),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Mock = z.infer<typeof MockSchema>;

export const CreateMockSchema = MockSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateMock = z.infer<typeof CreateMockSchema>;
