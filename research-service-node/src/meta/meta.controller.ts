import { Controller, Get } from '@nestjs/common';

const VERSION = process.env.SERVICE_VERSION ?? 'dev';
const START_TIME = Date.now();

@Controller()
export class MetaController {
  @Get('/health')
  health() {
    return { status: 'ok' };
  }

  @Get('/meta')
  meta() {
    const uptimeSeconds = (Date.now() - START_TIME) / 1000;

    return {
      service: 'research-service',
      status: 'ok',
      uptime_seconds: Math.round(uptimeSeconds * 100) / 100,
      version: VERSION,
    };
  }
}
