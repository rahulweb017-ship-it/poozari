import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  createLiveSessionSchema,
  goLiveSchema,
  pushLiveCaptionSchema,
  updateLiveSessionSchema,
  UserRole,
} from '@poozari/shared';
import { CurrentUser, JwtPayload, Public, Roles } from '../common/decorators';
import { RolesGuard } from '../common/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LiveService } from './live.service';

/** Public live-darshan browsing. Detail endpoint optionally reads a bearer token to unlock the stream. */
@Controller('live')
export class LivePublicController {
  constructor(
    private readonly live: LiveService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Get()
  list(@Query('status') status?: 'live' | 'upcoming' | 'ended') {
    return this.live.listPublic(status);
  }

  @Public()
  @Get(':id/caption')
  getCaption(@Param('id') id: string) {
    return this.live.getCurrentCaption(id);
  }

  @Public()
  @Get(':id')
  async get(@Param('id') id: string, @Headers('authorization') auth?: string) {
    const customerId = await this.optionalCustomerId(auth);
    return this.live.getPublic(id, customerId);
  }

  /** Decode a bearer token if present; return the user id or undefined. */
  private async optionalCustomerId(auth?: string): Promise<string | undefined> {
    if (!auth?.startsWith('Bearer ')) return undefined;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(auth.slice(7));
      return payload.sub;
    } catch {
      return undefined;
    }
  }
}

/** Customer endpoints: buy a ticket and manage access. */
@UseGuards(RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('live')
export class LiveCustomerController {
  constructor(private readonly live: LiveService) {}

  @Post(':id/order')
  createOrder(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.live.createOrder(user.sub, id);
  }

  @Post(':id/verify')
  verify(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    return this.live.verifyAccess(user.sub, id, body);
  }

  @Get('me/access')
  myAccess(@CurrentUser() user: JwtPayload) {
    return this.live.myAccess(user.sub);
  }
}

/** Admin endpoints: full management of live sessions. */
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/live')
export class LiveAdminController {
  constructor(private readonly live: LiveService) {}

  @Get()
  list() {
    return this.live.adminList();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createLiveSessionSchema)) body: any) {
    return this.live.adminCreate(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateLiveSessionSchema)) body: any) {
    return this.live.adminUpdate(id, body);
  }

  @Post(':id/go-live')
  goLive(@Param('id') id: string, @Body(new ZodValidationPipe(goLiveSchema)) body: any) {
    return this.live.goLive(id, { role: 'admin' }, body?.playbackUrl);
  }

  @Post(':id/end')
  end(@Param('id') id: string) {
    return this.live.endLive(id, { role: 'admin' });
  }

  @Post(':id/captions')
  pushCaption(@Param('id') id: string, @Body(new ZodValidationPipe(pushLiveCaptionSchema)) body: any) {
    return this.live.pushCaption(id, body.translations, { role: 'admin' });
  }
}

/** Pandit endpoints: see own sessions and control broadcast. */
@UseGuards(RolesGuard)
@Roles(UserRole.PANDIT)
@Controller('pandit/live')
export class LivePanditController {
  constructor(private readonly live: LiveService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.live.panditList(user.sub);
  }

  @Post(':id/go-live')
  goLive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(goLiveSchema)) body: any,
  ) {
    return this.live.goLive(id, { role: 'pandit', userId: user.sub }, body?.playbackUrl);
  }

  @Post(':id/end')
  end(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.live.endLive(id, { role: 'pandit', userId: user.sub });
  }

  @Post(':id/captions')
  pushCaption(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(pushLiveCaptionSchema)) body: any,
  ) {
    return this.live.pushCaption(id, body.translations, { role: 'pandit', userId: user.sub });
  }
}
