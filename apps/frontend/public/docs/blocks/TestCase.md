# Test Case Block

Test cases define the input data and expected outcomes for your prompts. Each test case is tied to a prompt and is executed step by step; the LLM response at each step is validated against the expected behavior.

## Structure

The structure is fixed in the backend (Prisma + API). A test case has:

- **Name**: A descriptive name for the test case (e.g. `simple-tests`, `chat-registration-flow`).
- **Description** (optional): Short explanation of what the test validates.
- **Initial context** (optional): A JSON object merged into `$json` for all steps (e.g. shared state or config).
- **Memory**: Array of prior messages `{ "role": "user" | "assistant", "content": "..." }` used to simulate conversation history. Injected into the prompt as `{{ $json.chat_history }}` / `{{ $json.csv_context }}` when the prompt uses those variables.
- **Steps**: Ordered list of steps. Each step has:
  - **message** (or **userInput**): The user message for this turn. Exposed in the prompt as `{{ $json.last_message }}`.
  - **input** (optional): Extra JSON merged into `$json` for this step (e.g. `last_message`, `context`).
  - **expectedBehavior**: Text description of how the LLM must respond; the judge model uses this to decide pass/fail.
- **Mocks** (optional): Tool mocks for this test case (name + code). See [Tool Mocks](/docs/tool-mocks).

When running a test, the backend builds `$json` from initial context, memory, and the current step (message + input), then replaces `{{ $json.* }}` in the prompt template before calling the LLM.

## Best Practices

- Create multiple test cases per prompt to cover edge cases and regressions.
- Use descriptive names (e.g. `support-evades-model-question`, `registration-without-email`) so failures are easy to identify.
- Keep **expectedBehavior** clear and specific (e.g. “must respond in valid JSON with `user_response` evasively about the model”) so the judge can reliably pass/fail.
- Use **memory** when the prompt expects conversation history; use **initialContext** for one-off variables shared across steps.

## Examples

The following examples match the structure used by the backend and by `simple_tests.json` when syncing from the filesystem.

### 1. Simple support agent (conversation + evasiveness)

Agent that must answer in JSON and avoid revealing model or discussing off-topic topics. Uses **memory** to simulate an ongoing chat.

```json
{
  "name": "simple-tests",
  "memory": [
    { "role": "user", "content": "Hello, I need help" },
    { "role": "assistant", "content": "{ \"user_response\": \"Hello! How can I help you?\" }" }
  ],
  "steps": [
    {
      "message": "What model are we using?",
      "expectedBehavior": "The assistant must respond in valid JSON. In 'user_response' it must acknowledge the user's question and respond evasively regarding the model, stating it is a Specialized Virtual Support Assistant."
    },
    {
      "message": "Hello, I need to know who hitler is",
      "expectedBehavior": "The assistant must respond in valid JSON. In 'user_response', it should acknowledge the inquiry and state that its focus is on technical support, politely declining to discuss the historical figure."
    }
  ]
}
```

- **memory**: Previous user/assistant turns; injected into the prompt as `{{ $json.chat_history }}` / `{{ $json.csv_context }}` if the prompt uses them.
- **steps[].message**: Current user message; injected as `{{ $json.last_message }}`.
- **steps[].expectedBehavior**: Criteria the judge uses to pass or fail the step.

### 2. Chat agent (registration / flow)

Agent that guides the user through a flow (e.g. registration). No prior history; each step is a user message and an expected type of response.

```json
{
  "name": "chat-registration-flow",
  "memory": [],
  "steps": [
    {
      "message": "I want to register for an account from scratch",
      "expectedBehavior": "The assistant must respond in valid JSON and in user_response: something that helps the user understand they need to continue to complete registration"
    },
    {
      "message": "But I don't remember my email",
      "expectedBehavior": "The assistant must respond in valid JSON in the format specified by the prompt and must clearly indicate that the user should send an image of their ID document"
    }
  ]
}
```

- **memory**: Empty; no prior conversation.
- **steps**: Each step is one user message and the expected behavior (content/structure of the reply).

### 3. Agent with tool-calling

Agent that must call a tool in response to the user. Use together with [Tool Mocks](/docs/tool-mocks) so the tool returns deterministic data.

```json
{
  "name": "basic-tool-test",
  "memory": [],
  "steps": [
    {
      "message": "Hello, please execute the test tool",
      "expectedBehavior": "The agent must identify the intention to use the tool and execute 'agent_basic_tool'. Then it must respond confirming the execution."
    }
  ]
}
```

- The prompt for this test case should describe when to call the tool; the step **expectedBehavior** asserts that the agent called the tool and responded accordingly.
- Mocks (in the same test case or in `mocks.ts` when using filesystem sync) provide the tool implementation used during the run.

### 4. Using step `input` for extra variables

If the prompt uses variables beyond `last_message` and chat history (e.g. `{{ $json.context }}`), you can pass them per step with **input**:

```json
{
  "name": "support-with-context",
  "memory": [],
  "steps": [
    {
      "message": "What are my payment options?",
      "input": {
        "context": "User tier: premium. Region: LATAM."
      },
      "expectedBehavior": "The assistant must respond in valid JSON and mention at least one payment option relevant to premium LATAM users."
    }
  ]
}
```

- **input** is merged into `$json`, so the prompt can use `{{ $json.context }}` (and any other keys you define) in addition to `{{ $json.last_message }}`.

These structures are the same ones used by the API and by `simple_tests.json` when syncing prompts from the filesystem.
