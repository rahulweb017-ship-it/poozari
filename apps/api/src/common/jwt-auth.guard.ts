import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@poozari/shared';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY, JwtPayload } from './decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length);
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { panditProfile: { select: { isActive: true } } },
      });
      if (!user || user.role !== payload.role) {
        throw new UnauthorizedException('Account is no longer available');
      }
      if (user.role === UserRole.PANDIT && !user.panditProfile?.isActive) {
        throw new UnauthorizedException(
          'Your pandit profile has been deactivated by the administrator',
        );
      }
      request.user = {
        sub: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
      } satisfies JwtPayload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
