import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  assignPanditSchema,
  createBenefitSchema,
  createCitySchema,
  createDeitySchema,
  createFestivalSchema,
  createPujaSchema,
  createProductSchema,
  createTempleSchema,
  panditProfileSchema,
  updateBenefitSchema,
  updateCitySchema,
  updateDeitySchema,
  updateFestivalSchema,
  updatePanditSchema,
  updatePujaSchema,
  updateProductSchema,
  updateTempleSchema,
  UserRole,
} from '@poozari/shared';
import { z } from 'zod';
import { CatalogService } from '../catalog/catalog.service';
import { Roles } from '../common/decorators';
import { RolesGuard } from '../common/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PanditsService } from '../pandits/pandits.service';
import { AdminService } from './admin.service';
import { AssignmentService } from './assignment.service';

const createPanditSchema = panditProfileSchema.extend({
  email: z.string().email(),
  password: z.string().min(8),
});

@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly assignment: AssignmentService,
    private readonly catalog: CatalogService,
    private readonly pandits: PanditsService,
  ) {}

  /* Dashboard + bookings */
  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('bookings')
  listBookings(@Query('status') status?: string) {
    return this.admin.listBookings(status);
  }

  @Get('bookings/unassigned')
  unassigned() {
    return this.admin.unassignedQueue();
  }

  @Post('bookings/:id/auto-assign')
  autoAssign(@Param('id') id: string) {
    return this.assignment.autoAssign(id);
  }

  @Post('bookings/:id/assign')
  assign(@Param('id') id: string, @Body(new ZodValidationPipe(assignPanditSchema)) body: any) {
    return this.assignment.manualAssign(id, body.panditId);
  }

  /* Pandits */
  @Get('pandits')
  listPandits() {
    return this.pandits.list();
  }

  @Post('pandits')
  createPandit(@Body(new ZodValidationPipe(createPanditSchema)) body: any) {
    return this.pandits.create(body);
  }

  @Patch('pandits/:id')
  updatePandit(@Param('id') id: string, @Body(new ZodValidationPipe(updatePanditSchema)) body: any) {
    return this.pandits.adminUpdate(id, body);
  }

  @Delete('pandits/:id')
  deletePandit(@Param('id') id: string) {
    return this.pandits.remove(id);
  }

  /* Products */
  @Get('products')
  listAllProducts() {
    return this.catalog.listProducts({ includeInactive: true });
  }

  @Post('products')
  createProduct(@Body(new ZodValidationPipe(createProductSchema)) body: any) {
    return this.catalog.createProduct(body);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: any,
  ) {
    return this.catalog.updateProduct(id, body);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.catalog.deleteProduct(id);
  }

  /* Catalog writes */
  @Get('pujas')
  listAllPujas() {
    // Admin sees every listing, including inactive/hidden ones.
    return this.catalog.listPujas({ includeInactive: true });
  }

  @Post('pujas')
  createPuja(@Body(new ZodValidationPipe(createPujaSchema)) body: any) {
    return this.catalog.createPuja(body);
  }

  @Patch('pujas/:id')
  updatePuja(@Param('id') id: string, @Body(new ZodValidationPipe(updatePujaSchema)) body: any) {
    return this.catalog.updatePuja(id, body);
  }

  @Delete('pujas/:id')
  deletePuja(@Param('id') id: string) {
    return this.catalog.deletePuja(id);
  }

  @Post('cities')
  createCity(@Body(new ZodValidationPipe(createCitySchema)) body: any) {
    return this.catalog.createCity(body);
  }

  @Patch('cities/:id')
  updateCity(@Param('id') id: string, @Body(new ZodValidationPipe(updateCitySchema)) body: any) {
    return this.catalog.updateCity(id, body);
  }

  @Delete('cities/:id')
  deleteCity(@Param('id') id: string) {
    return this.catalog.deleteCity(id);
  }

  @Post('temples')
  createTemple(@Body(new ZodValidationPipe(createTempleSchema)) body: any) {
    return this.catalog.createTemple(body);
  }

  @Patch('temples/:id')
  updateTemple(@Param('id') id: string, @Body(new ZodValidationPipe(updateTempleSchema)) body: any) {
    return this.catalog.updateTemple(id, body);
  }

  @Delete('temples/:id')
  deleteTemple(@Param('id') id: string) {
    return this.catalog.deleteTemple(id);
  }

  @Post('deities')
  createDeity(@Body(new ZodValidationPipe(createDeitySchema)) body: any) {
    return this.catalog.createDeity(body);
  }

  @Patch('deities/:id')
  updateDeity(@Param('id') id: string, @Body(new ZodValidationPipe(updateDeitySchema)) body: any) {
    return this.catalog.updateDeity(id, body);
  }

  @Delete('deities/:id')
  deleteDeity(@Param('id') id: string) {
    return this.catalog.deleteDeity(id);
  }

  @Post('festivals')
  createFestival(@Body(new ZodValidationPipe(createFestivalSchema)) body: any) {
    return this.catalog.createFestival(body);
  }

  @Patch('festivals/:id')
  updateFestival(@Param('id') id: string, @Body(new ZodValidationPipe(updateFestivalSchema)) body: any) {
    return this.catalog.updateFestival(id, body);
  }

  @Delete('festivals/:id')
  deleteFestival(@Param('id') id: string) {
    return this.catalog.deleteFestival(id);
  }

  @Post('benefits')
  createBenefit(@Body(new ZodValidationPipe(createBenefitSchema)) body: any) {
    return this.catalog.createBenefit(body);
  }

  @Patch('benefits/:id')
  updateBenefit(@Param('id') id: string, @Body(new ZodValidationPipe(updateBenefitSchema)) body: any) {
    return this.catalog.updateBenefit(id, body);
  }

  @Delete('benefits/:id')
  deleteBenefit(@Param('id') id: string) {
    return this.catalog.deleteBenefit(id);
  }
}
