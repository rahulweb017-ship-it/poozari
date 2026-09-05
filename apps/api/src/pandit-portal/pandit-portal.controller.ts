import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  updateBookingStatusSchema,
  updatePanditAvailabilitySchema,
  updatePanditProfileSchema,
  uploadVideoSchema,
  UserRole,
} from '@poozari/shared';
import { CurrentUser, JwtPayload, Roles } from '../common/decorators';
import { RolesGuard } from '../common/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PanditPortalService } from './pandit-portal.service';

const VIDEO_MAX_BYTES = 500 * 1024 * 1024; // 500 MB

@UseGuards(RolesGuard)
@Roles(UserRole.PANDIT)
@Controller('pandit')
export class PanditPortalController {
  constructor(private readonly portal: PanditPortalService) {}

  @Get('profile')
  profile(@CurrentUser() user: JwtPayload) {
    return this.portal.getProfile(user.sub);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(updatePanditProfileSchema)) body: any,
  ) {
    return this.portal.updateProfile(user.sub, body);
  }

  @Patch('availability')
  setAvailability(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(updatePanditAvailabilitySchema)) body: any,
  ) {
    return this.portal.setAvailability(user.sub, body.isAvailable);
  }

  @Get('bookings')
  bookings(@CurrentUser() user: JwtPayload) {
    return this.portal.listBookings(user.sub);
  }

  @Patch('bookings/:id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBookingStatusSchema)) body: any,
  ) {
    return this.portal.updateStatus(user.sub, id, body.status);
  }

  @Post('bookings/:id/video')
  uploadVideo(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(uploadVideoSchema)) body: any,
  ) {
    return this.portal.uploadVideo(user.sub, id, body);
  }

  /** In-app recorded video upload (multipart form, field name "file"). */
  @Post('bookings/:id/video-file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: VIDEO_MAX_BYTES } }))
  uploadVideoFile(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No video file provided (field "file")');
    return this.portal.uploadVideoFile(user.sub, id, file);
  }
}
