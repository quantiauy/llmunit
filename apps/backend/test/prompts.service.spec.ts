import { describe, expect, it, mock, beforeEach } from "bun:test";

// Mock fs module before importing service
mock.module("fs", () => ({
  writeFileSync: mock(),
  mkdirSync: mock(),
  existsSync: mock(() => false),
  readdirSync: mock(() => []),
  readFileSync: mock(() => ""),
  statSync: mock(() => ({ isDirectory: () => false })),
  rmSync: mock(),
}));

import { PromptsService } from "../src/modules/prompts/prompts.service";

describe("PromptsService", () => {
  let service: PromptsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      prompt: {
        findMany: mock(() => Promise.resolve([])),
        findUnique: mock(() => Promise.resolve(null)),
        create: mock((data: any) => Promise.resolve({ id: "1", ...data.data })),
        update: mock((data: any) => Promise.resolve({ id: "1", ...data.data })),
        delete: mock(() => Promise.resolve()),
        upsert: mock(() => Promise.resolve({ id: "1" })),
      },
      testCase: {
        deleteMany: mock(() => Promise.resolve()),
        create: mock(() => Promise.resolve()),
      }
    };
    service = new PromptsService(prismaMock);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should find all prompts", async () => {
    const result = await service.findAll();
    expect(result).toEqual([]);
    expect(prismaMock.prompt.findMany).toHaveBeenCalled();
  });

  it("should create a prompt", async () => {
    const data = { name: "Test", content: "Content" };
    const result = await service.create(data);
    expect(result.name).toBe("Test");
    expect(prismaMock.prompt.create).toHaveBeenCalled();
    // Verify that mocked fs was called (optional, or just verify no error)
  });
});
