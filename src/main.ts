import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 默认端口 3000，可通过 PORT 环境变量覆盖。
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
