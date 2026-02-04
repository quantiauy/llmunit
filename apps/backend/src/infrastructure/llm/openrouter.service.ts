import { Injectable, Logger } from '@nestjs/common';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  };

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  private shouldRetry(status: number): boolean {
    // Retry on rate limits (429) and server errors (5xx)
    return status === 429 || (status >= 500 && status < 600);
  }

  async chat(messages: ChatMessage[], model?: string): Promise<string> {
    const targetModel = model || process.env.DEFAULT_MODEL || 'openai/gpt-oss-safeguard-20b';
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY not found in environment');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt - 1);
          this.logger.warn(`Retry attempt ${attempt}/${this.retryConfig.maxRetries} after ${delay}ms delay`);
          await this.sleep(delay);
        }

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://tricore.prompt-tester.com',
            'X-Title': 'Prompt Tester',
          },
          body: JSON.stringify({
            model: targetModel,
            messages: messages,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Check for failed_generation in metadata recovery
          try {
            const errorJson = JSON.parse(errorText);
            const failedGeneration = errorJson?.error?.metadata?.raw?.failed_generation;
            if (failedGeneration) {
              const recoveredContent = typeof failedGeneration === 'string' 
                ? failedGeneration 
                : JSON.stringify(failedGeneration);
              this.logger.warn(`Recovered content from failed generation (${recoveredContent.length} chars)`);
              return recoveredContent;
            }
          } catch (e) {
            // Ignore parsing error, proceed to standard error handling
          }

          if (this.shouldRetry(response.status) && attempt < this.retryConfig.maxRetries) {
            this.logger.warn(`Rate limit or server error (${response.status}), will retry...`);
            lastError = new Error(`OpenRouter API error: ${response.status} ${errorText}`);
            continue;
          }
          
          // Non-retriable error, throw immediately
          throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        if (data.error) {
          // Workaround for Groq/OpenRouter error when model generates tool call without tools definition (Root error case)
          if (data.error.metadata?.raw?.failed_generation) {
            this.logger.warn("Recovered failed generation from OpenRouter root error");
            return typeof data.error.metadata.raw.failed_generation === 'string' 
              ? data.error.metadata.raw.failed_generation 
              : JSON.stringify(data.error.metadata.raw.failed_generation);
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
             this.logger.warn(`Recovered failed generation from OpenRouter choice error (${choiceError.metadata.raw.failed_generation.length} chars)`);
             return typeof choiceError.metadata.raw.failed_generation === 'string'
               ? choiceError.metadata.raw.failed_generation
               : JSON.stringify(choiceError.metadata.raw.failed_generation);
           }
           throw new Error(`OpenRouter API returned choice error: ${JSON.stringify(choiceError)}`);
        }

        const content = data.choices?.[0]?.message?.content || '';
        this.logger.log(`OpenRouter response content received (${content.length} chars)`);
        return content;
      } catch (error: any) {
        // If we explicitly threw a non-retriable error, re-throw it
        if (error.message && !error.message.includes('429') && !error.message.includes('5')) {
          throw error;
        }
        
        if (attempt === this.retryConfig.maxRetries) {
          this.logger.error(`Failed after ${this.retryConfig.maxRetries} retries: ${error.message}`);
          throw lastError || error;
        }
        lastError = error;
      }
    }

    throw lastError || new Error('Unexpected error in retry logic');
  }

  async getModels(): Promise<any[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      this.logger.error('Error fetching models from OpenRouter:', error);
      return [];
    }
  }
}
