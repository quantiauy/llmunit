import type { TestCase } from "../entities/test-case";

export interface TestCaseRepository {
  getByPromptName(promptName: string): Promise<TestCase[]>;
}
