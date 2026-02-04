import type { PromptRepository } from "../../domain/repositories/prompt-repository";
import type { TestCaseRepository } from "../../domain/repositories/test-case-repository";
import type { LLMService } from "../../domain/services/llm-service";
import type { EvaluatorService, EvaluationResult } from "../../domain/services/evaluator-service";
import type { Message } from "../../domain/entities/message";
import { parseToolCalls } from "@llmunit/shared";
import chalk from "chalk";
import { join } from "path";

export interface TestRunOptions {
  promptName: string;
  model?: string;
}

export interface StepResult {
  step: number;
  userInput: string;
  actualResponse: string;
  evaluation: EvaluationResult;
}

export class RunTest {
  constructor(
    private promptRepo: PromptRepository,
    private testCaseRepo: TestCaseRepository,
    private llmService: LLMService,
    private evaluator: EvaluatorService
  ) {}

  async execute(options: TestRunOptions) {
    const prompt = await this.promptRepo.getByName(options.promptName);
    if (!prompt) {
      throw new Error(`Prompt ${options.promptName} not found`);
    }

    const testCases = await this.testCaseRepo.getByPromptName(options.promptName);
    if (testCases.length === 0) {
      console.log(chalk.yellow(`No test cases found for prompt: ${options.promptName}`));
      return;
    }

    console.log(chalk.blue(`Running ${testCases.length} test cases for ${options.promptName}...\n`));

    for (const testCase of testCases) {
      await this.runTestCase(options.promptName, prompt.content, testCase, options.model);
    }
  }

  private async runTestCase(promptName: string, promptTemplate: string, testCase: any, model?: string) {
    console.log(chalk.bold(`--- Test Case: ${testCase.name} ---`));
    
    // Support both 'memory' as chat history and 'initialContext' as state
    let history: any[] = Array.isArray(testCase.memory) ? testCase.memory : [];
    let state: any = typeof testCase.memory === 'object' && !Array.isArray(testCase.memory) 
      ? testCase.memory 
      : (testCase.initialContext || {});

    const stepResults: StepResult[] = [];

    for (let i = 0; i < testCase.steps.length; i++) {
        const step = testCase.steps[i];
        const rawMessage = step.message || step.userInput || (step.input ? step.input.last_message : "");
        const stepInputString = rawMessage || JSON.stringify(step.input);
        
        console.log(chalk.blue(`\n  >>> STEP ${i + 1} <<<`));

        // Prepare context for variable replacement ($json)
        const $json: any = {
          last_message: rawMessage,
          chat_history: history,
          csv_context: JSON.stringify(history),
          ...state,
          ...(step.input || {})
        };

        // Prepare prompt by replacing placeholders dynamically
        let fullPrompt = promptTemplate;
        const matches = fullPrompt.match(/\{\{\s*\$json\.[a-zA-Z0-9_.]+\s*\}\}/g) || [];
        for (const match of matches) {
          const path = match.replace(/\{\{\s*\$json\./, "").replace(/\s*\}\}/, "").trim();
          const value = this.getValueByPath($json, path);
          fullPrompt = fullPrompt.replace(match, value !== undefined ? String(value) : "null");
        }
        fullPrompt = fullPrompt.replace("{{ $json.conversation_id }}", "test-session-123");

        console.log(chalk.gray(`  [CONTEXT]: last_message="${rawMessage}", state=${JSON.stringify(state)}`));
        console.log(chalk.gray(`  [MEMORY (ChatHistory)]: ${history.length} previous messages`));
        console.log(chalk.dim(`  [PROMPT SENT]:\n${fullPrompt.split('\n').map(line => '    ' + line).join('\n')}`));
        
        // Log Simulation Model
        console.log(chalk.magenta(`  [SIMULATION MODEL]: ${model || "default"}`));

        const messages: Message[] = [
          { role: "user", content: fullPrompt }
        ];

        let actualResponse = "";
        let isToolCall = true;
        let turnCount = 0;
        const MAX_TURNS = 5;

        // Try to load mocks
        let mocks: any = {};
        try {
          const mocksPath = join(process.cwd(), "../../tests", promptName, "mocks.ts");
          const mocksModule = await import(mocksPath);
          mocks = mocksModule.default || {};
        } catch (e: any) {
          // No mocks found
        }

        while (isToolCall && turnCount < MAX_TURNS) {
          actualResponse = await this.llmService.chat(messages, model);
          turnCount++;

          try {
            const toolCalls = parseToolCalls(actualResponse);

            if (toolCalls.length > 0) {
              for (const toolCall of toolCalls) {
                const { name: toolName, arguments: args } = toolCall;
                
                console.log(chalk.yellow(`  [TOOL CALL]: ${toolName}(${JSON.stringify(args)})`));

                let toolResult = `Error: Tool mock for "${toolName}" not found`;
                if (mocks[toolName]) {
                  toolResult = await mocks[toolName](args);
                }
                console.log(chalk.yellow(`  [TOOL RESULT]: ${toolResult}`));

                // Update message history for multi-turn
                messages.push({ role: "assistant", content: actualResponse });
                messages.push({ role: "user", content: `Tool result for ${toolName}: ${toolResult}` });
              }
              isToolCall = true;
            } else {
              isToolCall = false;
            }
          } catch (e) {
            isToolCall = false;
          }
        }

        // Log Judge Model
        const judgeModel = this.evaluator.getJudgeModel ? this.evaluator.getJudgeModel() : "unknown";
        console.log(chalk.magenta(`  [JUDGE MODEL]: ${judgeModel}`));
        
        const evaluation = await this.evaluator.evaluate(
          stepInputString,
          actualResponse,
          step.expectedBehavior
        );

        console.log(chalk.cyan(`  [QUERY]: ${stepInputString}`));
        console.log(chalk.white(`  [RESPONSE]: ${actualResponse.trim()}`));
        
        if (evaluation.passed) {
          console.log(chalk.green(`  [ANALYSIS - ✅ PASSED] (${evaluation.score}/10): ${evaluation.feedback}`));
        } else {
          console.log(chalk.red(`  [ANALYSIS - ❌ FAILED] (${evaluation.score}/10): ${evaluation.feedback}`));
        }

        // Update memory and state for next step
        history.push({ role: "user", content: rawMessage });
        history.push({ role: "assistant", content: actualResponse.trim() });

        try {
          const jsonResponse = JSON.parse(actualResponse.replace(/```json\n?|\n?```/g, ""));
          // Merge model's JSON response into the state for next steps
          state = {
            ...state,
            ...jsonResponse
          };
        } catch (e) {
          // If response is not JSON, we don't update state fields
        }

        stepResults.push({
          step: i + 1,
          userInput: stepInputString,
          actualResponse,
          evaluation
        });
    }
    console.log("\n");
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
}
