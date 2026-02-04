#!/usr/bin/env bun
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

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

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey || apiKey === 'your_key_here' || apiKey === 'sk-or-v1-ERROR') {
  console.error(`\n❌ ERROR: OPENROUTER_API_KEY is not configured or is invalid in ${envPath}`);
  console.error('Please edit the .env file and add a valid OpenRouter API Key.');
  process.exit(1);
}

console.log(`🔍 Validating OPENROUTER_API_KEY (from ${envPath})...`);

try {
  const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (response.ok) {
    const json = await response.json() as any;
    console.log('✅ OPENROUTER_API_KEY is valid!');
    if (json.data?.label) {
      console.log(`👤 Identified as: ${json.data.label}`);
    }
  } else {
    const errorText = await response.text();
    console.error(`\n❌ ERROR: Could not validate OPENROUTER API Key`);
    console.error(`Status: ${response.status} ${response.statusText}`);
    try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
            console.error(`Message: ${errorJson.error.message}`);
        }
    } catch (e) {
        console.error(`Response: ${errorText}`);
    }
    process.exit(1);
  }
} catch (err) {
  console.error('\n❌ ERROR: Failed to connect to OpenRouter');
  console.error(err);
  process.exit(1);
}
