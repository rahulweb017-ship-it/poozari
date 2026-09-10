import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  /** Plain-text body. Always provide it: some clients show nothing else. */
  text: string;
  /** Optional HTML body. */
  html?: string;
  /** Where a reply should go — e.g. the devotee who sent an enquiry. */
  replyTo?: string;
}

/**
 * Outgoing email over SMTP.
 *
 * Everything is configured through `SMTP_*` env vars; with none set the service
 * simply logs what it would have sent, so local development and tests never
 * try to reach a mail server.
 *
 * Sends are **fire-and-forget by design** at the call sites: a booking must not
 * fail because a mail server was briefly unreachable. `send()` therefore
 * resolves to a boolean rather than throwing, and logs its own failures.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  get host(): string | undefined {
    return this.config.get<string>('SMTP_HOST');
  }

  /** Address messages are sent from. Defaults to the SMTP user. */
  get from(): string {
    const configured = this.config.get<string>('SMTP_FROM');
    if (configured) return configured;
    const user = this.config.get<string>('SMTP_USER') ?? 'no-reply@localhost';
    return `poozari.com <${user}>`;
  }

  /** Where site notifications (enquiries, applications) are delivered. */
  get notifyAddress(): string | undefined {
    return this.config.get<string>('NOTIFY_EMAIL') ?? this.config.get<string>('SMTP_USER');
  }

  get isConfigured(): boolean {
    return Boolean(
      this.host && this.config.get<string>('SMTP_USER') && this.config.get<string>('SMTP_PASSWORD'),
    );
  }

  onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD) — emails will be logged, not sent.',
      );
      return;
    }
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 465);
    this.transporter = nodemailer.createTransport({
      host: this.host,
      port,
      // 465 is implicit TLS; 587 starts plaintext and upgrades with STARTTLS.
      secure: port === 465,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASSWORD'),
      },
    });
    this.logger.log(`SMTP ready: ${this.host}:${port} as ${this.config.get<string>('SMTP_USER')}`);
  }

  /**
   * Check the credentials against the server without sending anything.
   * Used by the admin "test email" endpoint to separate an auth problem from
   * a delivery problem.
   */
  async verify(): Promise<{ ok: boolean; detail: string }> {
    if (!this.transporter) {
      return { ok: false, detail: 'SMTP is not configured on this server' };
    }
    try {
      await this.transporter.verify();
      return { ok: true, detail: `Connected to ${this.host} and authenticated` };
    } catch (error: any) {
      this.logger.error(`SMTP verify failed: ${error?.message ?? error}`);
      return { ok: false, detail: error?.message ?? 'Could not connect to the mail server' };
    }
  }

  /** Send a message. Never throws — returns false and logs on failure. */
  async send(options: SendEmailOptions): Promise<boolean> {
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    if (!to) return false;

    if (!this.transporter) {
      this.logger.log(`[email:log] to=${to} subject="${options.subject}"`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
      });
      this.logger.log(`sent "${options.subject}" to ${to} (${info.messageId})`);
      return true;
    } catch (error: any) {
      // Logged, not thrown: the booking or enquiry it accompanies has already
      // been saved, and losing the notification must not lose the record.
      this.logger.error(`email to ${to} failed: ${error?.message ?? error}`);
      return false;
    }
  }
}
