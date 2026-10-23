import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { ApplicationStatus, type ApproveApplicationResult } from '@poozari/shared';
import { randomBytes } from 'crypto';
import { ContentService } from '../content/content.service';
import { EmailService } from '../email/email.service';
import { panditWelcome } from '../email/email.templates';
import { PanditsService } from '../pandits/pandits.service';
import { PrismaService } from '../prisma/prisma.service';

/** Turns a "Become a Pujari" application into a working pandit login. */
@Injectable()
export class ApplicationApprovalService {
  private readonly logger = new Logger(ApplicationApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pandits: PanditsService,
    private readonly content: ContentService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async approve(id: string): Promise<ApproveApplicationResult> {
    const application = await this.prisma.panditApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('Application not found');
    if (application.panditUserId) {
      throw new ConflictException('This application already has a pujari account');
    }

    const email = application.email.trim().toLowerCase();
    const phone = application.phone.trim();
    const [emailUser, phoneUser, phoneProfile] = await Promise.all([
      this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } }),
      this.prisma.user.findUnique({ where: { phone } }),
      this.prisma.panditProfile.findFirst({ where: { phone } }),
    ]);
    if (emailUser) throw new ConflictException('An account with this email already exists');
    if (phoneUser || phoneProfile) {
      throw new ConflictException('An account with this phone number already exists');
    }

    const tempPassword = randomBytes(9).toString('base64url');
    let profile: { id: string; userId: string } | null;
    try {
      profile = await this.pandits.create({
        email,
        password: tempPassword,
        displayName: application.fullName,
        bio: application.about,
        phone,
        experienceYears: application.experienceYears,
        specializations: application.specializations,
        serviceCityIds: [],
        servicePincodes: /^\d{6}$/.test(application.pincode) ? [application.pincode] : [],
        isAvailable: true,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('An account with this email or phone already exists');
      }
      throw err;
    }
    if (!profile) throw new Error('Pandit profile was not created');

    await this.prisma.panditApplication.update({
      where: { id },
      data: { status: ApplicationStatus.APPROVED, panditUserId: profile.userId },
    });

    const webBase = (this.config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    let emailSent = false;
    try {
      emailSent = await this.email.send({
        to: email,
        ...panditWelcome({
          name: application.fullName,
          email,
          tempPassword,
          loginUrl: `${webBase}/pandit/login`,
        }),
      });
    } catch (err) {
      this.logger.warn(`Welcome email to new pujari failed: ${(err as Error).message}`);
    }

    return { panditId: profile.id, userId: profile.userId, email, tempPassword, emailSent };
  }

  async reject(id: string, reason: string) {
    const application = await this.prisma.panditApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('Application not found');
    const note = reason ? `Rejected: ${reason}` : '';
    const adminNotes = [application.adminNotes, note].filter(Boolean).join('\n\n');
    return this.content.updateApplication(id, {
      status: ApplicationStatus.REJECTED,
      adminNotes,
    });
  }
}
