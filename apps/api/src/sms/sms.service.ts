import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * OTP delivery over SMS.
 *
 * Providers are selected with `SMS_PROVIDER`; each needs its own credentials.
 * Adding another provider means one more `case` in `send()` — nothing above
 * this service knows or cares which one is in use.
 *
 *   SMS_PROVIDER=fast2sms   FAST2SMS_API_KEY
 *   SMS_PROVIDER=msg91      MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, [MSG91_SENDER_ID]
 *   SMS_PROVIDER=twilio     TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 *   SMS_PROVIDER=log        writes the code to the server log (local only)
 */
export type SmsProvider = 'fast2sms' | 'msg91' | 'twilio' | 'log';

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';
const MSG91_URL = 'https://control.msg91.com/api/v5/flow/';
const TWILIO_URL = (sid: string) =>
  `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  get provider(): SmsProvider {
    const configured = (this.config.get<string>('SMS_PROVIDER') ?? '').toLowerCase();
    if (configured === 'msg91' || configured === 'twilio' || configured === 'log') {
      return configured;
    }
    if (configured === 'fast2sms') return 'fast2sms';
    // No explicit choice: fall back to whichever credentials are present.
    if (this.config.get<string>('FAST2SMS_API_KEY')) return 'fast2sms';
    if (this.config.get<string>('MSG91_AUTH_KEY')) return 'msg91';
    if (this.config.get<string>('TWILIO_ACCOUNT_SID')) return 'twilio';
    return 'log';
  }

  /** True when the selected provider can actually deliver a message. */
  get isConfigured(): boolean {
    switch (this.provider) {
      case 'fast2sms':
        return Boolean(this.config.get<string>('FAST2SMS_API_KEY'));
      case 'msg91':
        return Boolean(
          this.config.get<string>('MSG91_AUTH_KEY') && this.config.get<string>('MSG91_TEMPLATE_ID'),
        );
      case 'twilio':
        return Boolean(
          this.config.get<string>('TWILIO_ACCOUNT_SID') &&
            this.config.get<string>('TWILIO_AUTH_TOKEN') &&
            this.config.get<string>('TWILIO_FROM'),
        );
      case 'log':
        return true;
    }
  }

  /** Last 10 digits — what Indian providers expect. */
  private toLocalNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      throw new ServiceUnavailableException('Invalid mobile number for SMS delivery');
    }
    return digits;
  }

  /** Send a 6-digit login OTP. Throws if the provider rejects it. */
  async sendOtp(phone: string, code: string): Promise<void> {
    const provider = this.provider;
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        `SMS provider "${provider}" is selected but its credentials are missing`,
      );
    }

    switch (provider) {
      case 'fast2sms':
        return this.sendViaFast2Sms(phone, code);
      case 'msg91':
        return this.sendViaMsg91(phone, code);
      case 'twilio':
        return this.sendViaTwilio(phone, code);
      case 'log':
        // Local development without credentials. Never reached in production
        // unless SMS_PROVIDER is explicitly set to "log".
        this.logger.warn(`[SMS:log] OTP for ${phone} is ${code}`);
        return;
    }
  }

  /** Fast2SMS transactional `otp` route — no DLT template registration needed. */
  private async sendViaFast2Sms(phone: string, code: string): Promise<void> {
    const response = await fetch(FAST2SMS_URL, {
      method: 'POST',
      headers: {
        // Fast2SMS wants the raw key in `authorization`, not a Bearer token.
        authorization: this.config.get<string>('FAST2SMS_API_KEY') as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: code,
        numbers: this.toLocalNumber(phone),
        flash: 0,
      }),
    });

    const body = (await response.json().catch(() => null)) as { return?: boolean } | null;
    if (!response.ok || body?.return === false) {
      this.fail('Fast2SMS', response.status, body);
    }
  }

  /** MSG91 Flow API. `MSG91_TEMPLATE_ID` must be a DLT-approved OTP template. */
  private async sendViaMsg91(phone: string, code: string): Promise<void> {
    const senderId = this.config.get<string>('MSG91_SENDER_ID');
    const response = await fetch(MSG91_URL, {
      method: 'POST',
      headers: {
        authkey: this.config.get<string>('MSG91_AUTH_KEY') as string,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        template_id: this.config.get<string>('MSG91_TEMPLATE_ID'),
        ...(senderId ? { sender: senderId } : {}),
        short_url: 0,
        recipients: [
          {
            // MSG91 expects the country code.
            mobiles: `91${this.toLocalNumber(phone)}`,
            // The template's variable must be named OTP.
            OTP: code,
          },
        ],
      }),
    });

    const body = (await response.json().catch(() => null)) as { type?: string } | null;
    if (!response.ok || body?.type === 'error') {
      this.fail('MSG91', response.status, body);
    }
  }

  /** Twilio Programmable SMS — the usual choice for numbers outside India. */
  private async sendViaTwilio(phone: string, code: string): Promise<void> {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID') as string;
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN') as string;
    const from = this.config.get<string>('TWILIO_FROM') as string;
    // Twilio needs E.164; assume India unless the caller already gave a +code.
    const to = phone.trim().startsWith('+') ? phone.trim() : `+91${this.toLocalNumber(phone)}`;

    const response = await fetch(TWILIO_URL(sid), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: `${code} is your poozari.com verification code. It expires in 5 minutes. Do not share it with anyone.`,
      }),
    });

    if (!response.ok) {
      this.fail('Twilio', response.status, await response.json().catch(() => null));
    }
  }

  /** Log the provider's own error, but never leak it to the caller. */
  private fail(provider: string, status: number, body: unknown): never {
    this.logger.error(`${provider} OTP send failed (HTTP ${status}): ${JSON.stringify(body)}`);
    throw new ServiceUnavailableException('Could not send the OTP SMS. Please try again.');
  }
}
