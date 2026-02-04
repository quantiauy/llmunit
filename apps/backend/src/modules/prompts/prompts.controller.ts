import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PromptsService } from './prompts.service';

@ApiTags('prompts')
@Controller('api/v1/prompts')
export class PromptsController {
  constructor(@Inject(PromptsService) private readonly promptsService: PromptsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all prompts' })
  async findAll() {
    return this.promptsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get prompt by ID' })
  async findOne(@Param('id') id: string) {
    return this.promptsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new prompt' })
  async create(@Body() data: any) {
    return this.promptsService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update prompt' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.promptsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete prompt' })
  async delete(@Param('id') id: string) {
    await this.promptsService.delete(id);
  }
}
