#!/usr/bin/env bun
import { existsSync, copyFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🔧 Configuring development environment...\n');

const rootDir = import.meta.dir + '/..';
const envPath = join(rootDir, '.env');
const envExamplePath = join(rootDir, '.env.example');

if (!existsSync(envPath)) {
  if (existsSync(envExamplePath)) {
    copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created from .env.example');
  } else {
    console.log('⚠️  .env.example not found, creating a basic .env...');
    
    const defaultEnv = `# Database (Native Bun SQLite)
DATABASE_URL="file:./apps/backend/prompt-testing.db"

# LLM
OPENROUTER_API_KEY=your_key_here
DEFAULT_MODEL=openai/gpt-oss-safeguard-20b
DEFAULT_JUDGE_MODEL=openai/gpt-oss-safeguard-20b

# Server
PORT=3000
FRONTEND_PORT=5173
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
`;
    
    writeFileSync(envPath, defaultEnv);
    console.log('✅ .env file created with default values');
  }
} else {
console.log('ℹ️  .env file already exists');
}

// Sync .env with apps/backend and apps/cli
const backendEnvPath = join(rootDir, 'apps', 'backend', '.env');
const cliEnvPath = join(rootDir, 'apps', 'cli', '.env');
copyFileSync(envPath, backendEnvPath);
copyFileSync(envPath, cliEnvPath);
console.log('🔄 Synced .env with apps/backend and apps/cli');

// Verify database
const dbPath = join(rootDir, 'apps', 'backend', 'prompt-testing.db');
if (!existsSync(dbPath)) {
  console.log('📦 Database not found, it will be created automatically...');
} else {
  console.log('ℹ️  Existing database found');
}

console.log('\n✨ Setup completed!\n');
