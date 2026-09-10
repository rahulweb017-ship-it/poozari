import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import { CurrencyService } from './currency.service';

@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currency: CurrencyService) {}

  /** Public: what the currency switcher offers a visitor. */
  @Public()
  @Get()
  list() {
    return this.currency.listActive();
  }
}
