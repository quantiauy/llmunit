import type { Prompt } from "../entities/prompt";

export interface PromptRepository {
  getByName(name: string): Promise<Prompt | null>;
  listAll(): Promise<Prompt[]>;
}
