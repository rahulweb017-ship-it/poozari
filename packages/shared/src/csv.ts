import { z } from 'zod';
import { PujaLocationType } from './enums';
import { slugify } from './format';
import { emailSchema, phoneSchema } from './validation';

/* ============================ CSV primitives ============================ */

/**
 * Parse RFC-4180-ish CSV into a grid of raw cells.
 *
 * Handles quoted fields (with "" escapes), embedded commas/newlines, CRLF and
 * lone-CR line endings, and a leading UTF-8 BOM — i.e. whatever Excel, Google
 * Sheets or Numbers hands an admin on "Save as CSV". Blank rows are kept so
 * callers can report accurate spreadsheet row numbers.
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < src.length) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      // Normalise newlines inside quoted cells.
      if (ch === '\r') {
        field += '\n';
        i += src[i + 1] === '\n' ? 2 : 1;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      i++;
      continue;
    }
    if (ch === ',') {
      endField();
      i++;
      continue;
    }
    if (ch === '\r') {
      endRow();
      i += src[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    if (ch === '\n') {
      endRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  endRow();
  return rows;
}

/** Serialise a grid back to CSV text, quoting only cells that need it. */
export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return (
    rows
      .map((row) =>
        row
          .map((cell) => {
            const value = cell === null || cell === undefined ? '' : String(cell);
            return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
          })
          .join(','),
      )
      // CRLF keeps Excel happy.
      .join('\r\n')
  );
}

/** Header text -> comparable key: "Package 1 Name" and "package1_name" match. */
function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface CsvRecord {
  /** 1-based spreadsheet row number (the header is row 1). */
  row: number;
  /** Cell values keyed by canonical column key, trimmed. */
  values: Record<string, string>;
}

export interface CsvRecords {
  /** Header cells exactly as they appeared in the file. */
  headers: string[];
  records: CsvRecord[];
}

/**
 * Parse CSV text into header-keyed records.
 *
 * Header cells are matched loosely against `knownKeys` (case, spaces and
 * punctuation are ignored) so a retyped or re-cased header still lands on the
 * right field. Unrecognised headers are kept under their normalised name.
 */
export function parseCsvRecords(text: string, knownKeys: string[] = []): CsvRecords {
  const grid = parseCsv(text);
  const headerIndex = grid.findIndex((cells) => cells.some((c) => c.trim() !== ''));
  if (headerIndex === -1) return { headers: [], records: [] };

  const canonical = new Map(knownKeys.map((key) => [normaliseHeader(key), key]));
  const headers = grid[headerIndex].map((h) => h.trim());
  const keys = headers.map((h) => canonical.get(normaliseHeader(h)) ?? normaliseHeader(h));

  const records: CsvRecord[] = [];
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const cells = grid[i];
    if (!cells.some((c) => c.trim() !== '')) continue; // skip blank rows
    const values: Record<string, string> = {};
    keys.forEach((key, index) => {
      if (key) values[key] = (cells[index] ?? '').trim();
    });
    records.push({ row: i + 1, values });
  }
  return { headers, records };
}

/* ============================ Cell schemas ============================ */

const TRUTHY = new Set(['true', 'yes', 'y', '1', 'active', 'live', 'on']);
const FALSY = new Set(['false', 'no', 'n', '0', 'inactive', 'hidden', 'off']);

/** true/false/yes/no/1/0 cell, falling back to `fallback` when blank. */
function boolCell(fallback: boolean) {
  return z
    .string()
    .trim()
    .default('')
    .transform((value, ctx) => {
      if (!value) return fallback;
      const key = value.toLowerCase();
      if (TRUTHY.has(key)) return true;
      if (FALSY.has(key)) return false;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Use TRUE or FALSE (got "${value}")`,
      });
      return z.NEVER;
    });
}

/** Whole-number cell. Tolerates "5,100" and a rupee sign. */
function intCell(opts: { min?: number; max?: number; fallback?: number; label?: string } = {}) {
  const label = opts.label ?? 'Value';
  return z
    .string()
    .trim()
    .default('')
    .transform((value, ctx) => {
      if (!value) {
        if (opts.fallback !== undefined) return opts.fallback;
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is required` });
        return z.NEVER;
      }
      const cleaned = value.replace(/[,\s₹]/g, '');
      const parsed = Number(cleaned);
      if (!Number.isInteger(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Enter a whole number (got "${value}")`,
        });
        return z.NEVER;
      }
      if (opts.min !== undefined && parsed < opts.min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Must be at least ${opts.min}` });
        return z.NEVER;
      }
      if (opts.max !== undefined && parsed > opts.max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Must be at most ${opts.max}` });
        return z.NEVER;
      }
      return parsed;
    });
}

/** Multi-value cell separator: commas belong to the CSV itself, so lists use "|". */
export const CSV_LIST_SEPARATOR = '|';

/** Split a multi-value cell, e.g. "Health|Prosperity" -> ['Health', 'Prosperity']. */
export function splitCsvList(value: string | undefined): string[] {
  return (value ?? '')
    .split(CSV_LIST_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);
}

function listCell() {
  return z.string().trim().default('').transform(splitCsvList);
}

function textCell(max: number) {
  return z.string().trim().max(max, `Keep this under ${max} characters`).default('');
}

/** Blank, an absolute URL, or a local path like /brand/mark.png. */
function imageCell() {
  return z
    .string()
    .trim()
    .default('')
    .superRefine((value, ctx) => {
      if (!value || value.startsWith('/')) return;
      if (!z.string().url().safeParse(value).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a full https:// URL or a local path starting with /',
        });
      }
    });
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* ============================ Puja rows ============================ */

/** One package slot parsed out of the packageN_* columns. */
export const pujaPackageCsvSchema = z.object({
  name: z.string().trim().min(2, 'Package name is required (at least 2 characters)').max(120),
  priceInr: intCell({ min: 1, label: 'Package price' }),
  inclusions: listCell(),
  description: textCell(2000),
});
export type PujaPackageCsvRow = z.infer<typeof pujaPackageCsvSchema>;

export const pujaCsvRowSchema = z
  .object({
    title: z.string().trim().min(2, 'Title is required (at least 2 characters)').max(160),
    slug: z.string().trim().default(''),
    summary: textCell(500),
    description: textCell(8000),
    imageUrl: imageCell(),
    locationType: z
      .string()
      .trim()
      .default('')
      .transform((value, ctx) => {
        const key = value.toUpperCase();
        if (key === 'HOME' || key === 'TEERTH' || key === 'TEMPLE' || key === 'DIGITAL') {
          return key as PujaLocationType;
        }
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: value
            ? `Use HOME, TEERTH, TEMPLE or DIGITAL (got "${value}")`
            : 'Use HOME, TEERTH, TEMPLE or DIGITAL',
        });
        return z.NEVER;
      }),
    city: z.string().trim().default(''),
    temple: z.string().trim().default(''),
    deities: listCell(),
    festivals: listCell(),
    benefits: listCell(),
    isActive: boolCell(true),
  })
  // A blank slug column is filled in from the title.
  .transform((row) => ({ ...row, slug: row.slug || slugify(row.title) }))
  .superRefine((row, ctx) => {
    if (!SLUG_RE.test(row.slug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slug'],
        message: 'Slug must be lowercase words separated by hyphens',
      });
    }
  });
export type PujaCsvRow = z.infer<typeof pujaCsvRowSchema>;

/** Slot numbers of the packageN_* columns present in a parsed row, in order. */
export function packageSlotsIn(values: Record<string, string>): number[] {
  const slots = new Set<number>();
  for (const key of Object.keys(values)) {
    const match = /^package(\d+)(name|priceinr|price|inclusions|description)$/.exec(
      normaliseHeader(key),
    );
    if (match) slots.add(Number(match[1]));
  }
  return [...slots].sort((a, b) => a - b);
}

/** Read one packageN_* slot out of a row. Returns null when the whole slot is blank. */
export function readPackageSlot(
  values: Record<string, string>,
  slot: number,
): { columns: Record<keyof PujaPackageCsvRow, string>; raw: Record<string, string> } | null {
  const cell = (suffix: string) => {
    const wanted = `package${slot}${suffix}`;
    for (const [key, value] of Object.entries(values)) {
      if (normaliseHeader(key) === wanted) return value;
    }
    return '';
  };
  const raw = {
    name: cell('name'),
    priceInr: cell('priceinr') || cell('price'),
    inclusions: cell('inclusions'),
    description: cell('description'),
  };
  if (!Object.values(raw).some((value) => value !== '')) return null;
  return {
    columns: {
      name: `package${slot}_name`,
      priceInr: `package${slot}_priceInr`,
      inclusions: `package${slot}_inclusions`,
      description: `package${slot}_description`,
    },
    raw,
  };
}

/* ============================ Pandit rows ============================ */

export const panditCsvRowSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name is required (at least 2 characters)').max(120),
  email: emailSchema,
  /** Blank means "generate one" — the import result lists what was generated. */
  password: z
    .string()
    .trim()
    .default('')
    .refine((value) => !value || value.length >= 8, 'Password must be at least 8 characters'),
  phone: phoneSchema,
  experienceYears: intCell({ min: 0, max: 80, fallback: 0 }),
  bio: textCell(4000),
  specializations: listCell(),
  serviceCities: listCell(),
  servicePincodes: listCell().superRefine((pincodes, ctx) => {
    for (const pincode of pincodes) {
      if (!/^\d{6}$/.test(pincode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${pincode}" is not a 6-digit pincode`,
        });
      }
    }
  }),
  isAvailable: boolCell(true),
  isActive: boolCell(true),
});
export type PanditCsvRow = z.infer<typeof panditCsvRowSchema>;

/* ============================ Import contract ============================ */

export type BulkImportEntity = 'pujas' | 'pandits';
export type BulkImportMode = 'create' | 'upsert';

/** Hard cap per upload, so one paste cannot hold a transaction open for minutes. */
export const BULK_IMPORT_MAX_ROWS = 1000;

export const bulkImportSchema = z.object({
  csv: z.string().min(1, 'Upload a CSV file first'),
  /** create = fail on rows that already exist; upsert = update them in place. */
  mode: z.enum(['create', 'upsert']).default('create'),
  /** Validate and report only — write nothing. */
  dryRun: z.boolean().default(false),
  /** Create deities / festivals / benefits the CSV references but that don't exist yet. */
  createMissingTags: z.boolean().default(false),
});
export type BulkImportInput = z.infer<typeof bulkImportSchema>;

export interface BulkImportIssue {
  /** Spreadsheet row number, or 0 for problems with the file as a whole. */
  row: number;
  column?: string;
  message: string;
}

export interface BulkImportRow {
  row: number;
  label: string;
  slug?: string;
  action: 'create' | 'update';
  /** Short human summary, e.g. "2 packages, from Rs 5,100". */
  detail: string;
  /** Only set for pandits whose password column was left blank. */
  generatedPassword?: string;
}

export interface BulkImportResult {
  entity: BulkImportEntity;
  mode: BulkImportMode;
  /** True when nothing was written: a dry run, or a file blocked by issues. */
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  /** Tag names created on the fly because createMissingTags was set. */
  createdTags: string[];
  rows: BulkImportRow[];
  issues: BulkImportIssue[];
}

/* ============================ Templates ============================ */

export interface CsvColumn {
  key: string;
  required: boolean;
  hint: string;
}

export interface CsvTemplate {
  entity: BulkImportEntity;
  filename: string;
  columns: CsvColumn[];
  /** Example rows shipped inside the downloaded template. */
  samples: Record<string, string>[];
}

export const PUJA_CSV_TEMPLATE: CsvTemplate = {
  entity: 'pujas',
  filename: 'poozari-pujas-template.csv',
  columns: [
    { key: 'title', required: true, hint: 'Listing title, e.g. Rudra Abhishek' },
    { key: 'slug', required: false, hint: 'URL slug. Leave blank to derive it from the title' },
    { key: 'summary', required: false, hint: 'One line shown on cards' },
    { key: 'description', required: false, hint: 'Full scriptural background' },
    { key: 'imageUrl', required: false, hint: 'https:// cover image, or a local /path' },
    { key: 'locationType', required: true, hint: 'HOME, TEERTH, TEMPLE or DIGITAL' },
    { key: 'city', required: false, hint: 'Existing city name or slug' },
    { key: 'temple', required: false, hint: 'Existing temple name or slug' },
    { key: 'deities', required: false, hint: 'Deity names or slugs separated by |' },
    { key: 'festivals', required: false, hint: 'Festival names or slugs separated by |' },
    { key: 'benefits', required: false, hint: 'Benefit names or slugs separated by |' },
    { key: 'isActive', required: false, hint: 'TRUE (visible) or FALSE (hidden). Default TRUE' },
    { key: 'package1_name', required: true, hint: 'At least one package is required' },
    { key: 'package1_priceInr', required: true, hint: 'Whole rupees, e.g. 5100' },
    { key: 'package1_inclusions', required: false, hint: 'Inclusions separated by |' },
    { key: 'package2_name', required: false, hint: 'Leave the whole slot blank if unused' },
    { key: 'package2_priceInr', required: false, hint: '' },
    { key: 'package2_inclusions', required: false, hint: '' },
    {
      key: 'package3_name',
      required: false,
      hint: 'Need more? Add package4_*, package5_* columns',
    },
    { key: 'package3_priceInr', required: false, hint: '' },
    { key: 'package3_inclusions', required: false, hint: '' },
  ],
  samples: [
    {
      title: 'Rudra Abhishek',
      slug: 'rudra-abhishek',
      summary: 'Classical Shiva abhishek performed with Rudri paath.',
      description: 'Performed with full samagri and sankalp in your name.',
      imageUrl: '',
      locationType: 'TEMPLE',
      city: 'varanasi',
      temple: 'kashi-vishwanath-temple',
      deities: 'lord-shiva',
      festivals: 'mahashivratri',
      benefits: 'health|prosperity',
      isActive: 'TRUE',
      package1_name: 'Standard',
      package1_priceInr: '5100',
      package1_inclusions: 'Samagri|Sankalp in your name|Recorded video',
      package2_name: 'Premium',
      package2_priceInr: '11000',
      package2_inclusions: 'Samagri|2 pandits|Prasad courier|Recorded video',
      package3_name: '',
      package3_priceInr: '',
      package3_inclusions: '',
    },
    {
      title: 'Satyanarayan Katha',
      slug: '',
      summary: 'Household katha for peace and family wellbeing.',
      description: '',
      imageUrl: '',
      locationType: 'HOME',
      city: 'varanasi',
      temple: '',
      deities: 'lord-vishnu',
      festivals: '',
      benefits: 'peace|prosperity',
      isActive: 'TRUE',
      package1_name: 'Standard',
      package1_priceInr: '3100',
      package1_inclusions: 'Samagri|Recorded video',
      package2_name: '',
      package2_priceInr: '',
      package2_inclusions: '',
      package3_name: '',
      package3_priceInr: '',
      package3_inclusions: '',
    },
  ],
};

export const PANDIT_CSV_TEMPLATE: CsvTemplate = {
  entity: 'pandits',
  filename: 'poozari-pandits-template.csv',
  columns: [
    { key: 'displayName', required: true, hint: 'Name devotees see, e.g. Pandit Ram Shastri' },
    { key: 'email', required: true, hint: 'Login email — must be unique' },
    { key: 'password', required: false, hint: 'Min 8 characters. Blank = generate one for them' },
    { key: 'phone', required: true, hint: '10-digit Indian mobile, optional +91' },
    { key: 'experienceYears', required: false, hint: 'Whole years. Default 0' },
    { key: 'bio', required: false, hint: 'Lineage, training, languages' },
    { key: 'specializations', required: false, hint: 'Puja names separated by |' },
    { key: 'serviceCities', required: false, hint: 'Existing city names or slugs separated by |' },
    { key: 'servicePincodes', required: false, hint: '6-digit pincodes separated by |' },
    { key: 'isAvailable', required: false, hint: 'TRUE = open to new assignments. Default TRUE' },
    { key: 'isActive', required: false, hint: 'FALSE blocks login. Default TRUE' },
  ],
  samples: [
    {
      displayName: 'Pandit Ram Shastri',
      email: 'ram.shastri@example.com',
      password: '',
      phone: '9876543210',
      experienceYears: '18',
      bio: 'Kashi-trained, Rudri and Vivah specialist. Hindi and Sanskrit.',
      specializations: 'Rudra Abhishek|Vivah',
      serviceCities: 'varanasi',
      servicePincodes: '221001|221002',
      isAvailable: 'TRUE',
      isActive: 'TRUE',
    },
    {
      displayName: 'Pandit Mohan Joshi',
      email: 'mohan.joshi@example.com',
      password: 'changeme123',
      phone: '9812345678',
      experienceYears: '9',
      bio: '',
      specializations: 'Satyanarayan Katha',
      serviceCities: 'ujjain',
      servicePincodes: '456001',
      isAvailable: 'TRUE',
      isActive: 'TRUE',
    },
  ],
};

export const CSV_TEMPLATES: Record<BulkImportEntity, CsvTemplate> = {
  pujas: PUJA_CSV_TEMPLATE,
  pandits: PANDIT_CSV_TEMPLATE,
};

/** Render a template as downloadable CSV text: header row plus example rows. */
export function buildCsvTemplate(template: CsvTemplate, includeSamples = true): string {
  const keys = template.columns.map((column) => column.key);
  const rows: string[][] = [keys];
  if (includeSamples) {
    for (const sample of template.samples) rows.push(keys.map((key) => sample[key] ?? ''));
  }
  return toCsv(rows);
}
