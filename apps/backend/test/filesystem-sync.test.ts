import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { PromptsService } from "../src/modules/prompts/prompts.service";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

describe("PromptsService Filesystem Sync", () => {
  let service: PromptsService;
  let prisma: PrismaService;
  const TEST_PROMPT_NAME = "test_sync_prompt_integration";
  const ROOT_DIR = join(import.meta.dir, "../../../");
  const TEST_FS_PATH = join(ROOT_DIR, "tests", TEST_PROMPT_NAME);

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'file:./llmunit-test.db';
    
    // Run migrations on test database
    const schemaPath = join(ROOT_DIR, "apps/backend/prisma/schema.prisma");
    execSync(`bunx prisma migrate deploy --schema ${schemaPath}`, {
      env: { ...process.env, DATABASE_URL: 'file:./llmunit-test.db' },
      stdio: 'inherit'
    });
    
    prisma = new PrismaService();
    await prisma.$connect();
    service = new PromptsService(prisma);
    
    // Clean up if exists
    await prisma.prompt.deleteMany({ where: { name: TEST_PROMPT_NAME } });
    if (existsSync(TEST_FS_PATH)) {
      rmSync(TEST_FS_PATH, { recursive: true, force: true });
    }
  });

  test("should synchronize prompt update to filesystem", async () => {
    // 1. Create prompt
    const created = await service.create({
      name: TEST_PROMPT_NAME,
      content: "Initial Content",
      description: "Test description"
    });

    // 2. Update with complex data
    const testCases = [
      {
        name: "Test Case 1",
        memory: JSON.stringify([{ role: "user", content: "hi" }]),
        steps: [
          { userInput: "Hello", expectedBehavior: "Respond nicely" }
        ],
        mocks: [
          { name: "default", code: "console.log('mock');" }
        ]
      }
    ];

    await service.update(created.id, {
      content: "Updated Content #filesystem_test",
      testCases
    });

    // 3. Verify files exist
    expect(existsSync(join(TEST_FS_PATH, "prompt.md"))).toBe(true);
    expect(readFileSync(join(TEST_FS_PATH, "prompt.md"), "utf8")).toBe("Updated Content #filesystem_test");

    expect(existsSync(join(TEST_FS_PATH, "simple_tests.json"))).toBe(true);
    const testsJson = JSON.parse(readFileSync(join(TEST_FS_PATH, "simple_tests.json"), "utf8"));
    expect(testsJson.steps[0].message).toBe("Hello");

    expect(existsSync(join(TEST_FS_PATH, "mocks.ts"))).toBe(true);
  });

  afterAll(async () => {
    await prisma.prompt.deleteMany({ where: { name: TEST_PROMPT_NAME } });
    await prisma.$disconnect();
    // Keep it for visual check or clean up
    rmSync(TEST_FS_PATH, { recursive: true, force: true });
  });
});
