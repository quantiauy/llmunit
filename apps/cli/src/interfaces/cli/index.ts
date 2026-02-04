import { Command } from "commander";
import { FSPromptRepository } from "../../infrastructure/persistence/fs-prompt-repository";
import { FSTestCaseRepository } from "../../infrastructure/persistence/fs-test-case-repository";
import { OpenRouterService } from "../../infrastructure/llm/openrouter-service";
import { LLMEvaluator } from "../../infrastructure/llm/llm-evaluator";
import { RunTest } from "../../application/use-cases/run-test";
import { join } from "path";
import chalk from "chalk";

const program = new Command();

program
  .name("prompt-tester")
  .description("CLI to test n8n prompts locally")
  .version("1.0.0");

program
  .command("run")
  .description("Run tests for a specific prompt")
  .argument("<promptName>", "Name of the prompt (without .md)")
  .option("-m, --model <model>", "Model to use for testing", "openai/gpt-oss-safeguard-20b")
  .option("-j, --judge <model>", "Model to use for evaluation", "openai/gpt-oss-safeguard-20b")
  .action(async (promptName, options) => {
    try {
      const testsDir = join(process.cwd(), "../../tests");

      const promptRepo = new FSPromptRepository(testsDir);
      const testCaseRepo = new FSTestCaseRepository(testsDir);
      const llmService = new OpenRouterService();
      const evaluator = new LLMEvaluator(llmService, options.judge);

      const runTest = new RunTest(promptRepo, testCaseRepo, llmService, evaluator);

      await runTest.execute({
        promptName,
        model: options.model,
      });
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();
