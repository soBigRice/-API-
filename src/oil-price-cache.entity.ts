import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

// 油价缓存表：按 keyword 存储上游响应，避免频繁消耗上游额度。
@Entity({ name: 'oil_price_cache' })
@Unique(['keyword'])
export class OilPriceCacheEntity {
  // 自增主键。
  @PrimaryGeneratedColumn()
  id: number;

  // 城市关键字，唯一索引，作为缓存命中条件。
  @Column({ type: 'varchar', length: 100 })
  keyword: string;

  // 上游接口原始响应体。
  @Column({ type: 'simple-json' })
  data: unknown;

  // 记录创建时间。
  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  // 记录更新时间（用于判断缓存是否过期）。
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
