import type { PromptRepository } from "../../domain/repositories/prompt-repository";
import type { Prompt } from "../../domain/entities/prompt";
import { join } from "path";
import { readdir, readFile } from "fs/promises";

export class FSPromptRepository implements PromptRepository {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async getByName(name: string): Promise<Prompt | null> {
    const promptDir = join(this.baseDir, name);
    const filePath = join(promptDir, "prompt.md");
    
    try {
      const content = await readFile(filePath, "utf-8");
      return {
        name,
        content,
        filePath,
      };
    } catch (e) {
      // Fallback for root level prompts during transition
      const rootFilePath = join(this.baseDir, "..", `${name}.md`);
      try {
        const content = await readFile(rootFilePath, "utf-8");
        return {
          name,
          content,
          filePath: rootFilePath,
        };
      } catch (e2) {
        return null;
      }
    }
  }

  async listAll(): Promise<Prompt[]> {
    const files = await readdir(this.baseDir);
    const mdFiles = files.filter(f => f.endsWith(".md"));
    
    const prompts: Prompt[] = [];
    for (const file of mdFiles) {
      const name = file.replace(".md", "");
      const content = await readFile(join(this.baseDir, file), "utf-8");
      prompts.push({
        name,
        content,
        filePath: join(this.baseDir, file),
      });
    }
    return prompts;
  }
}
