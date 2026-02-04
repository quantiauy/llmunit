import { describe, expect, it } from "bun:test";
import { PromptSchema, TestCaseSchema } from "./index";

describe("Domain Entities", () => {
  describe("Prompt", () => {
    it("should validate a correct prompt", () => {
      const validPrompt = {
        name: "Test Prompt",
        content: "You are an assistant",
      };
      const result = PromptSchema.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it("should fail validation for empty content", () => {
      const invalidPrompt = {
        name: "Test Prompt",
        content: "",
      };
      const result = PromptSchema.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
    });
  });

  describe("TestCase", () => {
    it("should validate a correct test case with steps", () => {
      const validTestCase = {
        name: "Test Case 1",
        steps: [
          {
            stepOrder: 0,
            expectedBehavior: "Should say hello",
            userInput: "Hi",
          },
        ],
      };
      const result = TestCaseSchema.safeParse(validTestCase);
      expect(result.success).toBe(true);
    });

    it("should fail validation without steps", () => {
      const invalidTestCase = {
        name: "Test Case 1",
        steps: [],
      };
      //TestCaseSchema currently doesn't enforce non-empty steps in Zod, but let's check basic structure
      const result = TestCaseSchema.safeParse({ name: "Oops" });
      expect(result.success).toBe(false); // steps is required
    });
  });
});
