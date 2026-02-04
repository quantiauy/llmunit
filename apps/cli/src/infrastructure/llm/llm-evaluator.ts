import type { EvaluatorService, EvaluationResult } from "../../domain/services/evaluator-service";
import type { LLMService } from "../../domain/services/llm-service";

export class LLMEvaluator implements EvaluatorService {
  constructor(
    private llmService: LLMService,
    private judgeModel: string = "openai/gpt-oss-safeguard-20b"
  ) {}

  getJudgeModel(): string {
    return this.judgeModel;
  }

  async evaluate(
    userInput: string,
    actualResponse: string,
    expectedBehavior: string
  ): Promise<EvaluationResult> {
    const systemPrompt = `You are an expert AI judge. Your task is to evaluate an AI assistant's response based on the user input and the expected behavior.
    
Respond EXCLUSIVELY in JSON format with the following structure:
{
  "passed": boolean,
  "score": number, (0-10)
  "feedback": "concise explanation of why it passed or failed"
}`;

    const prompt = `
### USER INPUT
${userInput}

### ASSISTANT RESPONSE (TO EVALUATE)
${actualResponse}

### EXPECTED BEHAVIOR
${expectedBehavior}

Evaluate if the response meets the expected behavior. Consider if the response is a JSON if requested.
`;

    const response = await this.llmService.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ], this.judgeModel);

    try {
      // Clean potential markdown code blocks
      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleaned) as EvaluationResult;
    } catch (e) {
      console.error("Error parsing evaluation result:", response);
      return {
        passed: false,
        score: 0,
        feedback: "Error parsing judge response: " + response,
      };
    }
  }
}
