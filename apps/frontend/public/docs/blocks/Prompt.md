# Prompt Block

The Prompt block is the core of your test case. It defines the instruction sent to the LLM.

## Features

- **Version Control**: Every change to a prompt is tracked.
- **Variable Injection**: Use `{{variable}}` syntax to inject dynamic data.
- **Provider Settings**: Configure specific parameters for each provider (OpenAI, Anthropic).

## Usage

When creating a prompt, focus on clarity and specific instructions. You can test your prompt against multiple models simultaneously.

## Examples

### Simple instruction prompt

A prompt with no variables: the same text is sent every time.

```text
You are a helpful assistant. Answer the user's question concisely and in a friendly tone.
```

Use this when the instruction is fixed (e.g. system role, style rules).

---

### Prompt with variable injection

Use `{{ variable }}` to inject data from the test case. Common names are `{{ $json.user_input }}`, `{{ $json.context }}`, or `{{ $json.last_message }}` — they come from the test case inputs.

**Example: user message and context**

```text
You are a support agent. Use the conversation history and the new message to reply.

Conversation history:
{{ $json.context }}

New user message:
{{ $json.last_message }}

Reply in valid JSON: { "reply": "your answer" }
```

When you run the test, LLMUnit replaces `{{ $json.context }}` and `{{ $json.last_message }}` with the values defined in that test case.

---

### Structured output (JSON)

Prompts that ask the model for a fixed JSON shape work well for assertions:

```text
You are a classifier. Output only valid JSON, no other text.

Output format:
{ "sentiment": "positive" | "negative" | "neutral", "reason": "short explanation" }

User text to classify:
{{ $json.user_input }}
```

You can then assert on `sentiment` or `reason` in the test case.

---

### Agent with tools

For agents that call tools, describe the tools and when to use them; inject context and the current message with variables:

```text
You are a support agent. When you need external data, call the appropriate tool. Do not invent data.

Categories: Account, Payments, General help.

Current conversation:
{{ $json.context }}

New message:
{{ $json.last_message }}

Reply based on the conversation and tool results. Use tool-calling when the user question falls into a category that has a tool.
```

Combine this prompt with [Tool Mocks](/docs/tool-mocks) in your test case so the agent receives deterministic tool responses.
