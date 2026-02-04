#!/usr/bin/env bun
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

console.log('🧹 Cleaning up test environment...\n');

const rootDir = join(import.meta.dir, '..');
const envTestPath = join(rootDir, '.env.test');
const backendEnvTestPath = join(rootDir, 'apps/backend', '.env.test');
const testDbPath = join(rootDir, 'apps/backend', 'llmunit-test.db');
const testE2EDbPath = join(rootDir, 'apps/backend', 'test-e2e.db');

// Clean up .env.test files
if (existsSync(envTestPath)) {
  rmSync(envTestPath);
  console.log('✅ Removed .env.test');
}

if (existsSync(backendEnvTestPath)) {
  rmSync(backendEnvTestPath);
  console.log('✅ Removed apps/backend/.env.test');
}

// Clean up test databases
if (existsSync(testDbPath)) {
  rmSync(testDbPath);
  console.log('✅ Removed test database');
}

if (existsSync(testE2EDbPath)) {
  rmSync(testE2EDbPath);
  console.log('✅ Removed e2e test database');
}

// Clean up compiled test files
const backendDistPath = join(rootDir, 'apps/backend/dist');
if (existsSync(backendDistPath)) {
  rmSync(backendDistPath, { recursive: true });
  console.log('✅ Removed backend dist folder');
}

console.log('\n✨ Test cleanup complete!\n');
