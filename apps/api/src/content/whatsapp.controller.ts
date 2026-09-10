import { Body, Controller, Post } from '@nestjs/common';
import { createWhatsappLeadSchema } from '@poozari/shared';
import { CurrentUser, type JwtPayload } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ContentService } from './content.service';

/**
 * Records that a devotee set off to book over WhatsApp.
 *
 * Deliberately **not** `@Public()`: the global JWT guard therefore rejects
 * anonymous callers, which is what we want. Without a signed-in user we have
 * no number to follow up on, and an inbox full of contactless clicks would
 * bury the messages that can actually be answered.
 *
 * The web app calls this fire-and-forget — WhatsApp opens whether or not this
 * succeeds, because a failed log must never cost a booking.
 */
@Controller('whatsapp-leads')
export class WhatsappController {
  constructor(private readonly content: ContentService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createWhatsappLeadSchema)) body: any,
  ) {
    return this.content.createWhatsappLead(user, body);
  }
}
