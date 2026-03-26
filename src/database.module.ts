import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './database.config';

@Module({
  imports: [
    // 把 database 命名空间配置注入到 ConfigService。
    ConfigModule.forFeature(databaseConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forFeature(databaseConfig)],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        url: configService.get('database.url'),
        // 自动加载实体，避免手动维护实体列表。
        autoLoadEntities: true,
        // 开发期自动同步表结构；生产环境建议关闭并使用迁移。
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
