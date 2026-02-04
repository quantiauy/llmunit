import type { LLMService } from "../../domain/services/llm-service";
import type { Message } from "../../domain/entities/message";
import dotenv from "dotenv";

dotenv.config();

export class OpenRouterService implements LLMService {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY is not defined");
    }
  }

  async chat(messages: Message[], model: string = "openai/gpt-oss-safeguard-20b"): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://github.com/tricore-solutions", // Required by OpenRouter
        "X-Title": "Prompt Tester", // Required by OpenRouter
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json() as any;
    
    if (data.error) {
       // Workaround for Groq/OpenRouter error when model generates tool call without tools definition (Root error case)
       if (data.error.metadata?.raw?.failed_generation) {
         console.warn("Recovered failed generation from OpenRouter root error");
         return data.error.metadata.raw.failed_generation;
       }
       throw new Error(`OpenRouter API returned error: ${JSON.stringify(data.error)}`);
    }

    if (!data.choices || data.choices.length === 0) {
       throw new Error(`OpenRouter returned no choices: ${JSON.stringify(data)}`);
    }

    // Check for error inside choice (Groq specific behavior)
    if (data.choices[0].error) {
       const choiceError = data.choices[0].error;
       if (choiceError.metadata?.raw?.failed_generation) {
         console.warn("Recovered failed generation from OpenRouter choice error");
         return choiceError.metadata.raw.failed_generation;
       }
       throw new Error(`OpenRouter API returned choice error: ${JSON.stringify(choiceError)}`);
    }

    return data.choices[0].message.content || "";
  }
}
