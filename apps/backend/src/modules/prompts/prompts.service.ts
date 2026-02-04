import { Injectable, NotFoundException, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { CreatePrompt, Prompt } from '@llmunit/shared';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/** Default prompt template for new prompts (DRY: used when content is empty). */
const DEFAULT_PROMPT_CONTENT = `You are a helpful assistant. Reply in a clear and polite way.

# Rules
- Always start with a friendly greeting (e.g., "Hello!", "Hi there!").
- Be concise but thorough in your answers.
- If the user asks about your model or identity, acknowledge it briefly and focus on how you can help.
- When asked about your capabilities, describe at least 2-3 specific things you can do AND explicitly ask the user to choose one of them or propose a specific task.

# Output format
You can respond in plain text or using markdown. If the information is structured, use a JSON block:
\`\`\`json
{ "reply": "your detailed response here" }
\`\`\`

# Context
- Respond to the user's input based on the conversation history if provided.`;

/** Default test case for new prompts (DRY: used for DB and simple_tests.json). */
function getDefaultTestCaseForFile(): { name: string; memory: unknown[]; steps: { message: string; expectedBehavior: string }[] } {
  return {
    name: 'Initial Test',
    memory: [],
    steps: [
      {
        message: 'Hello',
        expectedBehavior: 'The assistant must (1) respond with a friendly greeting like "Hello" or "Hi" and (2) explicitly offer its assistance.',
      },
      {
        message: 'What can you do?',
        expectedBehavior:
          'The assistant must (1) clearly describe at least two specific capabilities (e.g., answering questions, summarizing text, or providing information) and (2) explicitly ask the user to choose a task or ask a specific question. A generic "How can I help?" is not enough.',
      },
    ],
  };
}

@Injectable()
export class PromptsService implements OnModuleInit {
  private readonly logger = new Logger(PromptsService.name);

  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncFromFilesystem();
  }

  async findAll(): Promise<Prompt[]> {
    const prompts = await this.prisma.prompt.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return prompts as unknown as Prompt[];
  }

  async findById(id: string): Promise<any> {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id },
      include: {
        testCases: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
            mocks: true,
          }
        }
      }
    });
    if (!prompt) throw new NotFoundException(`Prompt with ID ${id} not found`);
    return prompt;
  }

  async create(data: CreatePrompt): Promise<Prompt> {
    const contentToSave = (data.content && data.content.trim()) ? data.content : DEFAULT_PROMPT_CONTENT;
    const defaultTestCase = getDefaultTestCaseForFile();

    const prompt = await this.prisma.prompt.create({
      data: {
        name: data.name,
        content: contentToSave,
        description: data.description,
      },
    });

    await this.createDefaultTestCaseForPrompt(prompt.id, defaultTestCase);
    await this.scaffoldPromptFiles(prompt.name, contentToSave, defaultTestCase);

    return this.findById(prompt.id);
  }

  /** Creates one default test case in DB so the UI shows it without filesystem sync (DRY with getDefaultTestCaseForFile). */
  private async createDefaultTestCaseForPrompt(
    promptId: string,
    tc: { name: string; memory: unknown[]; steps: { message: string; expectedBehavior: string }[] },
  ) {
    await this.prisma.testCase.create({
      data: {
        promptId,
        name: tc.name,
        memory: JSON.stringify(tc.memory),
        steps: {
          create: tc.steps.map((s, idx) => ({
            stepOrder: idx,
            userInput: s.message,
            expectedBehavior: s.expectedBehavior,
            input: '{}',
          })),
        },
      },
    });
  }

  private async scaffoldPromptFiles(
    name: string,
    content: string,
    testCaseForFile: { name: string; memory: unknown[]; steps: { message: string; expectedBehavior: string }[] } = getDefaultTestCaseForFile(),
  ) {
    try {
      const folderName = name.trim().toLowerCase().replace(/\s+/g, '_');
      const testsDir = join(import.meta.dir, '../../../../../tests', folderName);

      if (!existsSync(testsDir)) {
        mkdirSync(testsDir, { recursive: true });
      }

      // 1. Create prompt.md
      const promptContent = content?.trim() ? content : `# ${name}\n\nAdd your prompt content here.`;
      writeFileSync(join(testsDir, 'prompt.md'), promptContent, 'utf8');

      // 2. Create simple_tests.json (DRY: same structure as default test case)
      writeFileSync(join(testsDir, 'simple_tests.json'), JSON.stringify(testCaseForFile, null, 2), 'utf8');

      // 3. Create mocks.ts
      const mocksContent = `/**
 * Mocks Configuration
 * 
 * Defines mock implementations for external tools or services used in the prompt.
 * 
 * Example:
 * 
 * export const mocks = [
 *   {
 *     name: 'getUser',
 *     code: \`
 *       export default async function(args) {
 *         return { id: 1, name: "John Doe", email: "john@example.com" };
 *       }
 *     \`
 *   }
 * ];
 */
export const mocks = [];
`;
      writeFileSync(join(testsDir, 'mocks.ts'), mocksContent, 'utf8');
      
    } catch (error) {
      this.logger.error(`[PromptsService] Error scaffolding files for ${name}:`, error);
    }
  }

  async update(id: string, data: any): Promise<Prompt> {
    const { testCases, ...promptData } = data;

    const prompt = await this.prisma.prompt.update({
      where: { id },
      data: {
        ...promptData,
      },
    });

    if (testCases && Array.isArray(testCases)) {
        await this.prisma.testCase.deleteMany({ where: { promptId: id } });
        for (const tc of testCases) {
            await this.prisma.testCase.create({
                data: {
                    promptId: id,
                    name: tc.name || 'Untitled Test Case',
                    initialContext: JSON.stringify(tc.initialContext || {}),
                    memory: JSON.stringify(tc.memory || []),
                    steps: {
                        create: tc.steps?.map((s: any, idx: number) => ({
                            stepOrder: idx,
                            userInput: s.userInput,
                            expectedBehavior: s.expectedBehavior,
                            input: JSON.stringify(s.input || {})
                        }))
                    },
                    mocks: {
                        create: tc.mocks?.map((m: any) => ({
                            name: m.name,
                            code: m.code
                        })) || []
                    }
                }
            });
        }
    }

    // New: Sync to filesystem
    await this.syncToFilesystem(prompt.name, prompt.content, testCases);

    return prompt as unknown as Prompt;
  }

  private async syncToFilesystem(promptName: string, content: string, testCases?: any[]) {
    try {
      const testsDir = join(import.meta.dir, '../../../../../tests', promptName);

      if (!existsSync(testsDir)) {
        mkdirSync(testsDir, { recursive: true });
      }

      // 1. Write prompt.md
      writeFileSync(join(testsDir, 'prompt.md'), content, 'utf8');

      // 2. Write simple_tests.json
      if (testCases && testCases.length > 0) {
        const mainTC = testCases[0];
        const testsFileContent = {
            name: mainTC.name,
            memory: typeof mainTC.memory === 'string' ? JSON.parse(mainTC.memory) : (mainTC.memory || []),
            steps: mainTC.steps?.map((s: any) => ({
                message: s.userInput || s.message,
                expectedBehavior: s.expectedBehavior
            }))
        };
        writeFileSync(join(testsDir, 'simple_tests.json'), JSON.stringify(testsFileContent, null, 2), 'utf8');

        // 3. Write mocks.ts
        if (mainTC.mocks && mainTC.mocks.length > 0) {
            const mockCode = mainTC.mocks[0].code;
            writeFileSync(join(testsDir, 'mocks.ts'), mockCode, 'utf8');
        }
      }
    } catch (error) {
      this.logger.error(`[PromptsService] Error syncing ${promptName} to filesystem:`, error);
    }
  }

  async delete(id: string): Promise<void> {
    const prompt = await this.prisma.prompt.findUnique({ where: { id } });
    if (prompt) {
        try {
            const folderName = prompt.name.trim().toLowerCase().replace(/\s+/g, '_');
            const testsDir = join(import.meta.dir, '../../../../../tests', folderName);
            const fs = await import('fs');
            if (fs.existsSync(testsDir)) {
                fs.rmSync(testsDir, { recursive: true, force: true });
            }
        } catch (error) {
            this.logger.error(`[PromptsService] Error deleting files for prompt ${id}:`, error);
        }
    }

    await this.prisma.prompt.delete({
      where: { id },
    });
  }

  /**
   * Syncs prompts from the filesystem to the database.
   * This logic runs on application startup.
   */
  async syncFromFilesystem() {
    this.logger.log('Starting sync from filesystem...');
    const testsDir = join(import.meta.dir, '../../../../../tests');

    if (!existsSync(testsDir)) {
      this.logger.warn(`Tests directory not found at ${testsDir}`);
      return;
    }

    const items = readdirSync(testsDir);

    for (const item of items) {
      const fullPath = join(testsDir, item);
      if (!statSync(fullPath).isDirectory()) continue;

      try {
        const promptMdPath = join(fullPath, 'prompt.md');
        const simpleTestsPath = join(fullPath, 'simple_tests.json');
        const mocksPath = join(fullPath, 'mocks.ts');

        if (!existsSync(promptMdPath)) continue;

        const content = readFileSync(promptMdPath, 'utf8');
        // Heuristic: Use the folder name as the prompt name unless we want to parse it.
        // The user implies filesystem is SOT. 
        // We will assume 'name' is the folder name, or derived from it.
        // BUT, `folderName` in creation was: name.trim().toLowerCase().replace(/\s+/g, '_')
        // So we can use the folder name as the name key for upsert.
        // A better UX might be to extract title from MD, but let's stick to folder name for ID stability for now
        // OR simply use the folder name as the prompt name for simplicity.
        const promptName = item; 

        // Upsert Prompt
        const prompt = await this.prisma.prompt.upsert({
          where: { name: promptName },
          update: { content },
          create: {
            name: promptName,
            content,
            description: 'Imported from filesystem',
          },
        });

        // Upsert Test Cases (Replace existing for this prompt to match FS state)
        if (existsSync(simpleTestsPath)) {
            const testsContent = JSON.parse(readFileSync(simpleTestsPath, 'utf8'));
            
            // Prepare mocks code if exists
            let mockCode = '';
            if (existsSync(mocksPath)) {
                mockCode = readFileSync(mocksPath, 'utf8');
            }

             // We replace all test cases with the one defined in FS files
            await this.prisma.testCase.deleteMany({ where: { promptId: prompt.id } });

            await this.prisma.testCase.create({
                data: {
                    promptId: prompt.id,
                    name: testsContent.name || 'Filesystem Test Case',
                    memory: JSON.stringify(testsContent.memory || []),
                    // Handle flexibility in step format if needed, assuming simple_tests.json structure
                    steps: {
                        create: testsContent.steps?.map((step: any, idx: number) => ({
                            stepOrder: idx,
                            userInput: step.message || step.userInput,
                            expectedBehavior: step.expectedBehavior,
                            input: JSON.stringify(step.input || {})
                        }))
                    },
                    mocks: {
                        create: mockCode ? [{
                            name: 'default', // Using a default name as fs structure might not have explicit mock names easily parseable from a single file without parsing the TS code complexly
                            code: mockCode
                        }] : []
                    }
                }
            });
        }
        
        this.logger.log(`Synced prompt: ${promptName}`);

      } catch (error) {
        this.logger.error(`Failed to sync prompt folder ${item}:`, error);
      }
    }
    this.logger.log('Finished sync from filesystem.');
  }
}
