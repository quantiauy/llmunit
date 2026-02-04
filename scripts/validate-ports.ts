#!/usr/bin/env bun
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createServer } from 'net';

const rootDir = join(import.meta.dir, '..');
const envPath = join(rootDir, '.env');

// Cargar .env de forma manual para asegurar que es el del root
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;
    
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value;
    }
  });
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT || '5173', 10);

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true); // Other errors might not mean it's in use
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

console.log('🔍 Checking port availability...');

const backendAvailable = await isPortAvailable(PORT);
const frontendAvailable = await isPortAvailable(FRONTEND_PORT);

const portsInUse: number[] = [];

if (!backendAvailable) {
  console.error(`\n❌ ERROR: Backend port (${PORT}) is already in use.`);
  portsInUse.push(PORT);
} else {
  console.log(`✅ Backend port (${PORT}) is available.`);
}

if (!frontendAvailable) {
  console.error(`❌ ERROR: Frontend port (${FRONTEND_PORT}) is already in use.`);
  portsInUse.push(FRONTEND_PORT);
} else {
  console.log(`✅ Frontend port (${FRONTEND_PORT}) is available.`);
}

if (portsInUse.length > 0) {
  console.error('\n💡 HOW TO FIX THIS:');
  console.error('1. You can free up the ports by running:');
  const killCommand = `   kill -9 $(lsof -ti:${portsInUse.join(',')})`;
  console.error(`${killCommand}`);
  
  console.error('\n2. Or you can change the ports in your .env file:');
  console.error(`   PORT=${PORT} (Backend)`);
  console.error(`   FRONTEND_PORT=${FRONTEND_PORT} (Frontend)`);
  
  console.error('\n⚠️  Please resolve the conflict before continuing.');
  process.exit(1);
}

console.log('✨ All required ports are available.\n');
