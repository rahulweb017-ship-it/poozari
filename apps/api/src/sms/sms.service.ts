import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

/**
 * Fast2SMS integration (https://docs.fast2sms.com).
 * Uses the transactional `otp` route: no DLT template registration needed.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get<string>('FAST2SMS_API_KEY'));
  }

  /** Send a 6-digit login OTP to an Indian mobile number via Fast2SMS. */
  async sendOtp(phone: string, code: string): Promise<void> {
    const apiKey = this.config.get<string>('FAST2SMS_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('SMS provider is not configured');
    }

    const numbers = phone.replace(/\D/g, '').slice(-10);
    if (numbers.length !== 10) {
      throw new ServiceUnavailableException('Invalid mobile number for SMS delivery');
    }

    const response = await fetch(FAST2SMS_URL, {
      method: 'POST',
      headers: {
        // Fast2SMS expects the API key in the `authorization` header (not a Bearer token).
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: code,
        numbers,
        flash: 0,
      }),
    });

    const body = (await response.json().catch(() => null)) as {
      return?: boolean;
      message?: string | string[];
      status_code?: number;
    } | null;

    if (!response.ok || body?.return === false) {
      this.logger.error(
        `Fast2SMS OTP send failed (HTTP ${response.status}): ${JSON.stringify(body)}`,
      );
      throw new ServiceUnavailableException('Could not send the OTP SMS. Please try again.');
    }
  }
}
