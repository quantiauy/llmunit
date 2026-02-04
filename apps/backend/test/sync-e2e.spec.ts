import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { PromptsService } from "../src/modules/prompts/prompts.service";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

describe("PromptsService Startup Sync (E2E)", () => {
  let service: PromptsService;
  let prisma: PrismaService;
  const TEST_FOLDER_NAME = "e2e_sync_manual_test";
  const ROOT_DIR = join(import.meta.dir, "../../../");
  const TEST_FS_PATH = join(ROOT_DIR, "tests", TEST_FOLDER_NAME);

  beforeAll(async () => {
    // 1. Setup Test Environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'file:./llmunit-sync-test.db';

    // 2. Setup Test Database
    const schemaPath = join(ROOT_DIR, "apps/backend/prisma/schema.prisma");
    execSync(`bunx prisma migrate deploy --schema ${schemaPath}`, {
      env: { ...process.env, DATABASE_URL: 'file:./llmunit-sync-test.db' },
      stdio: 'ignore' // Suppress output
    });

    prisma = new PrismaService();
    await prisma.$connect();
    
    // Clean DB for this test prompt
    await prisma.prompt.deleteMany({ where: { name: TEST_FOLDER_NAME } });

    // 3. Create Filesystem Data MANUALLY (Simulating user adding files)
    if (existsSync(TEST_FS_PATH)) {
        rmSync(TEST_FS_PATH, { recursive: true, force: true });
    }
    mkdirSync(TEST_FS_PATH, { recursive: true });

    writeFileSync(join(TEST_FS_PATH, 'prompt.md'), "Synced Content #startup", 'utf8');

    const simpleTests = {
        name: "Synced Test Case",
        memory: [],
        steps: [
            {
                message: "Hello Sync",
                expectedBehavior: "It should sync"
            }
        ]
    };
    writeFileSync(join(TEST_FS_PATH, 'simple_tests.json'), JSON.stringify(simpleTests), 'utf8');
    
    writeFileSync(join(TEST_FS_PATH, 'mocks.ts'), "console.log('synced mock');", 'utf8');

    // 4. Initialize Service (Triggers onModuleInit -> syncFromFilesystem)
    service = new PromptsService(prisma);
    await service.onModuleInit();
  });

  test("should import prompt from filesystem on startup", async () => {
    // Verify Prompt
    const prompt = await prisma.prompt.findUnique({
        where: { name: TEST_FOLDER_NAME },
        include: { testCases: { include: { steps: true, mocks: true } } }
    });

    expect(prompt).not.toBeNull();
    expect(prompt?.content).toBe("Synced Content #startup");
    expect(prompt?.description).toBe("Imported from filesystem");

    // Verify Test Cases
    expect(prompt?.testCases).toHaveLength(1);
    const tc = prompt!.testCases[0];
    expect(tc.name).toBe("Synced Test Case");
    
    // Verify Steps
    expect(tc.steps).toHaveLength(1);
    expect(tc.steps[0].userInput).toBe("Hello Sync");
    expect(tc.steps[0].expectedBehavior).toBe("It should sync");

    // Verify Mocks
    expect(tc.mocks).toHaveLength(1);
    expect(tc.mocks[0].code).toBe("console.log('synced mock');");
  });

  afterAll(async () => {
    await prisma.prompt.deleteMany({ where: { name: TEST_FOLDER_NAME } });
    await prisma.$disconnect();
    
    if (existsSync(TEST_FS_PATH)) {
        rmSync(TEST_FS_PATH, { recursive: true, force: true });
    }
  });
});
