#!/usr/bin/env bun
import { existsSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';

console.log('🔍 Validating test environment...\n');

const rootDir = join(import.meta.dir, '..');
let hasErrors = false;

// 1. Check if bun.lock exists
console.log('📦 Checking dependencies...');
if (!existsSync(join(rootDir, 'bun.lock'))) {
  console.error('❌ bun.lock not found. Run `bun install` first.');
  hasErrors = true;
} else {
  console.log('✅ Dependencies lock file found');
}

// 2. Check if node_modules exists
if (!existsSync(join(rootDir, 'node_modules'))) {
  console.error('❌ node_modules not found. Run `bun install` first.');
  hasErrors = true;
} else {
  console.log('✅ node_modules found');
}

// 3. Check if .env.example exists
if (!existsSync(join(rootDir, '.env.example'))) {
  console.error('❌ .env.example not found. This is required for test environment setup.');
  hasErrors = true;
} else {
  console.log('✅ .env.example found');
}

// 4. Check if Prisma schema exists
const schemaPath = join(rootDir, 'apps/backend/prisma/schema.prisma');
if (!existsSync(schemaPath)) {
  console.error('❌ Prisma schema not found at apps/backend/prisma/schema.prisma');
  hasErrors = true;
} else {
  console.log('✅ Prisma schema found');
}

// 5. Check if shared package is built
const sharedDistPath = join(rootDir, 'packages/shared/dist');
if (!existsSync(sharedDistPath)) {
  console.log('⚠️  Shared package not built, will build now...');
} else {
  console.log('✅ Shared package built');
}

if (hasErrors) {
  console.error('\n❌ Validation failed. Please fix the errors above before running tests.\n');
  process.exit(1);
}

console.log('\n✅ All validations passed!\n');
