import { Injectable, Logger, Inject } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { OpenRouterService } from '@/infrastructure/llm/openrouter.service';

export interface AppSettings {
  OPENROUTER_API_KEY: string;
  DEFAULT_MODEL: string;
  DEFAULT_JUDGE_MODEL: string;
  PORT: string;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly rootDir: string;
  private readonly rootEnvPath: string;
  private readonly backendEnvPath: string;
  private isTestMode = process.env.NODE_ENV === 'test';

  constructor(@Inject(OpenRouterService) private readonly openRouter: OpenRouterService) {
    this.rootDir = this.findProjectRoot();
    const envSuffix = this.isTestMode ? '.env.test' : '.env';
    this.rootEnvPath = join(this.rootDir, envSuffix);
    this.backendEnvPath = join(this.rootDir, 'apps/backend', envSuffix);
  }

  private findProjectRoot(): string {
    let currentDir = import.meta.dir;
    // Go up until we find bun.lock or root package.json
    while (currentDir !== '/' && currentDir !== '.') {
      if (existsSync(join(currentDir, 'bun.lock')) || 
          (existsSync(join(currentDir, 'package.json')) && 
           JSON.parse(readFileSync(join(currentDir, 'package.json'), 'utf8')).name === '@llmunit/root')) {
        return currentDir;
      }
      currentDir = join(currentDir, '..');
    }
    // Fallback if not found (should not happen in dev)
    return process.cwd();
  }

  setTestMode(enabled: boolean) {
    this.isTestMode = enabled;
    const envSuffix = this.isTestMode ? '.env.test' : '.env';
    (this as any).rootEnvPath = join(this.rootDir, envSuffix);
    (this as any).backendEnvPath = join(this.rootDir, 'apps/backend', envSuffix);
  }

  async getModels() {
    return this.openRouter.getModels();
  }

  getSettings(): AppSettings {
    const settings: AppSettings = {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
      DEFAULT_MODEL: process.env.DEFAULT_MODEL || 'openai/gpt-oss-safeguard-20b',
      DEFAULT_JUDGE_MODEL: process.env.DEFAULT_JUDGE_MODEL || 'openai/gpt-oss-safeguard-20b',
      PORT: process.env.PORT || '3000',
    };

    if (existsSync(this.rootEnvPath)) {
      try {
        const content = readFileSync(this.rootEnvPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').replace(/^"(.*)"$/, '$1').trim();
          if (key && (settings as any)[key] !== undefined) {
            (settings as any)[key] = value;
          }
        }
      } catch (e) {
        this.logger.error('Error reading .env for settings display');
      }
    }
    return settings;
  }

  async updateSettings(settings: Partial<AppSettings>) {
    try {
      let content = '';
      if (existsSync(this.rootEnvPath)) {
        content = readFileSync(this.rootEnvPath, 'utf8');
      }

      const newSettings = { ...this.getSettings(), ...settings };

      // Simple regex replacement or append
      const keys = Object.keys(newSettings);
      let newContent = content;

      for (const key of keys) {
        const regex = new RegExp(`^${key}=.*`, 'm');
        const newValue = `${key}=${newSettings[key]}`;
        
        if (regex.test(newContent)) {
          newContent = newContent.replace(regex, newValue);
        } else {
          newContent += `\n${newValue}`;
        }
      }

      // Write to root
      writeFileSync(this.rootEnvPath, newContent.trim() + '\n', 'utf8');
      
      // Sync to backend env
      writeFileSync(this.backendEnvPath, newContent.trim() + '\n', 'utf8');

      this.logger.log(`Environment variables updated and synchronized (${this.isTestMode ? 'TEST' : 'PROD'}).`);
      
      // Note: process.env won't update automatically for the current process
      // until restart, but we can manually update them for the current session
      for (const key of keys) {
        process.env[key] = newSettings[key];
      }

      return this.getSettings();
    } catch (error: any) {
      this.logger.error(`Error updating settings: ${error.message}`);
      throw error;
    }
  }
}
