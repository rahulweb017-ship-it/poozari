import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_CURRENCIES,
  type Currency,
  type CurrencyRateInput,
  type UpdateCurrencyRateInput,
} from '@poozari/shared';
import { PrismaService } from '../prisma/prisma.service';

function serialize(rate: {
  code: string;
  label: string;
  symbol: string;
  ratePerInr: number;
  locale: string;
  decimals: number;
  isActive: boolean;
  sortOrder: number;
}): Currency {
  return {
    code: rate.code,
    label: rate.label,
    symbol: rate.symbol,
    ratePerInr: rate.ratePerInr,
    locale: rate.locale,
    decimals: rate.decimals,
    isActive: rate.isActive,
    sortOrder: rate.sortOrder,
  };
}

/**
 * Display-only FX rates.
 *
 * Nothing here touches what a customer is charged — every amount in this
 * codebase is INR and Razorpay bills INR. These rates decide what a reader
 * *sees* on a price tag, and the Super Admin maintains them by hand.
 */
@Injectable()
export class CurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public list: active currencies only, INR first. */
  async listActive(): Promise<Currency[]> {
    const rates = await this.prisma.currencyRate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    // An empty table would leave the site with no prices at all, so fall back
    // to the built-in defaults until an admin saves real ones.
    if (rates.length === 0) return DEFAULT_CURRENCIES.filter((c) => c.isActive);
    return rates.map(serialize);
  }

  async listAll(): Promise<Currency[]> {
    const rates = await this.prisma.currencyRate.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    if (rates.length === 0) return DEFAULT_CURRENCIES;
    return rates.map(serialize);
  }

  /** Create or replace a rate, keyed on the ISO code. */
  async upsert(input: CurrencyRateInput): Promise<Currency> {
    if (input.code === 'INR' && input.ratePerInr !== 1) {
      throw new BadRequestException('INR is the base currency — its rate must stay 1.');
    }
    const rate = await this.prisma.currencyRate.upsert({
      where: { code: input.code },
      create: input,
      update: input,
    });
    return serialize(rate);
  }

  async update(code: string, input: UpdateCurrencyRateInput): Promise<Currency> {
    const upper = code.toUpperCase();
    if (upper === 'INR' && input.ratePerInr !== undefined && input.ratePerInr !== 1) {
      throw new BadRequestException('INR is the base currency — its rate must stay 1.');
    }
    try {
      const rate = await this.prisma.currencyRate.update({ where: { code: upper }, data: input });
      return serialize(rate);
    } catch {
      throw new NotFoundException(`Currency ${upper} not found`);
    }
  }

  async remove(code: string) {
    const upper = code.toUpperCase();
    if (upper === 'INR') {
      throw new BadRequestException('INR is the base currency and cannot be removed.');
    }
    try {
      await this.prisma.currencyRate.delete({ where: { code: upper } });
      return { ok: true as const };
    } catch {
      throw new NotFoundException(`Currency ${upper} not found`);
    }
  }

  /** Write the built-in defaults into an empty table (used by the seed). */
  async seedDefaults() {
    for (const currency of DEFAULT_CURRENCIES) {
      await this.prisma.currencyRate.upsert({
        where: { code: currency.code },
        create: currency,
        update: {},
      });
    }
    return this.listAll();
  }
}
