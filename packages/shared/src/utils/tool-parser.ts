export interface ToolCall {
  name: string;
  arguments: any;
  id?: string;
}

/**
 * Robustly parses a model response to extract tool calls.
 * Supports OpenAI tool_calls structure, simplified project-specific JSON,
 * and handles "assistant" wrappers.
 */
export function parseToolCalls(responseContent: string): ToolCall[] {
  try {
    const cleaned = responseContent.replace(/```json\n?|\n?```/g, "").trim();
    if (!cleaned) return [];

    let data: any;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      // If it's not valid JSON, it might just be text
      return [];
    }

    const toolCalls: ToolCall[] = [];

    // 1. OpenAI Native / OpenRouter standard: { tool_calls: [...] }
    if (Array.isArray(data.tool_calls)) {
      for (const tc of data.tool_calls) {
        const call = extractFromStandard(tc);
        if (call) toolCalls.push(call);
      }
    } 
    // 2. Wrapped Assistant or Direct Tool Call
    else {
      const call = extractFromObject(data);
      if (call) {
        // Handle the case where the unwrapped call is actually another tool_calls array
        if (Array.isArray((call.arguments as any)?.tool_calls)) {
           for (const tc of (call.arguments as any).tool_calls) {
             const nestedCall = extractFromStandard(tc);
             if (nestedCall) toolCalls.push(nestedCall);
           }
        } else {
          toolCalls.push(call);
        }
      }
    }

    return toolCalls.map(sanitizeToolCall);
  } catch (error) {
    console.error("Error parsing tool calls:", error);
    return [];
  }
}

function extractFromStandard(tc: any): ToolCall | null {
  if (!tc) return null;
  
  // Standard OpenAI: { function: { name, arguments } }
  if (tc.function) {
    return {
      name: tc.function.name,
      arguments: tryParseJson(tc.function.arguments),
      id: tc.id
    };
  }
  
  // Alternative: { name, arguments }
  if (tc.name) {
    return {
      name: tc.name,
      arguments: tryParseJson(tc.arguments),
      id: tc.id
    };
  }

  return null;
}

function extractFromObject(data: any): ToolCall | null {
  const name = data.tool || data.name;
  if (!name) return null;

  // Check for "assistant" wrapper first
  if ((name === "assistant" || name === "chat")) {
    const argsObject = data.arguments || data.args || data.parameters;
    if (argsObject && typeof argsObject === "object") {
      const nestedName = argsObject.tool || argsObject.name;
      let nestedArgs = argsObject.arguments || argsObject.args || argsObject.input || argsObject.parameters;
      
      // If no nested arguments, but we have 'query', use it as an object
      if (!nestedArgs && argsObject.query) {
        nestedArgs = { query: argsObject.query };
      }

      if (nestedName && nestedName !== name) {
        return { name: nestedName, arguments: nestedArgs || argsObject };
      }
    }
  }

  // Regular tools: prefer explicit arguments field
  let args = data.arguments || data.args || data.parameters || data.input;
  
  // If no explicit arguments field, but we have 'query', it's a flat project format
  if (!args && data.query) {
    return { name, arguments: { query: data.query } };
  }

  // If still no args, use the object itself minus the identifier keys
  if (!args) {
    const { tool, name: n, ...rest } = data;
    args = Object.keys(rest).length > 0 ? rest : {};
  }

  return { name, arguments: args };
}

function sanitizeToolCall(tc: ToolCall): ToolCall {
  let name = tc.name;
  if (typeof name === 'string') {
    // Remove common model errors like "tool:" prefix
    name = name.replace(/^tool[:\.]/, '').trim();
  }
  
  let args = tc.arguments;
  if (typeof args === 'string') {
    args = tryParseJson(args);
  }

  return { ...tc, name, arguments: args };
}

function tryParseJson(val: any): any {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}
