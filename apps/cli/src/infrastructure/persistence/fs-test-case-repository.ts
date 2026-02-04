import type { TestCaseRepository } from "../../domain/repositories/test-case-repository";
import type { TestCase } from "../../domain/entities/test-case";
import { join } from "path";
import { readdir, readFile } from "fs/promises";

export class FSTestCaseRepository implements TestCaseRepository {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async getByPromptName(promptName: string): Promise<TestCase[]> {
    const promptTestsDir = join(this.baseDir, promptName);
    
    try {
      const files = await readdir(promptTestsDir);
      const jsonFiles = files.filter(f => f.endsWith(".json") && f !== "prompt.md");
      
      const testCases: TestCase[] = [];
      for (const file of jsonFiles) {
        const content = await readFile(join(promptTestsDir, file), "utf-8");
        const json = JSON.parse(content);
        testCases.push({
          id: file.replace(".json", ""),
          ...json,
        });
      }
      return testCases;
    } catch (e) {
      return [];
    }
  }
}
