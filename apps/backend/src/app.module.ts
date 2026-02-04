import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { LLMModule } from './infrastructure/llm/llm.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { TestingModule } from './modules/testing/testing.module';
import { SettingsModule } from './modules/settings/settings.module';

import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, LLMModule, PromptsModule, TestingModule, SettingsModule],
  controllers: [HealthController],
})
export class AppModule {}
