import { Controller, Get, Param, Query } from '@nestjs/common';
import { OilPriceService } from './oil-price.service';

// 油价聚合接口：兼容路径参数和 query 参数两种调用方式。
@Controller('oilprice')
export class OilPriceController {
  constructor(private readonly oilPriceService: OilPriceService) {}

  // GET /oilprice/:keyword
  @Get(':keyword')
  async getOilPriceByPath(@Param('keyword') keyword: string) {
    return this.oilPriceService.getOilPrice(keyword);
  }

  // GET /oilprice?keyword=xxx
  @Get()
  async getOilPriceByQuery(@Query('keyword') keyword?: string) {
    return this.oilPriceService.getOilPrice(keyword ?? '');
  }
}
