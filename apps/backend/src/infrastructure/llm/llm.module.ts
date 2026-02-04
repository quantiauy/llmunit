import { Module, Global } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';
import { LLMEvaluator } from './llm-evaluator.service';

@Global()
@Module({
  providers: [OpenRouterService, LLMEvaluator],
  exports: [OpenRouterService, LLMEvaluator],
})
export class LLMModule {}
