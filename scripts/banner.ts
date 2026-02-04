#!/usr/bin/env bun
import chalk from 'chalk';

const BACKEND_URL = 'http://localhost:3000/health';
const FRONTEND_URL = 'http://localhost:5173';
const MAX_ATTEMPTS = 30;
const DELAY_MS = 1000;

async function checkHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (e) {
    return false;
  }
}

async function waitForServices() {
  console.log(chalk.yellow('\n⏳ Waiting for services to be ready...'));
  
  let backendReady = false;
  let frontendReady = false;
  
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (!backendReady) backendReady = await checkHealth(BACKEND_URL);
    if (!frontendReady) frontendReady = await checkHealth(FRONTEND_URL);
    
    if (backendReady && frontendReady) break;
    
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }
  
  return { backendReady, frontendReady };
}

async function showBanner() {
  const { backendReady, frontendReady } = await waitForServices();
  
  const statusBackend = backendReady ? chalk.green('● READY') : chalk.red('○ DOWN');
  const statusFrontend = frontendReady ? chalk.green('● READY') : chalk.red('○ DOWN');

  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🤖 Prompt Testing System (Powered by Bun)              ║
║                                                           ║
║   Backend:   http://localhost:3000          ${statusBackend}     ║
║   Frontend:  http://localhost:5173          ${statusFrontend}     ║
║   API Docs:  http://localhost:3000/api                   ║
║                                                           ║
║   ⚡ Ultra-fast with Bun runtime                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`));

  if (!backendReady || !frontendReady) {
    console.log(chalk.red('⚠️  Some services didn\'t start in time. Check the logs above.\n'));
  }
}

showBanner();
