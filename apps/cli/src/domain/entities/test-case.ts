export interface TestStep {
  userInput?: string;
  message?: string; // Alias for userInput
  input?: Record<string, any>;
  expectedBehavior: string;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  steps: TestStep[];
  initialContext?: Record<string, any>;
  memory?: Record<string, any>; // Alias for initialContext
}
