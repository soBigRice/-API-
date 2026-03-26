import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OilPriceCacheEntity } from './oil-price-cache.entity';

type OilPriceDataSource = 'api' | 'database';

const DEFAULT_OILPRICE_API_URL =
  'https://api.istero.com/resource/v2/oilprice';

export interface OilPricePayload {
  keyword: string;
  source: OilPriceDataSource;
  updatedAt: Date;
  data: unknown;
}

@Injectable()
export class OilPriceService {
  // 缓存有效期：24 小时。
  private static readonly ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
  // 上游油价接口地址。
  private readonly oilPriceApiUrl: string;
  // 上游油价接口 token。
  private readonly oilPriceApiToken: string;

  constructor(
    @InjectRepository(OilPriceCacheEntity)
    private readonly oilPriceRepository: Repository<OilPriceCacheEntity>,
    private readonly configService: ConfigService,
  ) {
    // 数据来源（上游）：api.istero.com 油价接口。
    this.oilPriceApiUrl =
      this.configService.get<string>('OILPRICE_API_URL') ??
      DEFAULT_OILPRICE_API_URL;

    const configuredToken = this.configService
      .get<string>('OILPRICE_API_TOKEN')
      ?.trim();
    if (!configuredToken) {
      throw new Error(
        'Missing OILPRICE_API_TOKEN. Configure it in environment variables before startup.',
      );
    }
    this.oilPriceApiToken = configuredToken;
  }

  // 对外统一查询入口：先读缓存，缓存过期再回源。
  async getOilPrice(keywordInput: string): Promise<OilPricePayload> {
    const keyword = keywordInput?.trim();
    if (!keyword) {
      throw new BadRequestException('keyword is required');
    }

    const cached = await this.oilPriceRepository.findOne({
      where: { keyword },
    });

    // 命中缓存且未过期，直接返回数据库结果。
    if (cached && !this.isExpired(cached.updatedAt)) {
      return {
        keyword,
        source: 'database',
        updatedAt: cached.updatedAt,
        data: cached.data,
      };
    }

    // 未命中缓存或缓存过期：调用上游接口并写回数据库。
    const latestData = await this.fetchOilPriceFromApi(keyword);
    // 有旧记录则更新，无旧记录则创建。
    const entity =
      cached ??
      this.oilPriceRepository.create({
        keyword,
      });

    entity.data = latestData;
    const saved = await this.oilPriceRepository.save(entity);

    return {
      keyword,
      source: 'api',
      updatedAt: saved.updatedAt,
      data: saved.data,
    };
  }

  // 根据更新时间判断缓存是否过期。
  private isExpired(updatedAt: Date): boolean {
    return Date.now() - updatedAt.getTime() >= OilPriceService.ONE_DAY_IN_MS;
  }

  // 调用上游油价接口；非 2xx 状态时统一抛出 502。
  private async fetchOilPriceFromApi(keyword: string): Promise<unknown> {
    const response = await fetch(this.oilPriceApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.oilPriceApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyword }),
    });

    // 先读文本，兼容上游返回非 JSON 的情况。
    const rawResponseBody = await response.text();
    let parsedResponseBody: unknown = rawResponseBody;

    if (rawResponseBody) {
      try {
        parsedResponseBody = JSON.parse(rawResponseBody);
      } catch {
        parsedResponseBody = rawResponseBody;
      }
    }

    if (!response.ok) {
      throw new BadGatewayException({
        message: 'Failed to fetch oil price data from upstream API',
        statusCode: response.status,
        responseBody: parsedResponseBody,
      });
    }

    return parsedResponseBody;
  }
}
