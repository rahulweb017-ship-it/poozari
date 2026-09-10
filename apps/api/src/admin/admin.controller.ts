import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  assignPanditSchema,
  bulkImportSchema,
  createBenefitSchema,
  createBlogPostSchema,
  createCitySchema,
  createDeitySchema,
  createFestivalSchema,
  createPujaSchema,
  currencyRateSchema,
  createProductSchema,
  createTempleSchema,
  panditProfileSchema,
  updateBenefitSchema,
  updateBlogPostSchema,
  updateInquirySchema,
  updatePanditApplicationSchema,
  updateCitySchema,
  updateDeitySchema,
  updateFestivalSchema,
  updatePanditSchema,
  updateCurrencyRateSchema,
  updatePujaSchema,
  updateProductSchema,
  updateTempleSchema,
  UserRole,
} from '@poozari/shared';
import { z } from 'zod';
import { CatalogService } from '../catalog/catalog.service';
import { ContentService } from '../content/content.service';
import { CurrencyService } from '../currency/currency.service';
import { EmailService } from '../email/email.service';
import { Roles } from '../common/decorators';
import { RolesGuard } from '../common/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PanditsService } from '../pandits/pandits.service';
import { LocalDiskStorage } from '../storage/storage.service';
import { AdminService } from './admin.service';
import { AssignmentService } from './assignment.service';
import { BulkImportService } from './bulk-import.service';

/** Cover images are for the web, not print: 5 MB is generous. */
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Extensions the storage layer will keep as-is (anything else becomes .bin). */
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const IMAGE_MIME_PREFIX = 'image/';

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
    private readonly bulkImport: BulkImportService,
    private readonly catalog: CatalogService,
    private readonly content: ContentService,
    private readonly currency: CurrencyService,
    private readonly email: EmailService,
    private readonly pandits: PanditsService,
    private readonly storage: LocalDiskStorage,
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

  /**
   * Image upload for the admin forms (multipart, field name "file").
   *
   * Returns the public path to drop straight into an `imageUrl` field. Both the
   * MIME type and the extension are checked: the browser-supplied MIME alone is
   * trivially spoofed, and the extension alone says nothing about the bytes.
   */
  @Post('uploads/image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMAGE_MAX_BYTES } }))
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No image provided (field "file")');
    if (!file.mimetype?.startsWith(IMAGE_MIME_PREFIX)) {
      throw new BadRequestException('That file is not an image');
    }
    const ext = (file.originalname.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      throw new BadRequestException('Use a JPG, PNG or WebP image');
    }
    const url = await this.storage.savePublicFile(file.buffer, file.originalname);
    return { url };
  }

  /**
   * Email diagnostics. `verify` authenticates against the SMTP server without
   * sending anything, which separates a credentials problem from a delivery
   * one; POST sends a real test message to NOTIFY_EMAIL.
   */
  @Get('email/status')
  async emailStatus() {
    const verification = await this.email.verify();
    return {
      configured: this.email.isConfigured,
      host: this.email.host ?? null,
      from: this.email.from,
      notifyAddress: this.email.notifyAddress ?? null,
      ...verification,
    };
  }

  @Post('email/test')
  async sendTestEmail() {
    const to = this.email.notifyAddress;
    if (!to) {
      throw new BadRequestException('No NOTIFY_EMAIL or SMTP_USER is configured to send to');
    }
    const sent = await this.email.send({
      to,
      subject: '[poozari] Test email',
      text: [
        'This is a test message from the poozari.com admin panel.',
        '',
        'If you are reading it, outgoing email is working: enquiries, pujari',
        'applications, booking confirmations and pooja-video notices will all',
        'be delivered.',
      ].join('\n'),
    });
    if (!sent) {
      throw new BadRequestException(
        'The mail server rejected the message. Check the API log for the reason.',
      );
    }
    return { ok: true, to };
  }

  /* Blog */
  @Get('blog')
  listAllPosts() {
    return this.content.listAllPosts();
  }

  @Post('blog')
  createPost(@Body(new ZodValidationPipe(createBlogPostSchema)) body: any) {
    return this.content.createPost(body);
  }

  @Patch('blog/:id')
  updatePost(@Param('id') id: string, @Body(new ZodValidationPipe(updateBlogPostSchema)) body: any) {
    return this.content.updatePost(id, body);
  }

  @Delete('blog/:id')
  deletePost(@Param('id') id: string) {
    return this.content.deletePost(id);
  }

  /* Contact Us + puja enquiry inbox */
  @Get('inquiries')
  listInquiries(@Query('kind') kind?: string, @Query('status') status?: string) {
    return this.content.listInquiries({ kind, status });
  }

  @Patch('inquiries/:id')
  updateInquiry(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInquirySchema)) body: any,
  ) {
    return this.content.updateInquiry(id, body);
  }

  /* "Become a Pujari" applications */
  @Get('pandit-applications')
  listApplications(@Query('status') status?: string) {
    return this.content.listApplications(status);
  }

  @Patch('pandit-applications/:id')
  updateApplication(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePanditApplicationSchema)) body: any,
  ) {
    return this.content.updateApplication(id, body);
  }

  /* Display currencies (FX is display-only; charges stay in INR) */
  @Get('currencies')
  listCurrencies() {
    return this.currency.listAll();
  }

  @Post('currencies')
  upsertCurrency(@Body(new ZodValidationPipe(currencyRateSchema)) body: any) {
    return this.currency.upsert(body);
  }

  @Patch('currencies/:code')
  updateCurrency(
    @Param('code') code: string,
    @Body(new ZodValidationPipe(updateCurrencyRateSchema)) body: any,
  ) {
    return this.currency.update(code, body);
  }

  @Delete('currencies/:code')
  deleteCurrency(@Param('code') code: string) {
    return this.currency.remove(code);
  }

  /* Bulk CSV import */
  @Post('import/pujas')
  importPujas(@Body(new ZodValidationPipe(bulkImportSchema)) body: any) {
    return this.bulkImport.importPujas(body);
  }

  @Post('import/pandits')
  importPandits(@Body(new ZodValidationPipe(bulkImportSchema)) body: any) {
    return this.bulkImport.importPandits(body);
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
