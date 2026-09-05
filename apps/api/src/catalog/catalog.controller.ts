import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators';
import { CatalogService, ProductFilter, PujaFilter } from './catalog.service';

/** Public, read-only catalog endpoints powering the customer-facing site. */
@Public()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('pujas')
  listPujas(@Query() query: PujaFilter) {
    return this.catalog.listPujas(query);
  }

  @Get('pujas/:slug')
  getPuja(@Param('slug') slug: string) {
    return this.catalog.getPujaBySlug(slug);
  }

  @Get('cities')
  listCities() {
    return this.catalog.listCities();
  }

  @Get('temples')
  listTemples() {
    return this.catalog.listTemples();
  }

  @Get('deities')
  listDeities() {
    return this.catalog.listDeities();
  }

  @Get('festivals')
  listFestivals() {
    return this.catalog.listFestivals();
  }

  @Get('benefits')
  listBenefits() {
    return this.catalog.listBenefits();
  }

  @Get('products')
  listProducts(@Query() query: ProductFilter) {
    return this.catalog.listProducts(query);
  }

  @Get('products/:slug')
  getProduct(@Param('slug') slug: string) {
    return this.catalog.getProductBySlug(slug);
  }
}
