import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  createContactSchema,
  createEnquirySchema,
  createPanditApplicationSchema,
} from '@poozari/shared';
import { Public } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ContentService } from './content.service';

/** Public content endpoints: the blog, and the three site forms. */
@Public()
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  /* Blog */
  @Get('blog')
  listPosts(@Query('category') category?: string) {
    return this.content.listPublishedPosts(category);
  }

  @Get('blog/categories')
  listCategories() {
    return this.content.listPostCategories();
  }

  @Get('blog/:slug')
  getPost(@Param('slug') slug: string) {
    return this.content.getPublishedPost(slug);
  }

  /* Forms */
  @Post('contact')
  contact(@Body(new ZodValidationPipe(createContactSchema)) body: any) {
    return this.content.createContact(body);
  }

  @Post('enquiries')
  enquiry(@Body(new ZodValidationPipe(createEnquirySchema)) body: any) {
    return this.content.createEnquiry(body);
  }

  @Post('pandit-applications')
  apply(@Body(new ZodValidationPipe(createPanditApplicationSchema)) body: any) {
    return this.content.createApplication(body);
  }
}
