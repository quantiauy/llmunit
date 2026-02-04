export interface EvaluationResult {
  passed: boolean;
  score: number; // 0 to 10
  feedback: string;
}

export interface EvaluatorService {
  evaluate(
    userInput: string,
    actualResponse: string,
    expectedBehavior: string
  ): Promise<EvaluationResult>;
  
  getJudgeModel(): string;
}
