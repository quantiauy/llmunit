import 'reflect-metadata';
import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { INestApplication } from "@nestjs/common";

import { execSync } from "child_process";
import { join } from "path";

describe("App (E2E)", () => {
  let app: INestApplication;
  let port: number;
  const TEST_DB = "file:./test-e2e.db";

  beforeAll(async () => {
    // Isolate environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = TEST_DB;

    // Run migrations on test database
    console.log("Setting up test database...");
    const rootDir = join(import.meta.dir, "../../../");
    const schemaPath = join(rootDir, "apps/backend/prisma/schema.prisma");
    execSync(`bunx prisma migrate deploy --schema ${schemaPath}`, {
      env: { ...process.env, DATABASE_URL: TEST_DB },
      stdio: 'inherit'
    });

    app = await NestFactory.create(AppModule, { 
      logger: ['error', 'warn', 'log'],
      abortOnError: false,
    });
    
    app.enableShutdownHooks();
    await app.init();
    const server = await app.listen(0, '127.0.0.1');
    port = server.address().port;
    console.log(`E2E Test server running on port ${port}`);
    // Wait for server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("/api/v1/prompts (GET)", async () => {
    const url = `http://127.0.0.1:${port}/api/v1/prompts`;
    console.log(`Fetching ${url}`);
    const response = await fetch(url);
    if (response.status !== 200) {
      console.error(`Failed to fetch prompts. Status: ${response.status}`);
      console.error(await response.text());
    }
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("/api/v1/settings (GET)", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/settings`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.DEFAULT_MODEL).toBeDefined();
    // Verify masking
    if (body.OPENROUTER_API_KEY) {
      expect(body.OPENROUTER_API_KEY).toContain('...');
    }
  });

  it("/api/v1/settings (PUT)", async () => {
    const testModel = "e2e/test-model";
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ DEFAULT_MODEL: testModel })
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.DEFAULT_MODEL).toBe(testModel);
  });

  it("/api/v1/settings/models (GET)", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/settings/models`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
