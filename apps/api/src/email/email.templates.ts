import { formatInr } from '@poozari/shared';
import type { SendEmailOptions } from './email.service';

/**
 * Message bodies, kept apart from delivery so the wording can be reviewed
 * without touching transport code.
 *
 * Plain text only, deliberately: these are short transactional notes, HTML
 * would add nothing, and text bodies never land in a spam trap for having a
 * broken template.
 */

const SIGNOFF = '\n\n— poozari.com';

/**
 * A one-time code for signing in with an email address.
 *
 * Unlike every other template here this one goes to the devotee rather than to
 * the team, so it carries no admin links and says what to do if the request was
 * not theirs.
 */
export function loginCode(input: { code: string; minutes: number }): Omit<SendEmailOptions, 'to'> {
  const lines = [
    'Here is your poozari.com sign-in code:',
    '',
    `    ${input.code}`,
    '',
    `It is valid for ${input.minutes} minutes and can only be used once.`,
    '',
    'If you did not try to sign in, you can ignore this email — nobody can get',
    'into your account without this code.',
  ];

  return {
    // The code deliberately stays out of the subject: `EmailService.send` logs
    // every subject line, and a live login code does not belong in the server
    // log where anyone with log access could read it inside its 5-minute life.
    subject: 'Your poozari.com sign-in code',
    text: lines.join('\n') + SIGNOFF,
  };
}

/** Notify the team that someone used a site form. */
export function inquiryNotification(input: {
  kind: 'Contact Us' | 'Puja enquiry' | 'WhatsApp booking';
  name: string;
  phone: string;
  email?: string | null;
  subject?: string;
  message: string;
  pujaTitle?: string;
  city?: string;
  preferredDate?: Date | null;
  adminUrl: string;
}): Omit<SendEmailOptions, 'to'> {
  const lines = [
    `${input.kind} from ${input.name}`,
    '',
    `Name:  ${input.name}`,
    `Phone: ${input.phone}`,
    input.email ? `Email: ${input.email}` : null,
    input.pujaTitle ? `Puja:  ${input.pujaTitle}` : null,
    input.city ? `City:  ${input.city}` : null,
    input.preferredDate
      ? `Date:  ${input.preferredDate.toLocaleDateString('en-IN', { dateStyle: 'long' } as never)}`
      : null,
    '',
    input.subject ? `Subject: ${input.subject}` : null,
    '',
    input.message,
    '',
    `Reply to this email to answer ${input.name} directly.`,
    `Or work through it here: ${input.adminUrl}`,
  ].filter((line) => line !== null);

  return {
    subject: `[poozari] ${input.kind}: ${input.subject || input.name}`,
    text: lines.join('\n'),
    // Hitting reply should reach the devotee, not our own inbox.
    replyTo: input.email ?? undefined,
  };
}

/** Notify the team that a pandit applied. */
export function applicationNotification(input: {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  experienceYears: number;
  specializations: string[];
  lineage?: string;
  adminUrl: string;
}): Omit<SendEmailOptions, 'to'> {
  const lines = [
    `${input.fullName} applied to join as a pujari.`,
    '',
    `Name:       ${input.fullName}`,
    `Phone:      ${input.phone}`,
    `Email:      ${input.email}`,
    `City:       ${input.city}`,
    `Experience: ${input.experienceYears} years`,
    input.specializations.length ? `Specialises: ${input.specializations.join(', ')}` : null,
    input.lineage ? `Trained:    ${input.lineage}` : null,
    '',
    `Review and verify: ${input.adminUrl}`,
  ].filter((line) => line !== null);

  return {
    subject: `[poozari] Pujari application: ${input.fullName}`,
    text: lines.join('\n'),
    replyTo: input.email,
  };
}

/** Confirm a paid booking to the devotee. */
export function bookingConfirmation(input: {
  reference: string;
  devoteeName: string;
  pujaTitle: string;
  packageName: string;
  amountInr: number;
  /** The package's share of the total; the rest is add-ons. */
  packageAmountInr?: number;
  addons?: { name: string; priceInr: number }[];
  preferredDate: Date;
  gotra?: string;
  accountUrl: string;
}): Omit<SendEmailOptions, 'to'> {
  const addons = input.addons ?? [];
  // Only itemise when there is something to itemise — a plain booking should
  // not grow a one-line "breakdown" of itself.
  const breakdown = addons.length
    ? [
        '',
        'What you paid for:',
        `  ${input.packageName}${' '.repeat(Math.max(1, 24 - input.packageName.length))}${formatInr(
          input.packageAmountInr ?? input.amountInr,
        )}`,
        ...addons.map(
          (a) => `  ${a.name}${' '.repeat(Math.max(1, 24 - a.name.length))}${formatInr(a.priceInr)}`,
        ),
      ]
    : [];

  const lines = [
    `Namaste ${input.devoteeName},`,
    '',
    'Your puja is booked and your payment has been received.',
    '',
    `Reference: ${input.reference}`,
    `Puja:      ${input.pujaTitle}`,
    `Package:   ${input.packageName}`,
    ...breakdown,
    `Amount:    ${formatInr(input.amountInr)}`,
    `Date:      ${input.preferredDate.toLocaleDateString('en-IN', { dateStyle: 'long' } as never)}`,
    input.gotra ? `Gotra:     ${input.gotra}` : null,
    '',
    'What happens next:',
    '  1. We assign a verified pandit for your area, usually within hours.',
    '  2. The ritual is performed on the confirmed date and filmed.',
    '  3. Your recording appears in your account, and prasad is couriered',
    '     where your package includes it.',
    '',
    'Your preferred date is a request until we confirm it — some rituals must',
    'fall on a prescribed tithi, and temple availability varies. We will be in',
    'touch if it needs to move.',
    '',
    `Track it here: ${input.accountUrl}`,
    SIGNOFF.trim(),
  ].filter((line) => line !== null);

  return {
    subject: `Your puja is booked — ${input.reference}`,
    text: lines.join('\n'),
  };
}

/** Tell the devotee their pooja recording is ready. */
export function videoReady(input: {
  reference: string;
  devoteeName: string;
  pujaTitle: string;
  accountUrl: string;
}): Omit<SendEmailOptions, 'to'> {
  return {
    subject: `Your pooja video is ready — ${input.reference}`,
    text: [
      `Namaste ${input.devoteeName},`,
      '',
      `Your ${input.pujaTitle} has been performed and the recording is ready.`,
      '',
      `Watch it here: ${input.accountUrl}`,
      '',
      `Reference: ${input.reference}`,
      SIGNOFF.trim(),
    ].join('\n'),
  };
}
