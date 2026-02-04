import { Controller, Get, Put, Body, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettingsService, AppSettings } from './settings.service';

@ApiTags('settings')
@Controller('api/v1/settings')
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current environment settings' })
  getSettings() {
    const settings = this.settingsService.getSettings();
    // Mask API key for security in response
    return {
      ...settings,
      OPENROUTER_API_KEY: settings.OPENROUTER_API_KEY 
        ? `${settings.OPENROUTER_API_KEY.substring(0, 10)}...${settings.OPENROUTER_API_KEY.substring(settings.OPENROUTER_API_KEY.length - 4)}`
        : '',
      IS_KEY_SET: !!settings.OPENROUTER_API_KEY
    };
  }

  @Get('models')
  @ApiOperation({ summary: 'Get available models from OpenRouter' })
  async getModels() {
    return this.settingsService.getModels();
  }

  @Put()
  @ApiOperation({ summary: 'Update environment settings' })
  async updateSettings(@Body() settings: Partial<AppSettings>) {
    return this.settingsService.updateSettings(settings);
  }
}
