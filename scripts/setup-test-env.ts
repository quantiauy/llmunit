#!/usr/bin/env bun
import { existsSync, copyFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

console.log('🧪 Setting up test environment...\n');

const rootDir = join(import.meta.dir, '..');
const envTestPath = join(rootDir, '.env.test');
const envExamplePath = join(rootDir, '.env.example');

// Clean up any existing .env.test
if (existsSync(envTestPath)) {
  rmSync(envTestPath);
}

// Create .env.test from .env.example
if (existsSync(envExamplePath)) {
  copyFileSync(envExamplePath, envTestPath);
  console.log('✅ Created .env.test from .env.example');
} else {
  console.log('⚠️  .env.example not found, creating basic .env.test...');
  
  const defaultTestEnv = `# Database (Native Bun SQLite)
DATABASE_URL="file:./apps/backend/llmunit-test.db"

# LLM
OPENROUTER_API_KEY=test_key_here
DEFAULT_MODEL=openai/gpt-oss-safeguard-20b
DEFAULT_JUDGE_MODEL=openai/gpt-oss-safeguard-20b

# Server
PORT=3000
FRONTEND_PORT=5173
NODE_ENV=test

# CORS
CORS_ORIGIN=http://localhost:5173
`;
  
  writeFileSync(envTestPath, defaultTestEnv);
  console.log('✅ Created .env.test with default test values');
}

// Sync to backend
const backendEnvTestPath = join(rootDir, 'apps/backend', '.env.test');
copyFileSync(envTestPath, backendEnvTestPath);
console.log('🔄 Synced .env.test to apps/backend');

console.log('\n✨ Test environment ready!\n');
