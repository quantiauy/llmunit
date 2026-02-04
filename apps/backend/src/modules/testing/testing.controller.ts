import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TestingService } from './testing.service';

@ApiTags('testing')
@Controller('api/v1/testing')
export class TestingController {
  constructor(private readonly testingService: TestingService) {}

  @Post(':testCaseId/execute')
  @ApiOperation({ summary: 'Execute a test case' })
  async execute(
    @Param('testCaseId') testCaseId: string,
    @Body() body: { model?: string; judgeModel?: string }
  ) {
    const executionId = await this.testingService.executeTestCase(
      testCaseId,
      body.model,
      body.judgeModel
    );
    return { executionId };
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get execution status and results' })
  async getExecution(@Param('id') id: string) {
    return this.testingService.getExecution(id);
  }

  @Get('history/:testCaseId')
  @ApiOperation({ summary: 'Get execution history for a test case' })
  async getHistory(@Param('testCaseId') testCaseId: string) {
    return this.testingService.getHistory(testCaseId);
  }
}
