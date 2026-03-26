import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // 返回基础文本，主要用于服务连通性验证。
  getHello(): string {
    return 'Hello World!';
  }
}
