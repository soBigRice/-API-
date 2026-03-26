import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OilPriceCacheEntity } from './oil-price-cache.entity';
import { OilPriceController } from './oil-price.controller';
import { OilPriceService } from './oil-price.service';

@Module({
  imports: [
    // 全局读取 .env 配置。
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    // 注册油价缓存实体对应的 Repository。
    TypeOrmModule.forFeature([OilPriceCacheEntity]),
  ],
  controllers: [AppController, OilPriceController],
  providers: [AppService, OilPriceService],
})
export class AppModule {}
