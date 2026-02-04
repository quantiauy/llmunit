import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import { OpenRouterService } from "../src/infrastructure/llm/openrouter.service";

describe("OpenRouterService Retry Logic", () => {
  let service: OpenRouterService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    service = new OpenRouterService();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should retry on 429 rate limit error", async () => {
    let callCount = 0;
    
    // Mock fetch to fail twice with 429, then succeed
    global.fetch = mock(async (url: string, options?: any) => {
      callCount++;
      
      if (callCount <= 2) {
        return new Response(JSON.stringify({ error: { message: "Rate limited" } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({
        choices: [{ message: { content: "Success after retry" } }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as any;

    const result = await service.chat([{ role: 'user', content: 'test' }]);
    
    expect(callCount).toBe(3);
    expect(result).toBe("Success after retry");
  });

  it("should fail after max retries", async () => {
    let callCount = 0;
    
    // Mock fetch to always return 429
    global.fetch = mock(async (url: string, options?: any) => {
      callCount++;
      return new Response(JSON.stringify({ error: { message: "Rate limited" } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as any;

    try {
      await service.chat([{ role: 'user', content: 'test' }]);
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      // maxRetries = 3, so total attempts = 1 initial + 3 retries = 4
      expect(callCount).toBeGreaterThanOrEqual(3);
      expect(error.message).toContain("429");
    }
  }, 15000); // 15 second timeout for retry delays

  it("should not retry on 4xx errors (except 429)", async () => {
    let callCount = 0;
    
    global.fetch = mock(async (url: string, options?: any) => {
      callCount++;
      return new Response(JSON.stringify({ error: { message: "Bad request" } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as any;

    try {
      await service.chat([{ role: 'user', content: 'test' }]);
      expect(true).toBe(false);
    } catch (error: any) {
      expect(callCount).toBe(1); // No retries
      expect(error.message).toContain("400");
    }
  });

  it("should recover content from failed_generation in error metadata", async () => {
    let callCount = 0;
    
    global.fetch = mock(async (url: string, options?: any) => {
      callCount++;
      // Simulate Groq/OpenRouter 502 error with failed_generation in metadata
      return new Response(JSON.stringify({
        error: {
          message: "Tool use failed",
          code: 502,
          metadata: {
            raw: {
              failed_generation: "Recovered content",
              message: "Tool choice is none, but model called a tool"
            }
          }
        }
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as any;

    const result = await service.chat([{ role: 'user', content: 'test' }]);
    
    expect(callCount).toBe(1);
    expect(result).toBe("Recovered content");
  }, 15000);

  it("should recover content from failed_generation in choice error (200 OK case)", async () => {
    let callCount = 0;
    
    global.fetch = mock(async (url: string, options?: any) => {
      callCount++;
      // Simulate Groq/OpenRouter 200 OK response but with error inside choice
      return new Response(JSON.stringify({
        choices: [{
          index: 0,
          message: { role: "assistant", content: "" },
          error: {
            message: "Failed to generate tool call",
            metadata: {
              raw: {
                failed_generation: "Recovered from choice error"
              }
            }
          }
        }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as any;

    const result = await service.chat([{ role: 'user', content: 'test' }]);
    
    expect(callCount).toBe(1);
    expect(result).toBe("Recovered from choice error");
  });
});
