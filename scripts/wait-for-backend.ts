#!/usr/bin/env bun
import chalk from 'chalk';

const BACKEND_URL = 'http://localhost:3000/health';
const MAX_ATTEMPTS = 60;
const DELAY_MS = 1000;

async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(BACKEND_URL);
    return response.ok;
  } catch (e) {
    return false;
  }
}

async function waitForBackend() {
  console.log(chalk.blue('⏳ Waiting for backend to be ready on http://localhost:3000...'));
  
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (await checkHealth()) {
      console.log(chalk.green('✅ Backend is ready!'));
      process.exit(0);
    }
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }
  
  console.log(chalk.red('❌ Backend failed to start in time.'));
  process.exit(1);
}

waitForBackend();
