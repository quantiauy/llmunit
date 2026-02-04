#!/usr/bin/env bun
import { existsSync } from 'fs';
import { join } from 'path';

console.log('🔨 Preparing test environment...\n');

const rootDir = join(import.meta.dir, '..');

// 1. Install/update dependencies
console.log('📦 Installing dependencies...');
const installResult = Bun.spawnSync(['bun', 'install'], {
  cwd: rootDir,
  stdout: 'inherit',
  stderr: 'inherit',
});

if (installResult.exitCode !== 0) {
  console.error('❌ Failed to install dependencies');
  process.exit(1);
}
console.log('✅ Dependencies installed\n');

// 2. Build shared package
console.log('🏗️  Building shared package...');
const buildSharedResult = Bun.spawnSync(['bun', 'run', 'build:shared'], {
  cwd: rootDir,
  stdout: 'inherit',
  stderr: 'inherit',
});

if (buildSharedResult.exitCode !== 0) {
  console.error('❌ Failed to build shared package');
  process.exit(1);
}
console.log('✅ Shared package built\n');

// 3. Generate Prisma client
console.log('🔧 Generating Prisma client...');
const prismaGenResult = Bun.spawnSync(['bunx', 'prisma', 'generate'], {
  cwd: join(rootDir, 'apps/backend'),
  stdout: 'inherit',
  stderr: 'inherit',
});

if (prismaGenResult.exitCode !== 0) {
  console.error('❌ Failed to generate Prisma client');
  process.exit(1);
}
console.log('✅ Prisma client generated\n');

console.log('✨ Test environment prepared successfully!\n');
