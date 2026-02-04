# Execution History Block

Every test run is recorded as an **execution** in the backend. Executions are tied to a test case and contain one **step result** per step of that test case. The Execution History lets you inspect past runs, see per-step pass/fail and judge feedback, and compare results over time to spot regressions.

## Structure (backend)

The structure is fixed in the backend (Prisma + API).

### TestExecution

Each run creates one **TestExecution** row:

- **id**: UUID of the execution.
- **testCaseId**: The test case that was run.
- **model**: LLM used for the run (e.g. `openai/gpt-oss-safeguard-20b`). Comes from the request body or `DEFAULT_MODEL`.
- **judgeModel**: LLM used to evaluate responses against **expectedBehavior** (e.g. same as model or a dedicated judge). Comes from the request body or `DEFAULT_JUDGE_MODEL`.
- **status**: `PENDING` → `RUNNING` → `COMPLETED` or `FAILED`.
- **startedAt**: When the execution started (set at creation).
- **completedAt**: When the execution finished (set when status becomes `COMPLETED` or `FAILED`).
- **errorMessage**: Set when status is `FAILED` (e.g. exception message).
- **results**: List of **StepResult** rows (one per test case step), ordered by **stepOrder**.

### StepResult

For each step of the test case, the backend creates one **StepResult** after the judge evaluates the LLM response:

- **stepOrder**: Index of the step (0-based).
- **userInput**: The user message for that step (from the step’s **message** or **userInput**).
- **renderedPrompt**: The full prompt sent to the LLM after replacing `{{ $json.* }}` (stored so you can inspect what the model saw).
- **actualResponse**: The raw LLM response for that step.
- **passed**: Whether the judge considered the response acceptable (true/false).
- **score**: Judge score (e.g. 0–10).
- **feedback**: Judge’s textual feedback explaining pass/fail.
- **toolExecutions**: Optional JSON string: array of `{ toolName, arguments, result, timestamp }` for each tool call made during that step (if any). The UI parses this to show tool calls and results.

So for each run you get: one execution (model, judge, status, timestamps) and one result per step (input, prompt, response, pass, score, feedback, tool calls).

## API

- **POST** `api/v1/testing/:testCaseId/execute`  
  Body (optional): `{ model?: string, judgeModel?: string }`.  
  Creates a new execution, starts the run in the background, and returns `{ executionId }`. Use **executionId** to poll or load the execution.

- **GET** `api/v1/testing/executions/:id`  
  Returns the execution with **results** (all step results). Used by the UI to show “Live Execution Log” and to refresh until status is `COMPLETED` or `FAILED`.

- **GET** `api/v1/testing/history/:testCaseId`  
  Returns all executions for that test case, ordered by **startedAt** descending. Use this to build “Execution History” or comparison views.

## Status lifecycle

1. **PENDING**: Execution was created but the runner has not started yet (short-lived).
2. **RUNNING**: The test is executing (steps are being run, LLM + judge calls in progress).
3. **COMPLETED**: All steps finished; each step has a **StepResult** with **passed**, **score**, **feedback**.
4. **FAILED**: The run stopped with an error; **errorMessage** is set. Some steps may still have results if the failure happened mid-run.

The UI typically polls **GET executions/:id** until status is `COMPLETED` or `FAILED`, then stops polling.

## Key information per run

When you open a single execution (e.g. in the “Live Execution Log” or a history detail view), you get:

- **Timestamps**: **startedAt**, **completedAt** (if finished).
- **Model details**: **model** (simulator) and **judgeModel** (evaluator).
- **Result status**: Overall **status** (COMPLETED / FAILED). For FAILED, **errorMessage** explains why.
- **Per-step results**: For each step, **userInput**, **renderedPrompt** (optional), **actualResponse**, **passed**, **score**, **feedback**, and **toolExecutions** (if the step had tool calls). This is enough to see exactly what was sent, what the LLM returned, and why the judge passed or failed.

The backend does not currently store latency or token counts in the schema; those would require future changes. Today you can still compare runs by **model**, **judgeModel**, **score**, and **passed** per step.

## Comparison and regressions

- Use **GET history/:testCaseId** to list past executions for a test case.
- Compare **score** and **passed** across runs (e.g. same test case, different model or different prompt version) to see if quality regressed.
- Inspect **feedback** and **actualResponse** on failed steps to understand what the judge disliked and to adjust the prompt or [expectedBehavior](/docs/test-case).

## Best practices

- **Run the same test case** with different models or after prompt changes, then use Execution History to compare **status**, **score**, and **feedback**.
- **Inspect failed steps**: Use **renderedPrompt** and **actualResponse** to see why the judge failed and to refine [expectedBehavior](/docs/test-case) or the [prompt](/docs/prompt).
- **Tool calls**: When a step has **toolExecutions**, check **arguments** and **result** in the history to confirm mocks were called as expected and returned the right data for the judge to pass.

These structures and endpoints are the ones used by the API and by the frontend (e.g. Execution Live View and history UIs).
