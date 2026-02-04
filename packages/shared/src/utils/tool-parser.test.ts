import { describe, expect, it } from "bun:test";
import { parseToolCalls } from "./tool-parser";

describe("tool-parser", () => {
  it("should parse standard OpenAI tool_calls", () => {
    const response = JSON.stringify({
      tool_calls: [
        {
          id: "call_123",
          type: "function",
          function: {
            name: "test_tool",
            arguments: "{\"foo\": \"bar\"}"
          }
        }
      ]
    });
    const result = parseToolCalls(response);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("test_tool");
    expect(result[0].arguments).toEqual({ foo: "bar" });
  });

  it("should parse parallel tool calls", () => {
    const response = JSON.stringify({
      tool_calls: [
        { function: { name: "tool1", arguments: "{}" } },
        { function: { name: "tool2", arguments: "{}" } }
      ]
    });
    const result = parseToolCalls(response);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("tool1");
    expect(result[1].name).toBe("tool2");
  });

  it("should parse simplified project format", () => {
    const response = JSON.stringify({
      tool: "simplified_tool",
      args: { key: "value" }
    });
    const result = parseToolCalls(response);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("simplified_tool");
    expect(result[0].arguments).toEqual({ key: "value" });
  });

  it("should unwrap assistant wrapper", () => {
    const response = JSON.stringify({
      name: "assistant",
      arguments: {
        tool: "actual_tool",
        query: "important query"
      }
    });
    const result = parseToolCalls(response);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("actual_tool");
    expect(result[0].arguments).toEqual({ query: "important query" });
  });

  it("should handle mixed formats and sanitization", () => {
    const response = "```json\n{\"name\": \"tool:sanitized\", \"query\": \"test\"}\n```";
    const result = parseToolCalls(response);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("sanitized");
    expect(result[0].arguments).toEqual({ query: "test" });
  });

  it("should return empty array for non-tool JSON", () => {
    const response = JSON.stringify({
      user_response: "Hello world",
      tool_executed: false
    });
    const result = parseToolCalls(response);
    expect(result).toHaveLength(0);
  });
  
  it("should handle nested tool_calls within assistant arguments", () => {
    const response = JSON.stringify({
      name: "assistant",
      arguments: {
        tool_calls: [
          { function: { name: "nested_tool", arguments: "{}" } }
        ]
      }
    });
    const result = parseToolCalls(response);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("nested_tool");
  });
});
