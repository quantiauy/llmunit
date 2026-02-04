# Tool Mocks Block

Tool mocks let you simulate external function calls and API responses when the LLM uses tool-calling. During a test run, when the model returns a tool call, the backend invokes the corresponding mock with the arguments from the response and sends the mock result back to the LLM as the "tool result." This keeps tests deterministic, fast, and free of real external services.

## Why use Tool Mocks?

- **Determinism**: Tests are predictable and do not depend on live APIs or databases.
- **Speed**: No network latency; mocks return immediately.
- **Cost**: No external API usage during test runs.

## Structure (backend and filesystem)

The structure is fixed in the backend (Prisma + API) and aligned with the filesystem when using sync.

- **Backend (Prisma)**: Each mock belongs to a test case and has **name** (tool identifier) and **code** (TypeScript source as a string). The backend can store multiple mocks per test case (unique on `testCaseId` + `name`).
- **Filesystem**: For a prompt folder `tests/<promptName>/`, a single file **mocks.ts** defines all tool mocks for that prompt. When syncing from the filesystem, the backend reads `mocks.ts` and creates one mock per test case (name `default`, code = file content). When syncing to the filesystem, the first test case’s first mock’s code is written to `mocks.ts`.

At runtime, the testing service loads mocks from **filesystem** only: it dynamically imports `tests/<promptName>/mocks.ts` and uses the **default export**. The default export must be an object whose keys are **tool names** (matching the names in the LLM’s tool calls) and whose values are **async functions** that receive the tool’s arguments and return the string result that will be sent back to the LLM.

## Format of `mocks.ts`

The file must default-export a plain object:

- **Keys**: Tool names exactly as the LLM returns them (e.g. `agent_basic_tool`, `ValidateUser`). If the LLM calls a tool whose name is not a key in this object, the backend returns `Error: Tool mock for "<name>" not found` and the test step can fail.
- **Values**: Async functions `(args: any) => Promise<string> | string`. The **args** object is built by the backend from the LLM response (via `parseToolCalls`): it usually contains the fields the model sent (e.g. `query`, `email`). The function can return any string (e.g. JSON, CSV, plain text); that string is appended to the conversation as the user message: `Resultado de la herramienta <toolName>: <result>`.

Example skeleton:

```ts
export default {
  toolName: async (args: any) => {
    // Use args (e.g. args.query, args.email) to build a deterministic result.
    return "result string for the LLM";
  },
};
```

## How tool calls are matched

When the LLM returns a response, the backend parses it with `parseToolCalls` (from `@llmunit/shared`). It supports:

- **OpenAI / OpenRouter**: `{ tool_calls: [ { function: { name, arguments } } ] }` or `{ name, arguments }`.
- **Project-style**: Objects with `tool` or `name`, and `arguments`, `args`, `query`, etc.

The extracted **name** is used to look up `mocks[toolName]`. The extracted **arguments** (parsed as JSON when possible) are passed to the mock as **args**. So the keys in your `export default` must match the tool names produced by the parser (e.g. after stripping a `tool:` prefix).

## Examples

The following examples match real usage in the repo and the structure expected by the backend and `mocks.ts`.

### 1. Simple tool returning JSON

Agent that must call a single tool; the mock returns a JSON string so the LLM can reason about success/failure.

**Prompt (conceptually):** “When the user asks to run the test tool, call the tool `agent_basic_tool` and then respond confirming execution.”

**mocks.ts:**

```ts
export default {
  agent_basic_tool: async (args: any) => {
    console.log(`Executing mock agent_basic_tool with args:`, args);
    return JSON.stringify({
      status: "success",
      message: "Tool executed successfully",
      received_query: args.query
    });
  }
};
```

- The LLM is expected to call `agent_basic_tool` with arguments (e.g. `{ query: "..." }`). The mock receives that as `args` and returns a deterministic JSON string. The backend injects this result into the conversation so the LLM can generate the final reply.

### 2. User-validation mock (CSV-like result)

Agent that calls a `ValidateUser` tool with an email or query; the mock returns different CSV-style strings depending on the input so tests are deterministic.

**mocks.ts:**

```ts
export default {
  ValidateUser: async (args: any) => {
    const email = args.email || args.query;
    console.log(`Executing mock ValidateUser with email: ${email}`);
    if (email === "test@gmail.com") {
      return `isExists|email|appName|Nickname|status
true|test@gmail.com|APP|Test|Active`;
    }
    return `isExists|email|appName|Nickname|status
false|null|null|null|null`;
  }
};
```

- **args**: Comes from the LLM’s tool call (e.g. `{ query: "test@gmail.com" }` or `{ email: "test@gmail.com" }`). The mock normalizes with `args.email || args.query`.
- **Return**: Plain string (here, CSV-like). The prompt should describe how the LLM must interpret this format so it can answer the user correctly.

### 3. Multiple tools in one file

You can define several tools in the same `mocks.ts` so one agent can call different tools in different steps or turns.

```ts
export default {
  getUser: async (args: any) => {
    const id = args.userId || args.query;
    return JSON.stringify({ id, name: "Jane Doe", tier: "premium" });
  },
  getPaymentOptions: async (args: any) => {
    return JSON.stringify([
      { id: "card", label: "Credit card" },
      { id: "latam", label: "LATAM local methods" }
    ]);
  }
};
```

- Tool names in the LLM response must match the keys (`getUser`, `getPaymentOptions`). Each mock receives its own `args` and returns a string.

### 4. Missing mock

If the LLM calls a tool that is not in the default export (e.g. `unknown_tool`), the backend does not call any function and instead injects:

`Error: Tool mock for "unknown_tool" not found`

So the test case should either define a mock for every tool the prompt can call, or the **expectedBehavior** should account for error handling when a tool is missing.

## Best practices

- **Match tool names exactly**: The keys in `export default` must match the tool names parsed from the LLM response (e.g. after any `tool:` prefix is stripped). Typos or different casing will lead to “mock not found.”
- **Keep mocks deterministic**: Use only `args` and fixed logic (e.g. if/else on `args.email`) so the same step always gets the same result.
- **Return strings**: Mock functions must return a string (or a Promise that resolves to a string). The backend sends that string as the tool result; the prompt should describe how the LLM should interpret it (JSON, CSV, etc.).
- **One file per prompt**: When using filesystem sync, `tests/<promptName>/mocks.ts` is the single source for that prompt’s mocks. Combine all tools for that prompt in this file.
- **Test with the Test Case**: Use a [Test Case](/docs/test-case) that triggers the tool (e.g. a user message that leads the agent to call the tool) and set **expectedBehavior** so the judge checks that the agent called the tool and responded correctly given the mock result.

These structures and the `mocks.ts` format are the ones used by the API and by the testing service when running tests; filesystem sync aligns the repo’s `mocks.ts` with the backend’s stored mock code.
