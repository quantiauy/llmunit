import type { Message } from "../entities/message";

export interface LLMService {
  chat(messages: Message[], model?: string): Promise<string>;
}
