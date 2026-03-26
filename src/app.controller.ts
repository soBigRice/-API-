import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// 根路由：用于快速检查服务是否可访问。
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // GET /
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
