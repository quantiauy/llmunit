import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OpenRouterService } from '@/infrastructure/llm/openrouter.service';
import { LLMEvaluator } from '@/infrastructure/llm/llm-evaluator.service';
import { TestExecution, TestCase, TestStep, Mock, parseToolCalls } from '@llmunit/shared';
import { join } from 'path';

@Injectable()
export class TestingService {
  private readonly logger = new Logger(TestingService.name);

  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(OpenRouterService) private llmService: OpenRouterService,
    @Inject(LLMEvaluator) private evaluator: LLMEvaluator,
  ) {}

  async executeTestCase(testCaseId: string, model?: string, judgeModel?: string): Promise<string> {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: testCaseId },
      include: { prompt: true, steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (!testCase) throw new Error('Test case not found');

    const execution = await this.prisma.testExecution.create({
      data: {
        testCaseId,
        model: model || process.env.DEFAULT_MODEL || 'openai/gpt-oss-safeguard-20b',
        judgeModel: judgeModel || process.env.DEFAULT_JUDGE_MODEL || 'openai/gpt-oss-safeguard-20b',
        status: 'RUNNING',
      },
    });

    // Run execution in background or handle async
    this.runExecution(execution.id, testCase as any).catch(err => {
        this.logger.error(`Error in execution ${execution.id}: ${err.message}`);
    });

    return execution.id;
  }

  private async runExecution(executionId: string, testCase: any) {
    try {
        // Fetch execution to get model and judgeModel
        const execution = await this.prisma.testExecution.findUnique({
            where: { id: executionId }
        });
        
        if (!execution) throw new Error('Execution not found');
        
        this.logger.log(`Starting execution ${executionId} with model: ${execution.model}, judge: ${execution.judgeModel}`);
        
        let history: any[] = JSON.parse(testCase.memory || '[]');
        let state: any = JSON.parse(testCase.initialContext || '{}');
        const promptTemplate = testCase.prompt.content;

        for (const step of testCase.steps) {
            this.logger.log(`\n=== Processing Step ${step.stepOrder} ===`);
            
            const rawMessage = step.message || step.userInput || (step.input ? JSON.parse(step.input).last_message : "");
            const stepInputString = rawMessage || step.input;
            
            this.logger.log(`User input: "${rawMessage}"`);
            this.logger.log(`History length: ${history.length} messages`);

            // Prepare context for variable replacement ($json)
            const $json: any = {
                last_message: rawMessage,
                chat_history: history,
                csv_context: JSON.stringify(history),
                ...state,
                ...(step.input ? JSON.parse(step.input) : {})
            };

            // Replace placeholders
            let fullPrompt = promptTemplate;
            const matches = fullPrompt.match(/\{\{\s*\$json\.[a-zA-Z0-9_.]+\s*\}\}/g) || [];
            for (const match of matches) {
                const path = match.replace(/\{\{\s*\$json\./, "").replace(/\s*\}\}/, "").trim();
                const value = this.getValueByPath($json, path);
                fullPrompt = fullPrompt.replace(match, value !== undefined ? String(value) : "null");
            }
            fullPrompt = fullPrompt.replace("{{ $json.conversation_id }}", `execution-${executionId}`);

            const messages: any[] = [{ role: "user", content: fullPrompt }];
            
            // Handle Tool Calls (simplified migration)
            let actualResponse = "";
            let isToolCall = true;
            let turnCount = 0;
            const MAX_TURNS = 5;
            const toolExecutions: Array<{
                toolName: string;
                arguments: any;
                result: string;
                timestamp: string;
            }> = [];

            // Mock loading (this could be improved to use DB mocks)
            // For now, let's keep it simple and try to find files first for compatibility
            let mocks: any = {};
            try {
                // Compatibility with existing mocks.ts files
                // Backend runs from apps/backend, so we need to go up two levels
                const mocksPath = join(process.cwd(), '../../tests', testCase.prompt.name, 'mocks.ts');
                // Use dynamic import but handle Bun specifics
                const mocksModule = await import(mocksPath);
                mocks = mocksModule.default || {};
            } catch (e) {
                this.logger.warn(`Could not load mocks for ${testCase.prompt.name}: ${e}`);
            }

            while (isToolCall && turnCount < MAX_TURNS) {
                this.logger.log(`LLM call #${turnCount + 1}, messages count: ${messages.length}`);
                actualResponse = await this.llmService.chat(messages, execution.model);
                turnCount++;

                // Log if we get an empty response
                if (!actualResponse || actualResponse.trim() === '') {
                    this.logger.error(`Empty response from LLM for step ${step.stepOrder}, execution ${executionId}`);
                    this.logger.error(`Messages sent: ${JSON.stringify(messages, null, 2)}`);
                    break; // Exit the loop if we get an empty response
                }
                
                this.logger.log(`LLM response (${actualResponse.length} chars): ${actualResponse.substring(0, 200)}...`);

                try {
                    const toolCalls = parseToolCalls(actualResponse);

                    if (toolCalls.length > 0) {
                        this.logger.log(`${toolCalls.length} tool call(s) detected`);
                        
                        for (const toolCall of toolCalls) {
                            const { name: toolName, arguments: args } = toolCall;
                            
                            let toolResult = `Error: Tool mock for "${toolName}" not found`;
                            if (mocks[toolName]) {
                                this.logger.log(`Executing mock for ${toolName}`);
                                toolResult = await mocks[toolName](args);
                                this.logger.log(`Tool result: ${toolResult.substring(0, 100)}...`);
                            } else {
                                this.logger.warn(`No mock found for tool: ${toolName}`);
                            }

                            // Track tool execution
                            toolExecutions.push({
                                toolName,
                                arguments: args,
                                result: toolResult,
                                timestamp: new Date().toISOString()
                            });

                            messages.push({ role: "assistant", content: actualResponse });
                            messages.push({ role: "user", content: `Resultado de la herramienta ${toolName}: ${toolResult}` });
                        }
                        isToolCall = true;
                    } else {
                        this.logger.log(`Final response detected`);
                        isToolCall = false;
                    }
                } catch (e: any) {
                    this.logger.log(`Parsing or execution failed: ${e.message}`);
                    isToolCall = false;
                }
            }
            
            this.logger.log(`Final actualResponse for step ${step.stepOrder}: ${actualResponse.length} chars`);
            this.logger.log(`Evaluating with judge model: ${execution.judgeModel}`);

            const evaluation = await this.evaluator.evaluate(
                stepInputString,
                actualResponse,
                step.expectedBehavior,
                execution.judgeModel
            );

            await this.prisma.stepResult.create({
                data: {
                    executionId,
                    stepOrder: step.stepOrder,
                    userInput: stepInputString,
                    renderedPrompt: fullPrompt,
                    actualResponse,
                    passed: evaluation.passed,
                    score: evaluation.score,
                    feedback: evaluation.feedback,
                    toolExecutions: toolExecutions.length > 0 ? JSON.stringify(toolExecutions) : null,
                }
            });
            
            this.logger.log(`Step ${step.stepOrder} completed - Score: ${evaluation.score}/10, Passed: ${evaluation.passed}`);

            // Update state
            history.push({ role: "user", content: rawMessage });
            history.push({ role: "assistant", content: actualResponse.trim() });

            try {
                const jsonResponse = JSON.parse(actualResponse.replace(/```json\n?|\n?```/g, ""));
                state = { ...state, ...jsonResponse };
            } catch (e) {}
        }

        await this.prisma.testExecution.update({
            where: { id: executionId },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });
        
        this.logger.log(`\n✅ Execution ${executionId} completed successfully`);

    } catch (error: any) {
        await this.prisma.testExecution.update({
            where: { id: executionId },
            data: { status: 'FAILED', errorMessage: error.message, completedAt: new Date() },
        });
    }
  }

  async getExecution(executionId: string) {
    return this.prisma.testExecution.findUnique({
      where: { id: executionId },
      include: { results: true },
    });
  }

  async getHistory(testCaseId: string) {
    return this.prisma.testExecution.findMany({
      where: { testCaseId },
      orderBy: { startedAt: 'desc' },
      include: { results: true },
    });
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
}
