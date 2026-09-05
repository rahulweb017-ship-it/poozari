import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { createBookingSchema, createReviewSchema, UserRole } from '@poozari/shared';
import { CurrentUser, JwtPayload, Roles } from '../common/decorators';
import { RolesGuard } from '../common/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { BookingsService } from './bookings.service';

@UseGuards(RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createBookingSchema)) body: any,
  ) {
    return this.bookings.create(user.sub, body);
  }

  @Get('me')
  myBookings(@CurrentUser() user: JwtPayload) {
    return this.bookings.listForCustomer(user.sub);
  }

  @Get(':id')
  getBooking(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookings.getForCustomer(user.sub, id);
  }

  @Post(':id/review')
  review(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createReviewSchema)) body: any,
  ) {
    return this.bookings.createReview(user.sub, id, body);
  }
}
