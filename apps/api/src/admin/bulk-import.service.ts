import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BULK_IMPORT_MAX_ROWS,
  CSV_TEMPLATES,
  UserRole,
  formatInr,
  packageSlotsIn,
  panditCsvRowSchema,
  parseCsvRecords,
  pujaCsvRowSchema,
  pujaPackageCsvSchema,
  readPackageSlot,
  slugify,
  splitCsvList,
  type BulkImportInput,
  type BulkImportIssue,
  type BulkImportResult,
  type BulkImportRow,
  type CsvRecord,
  type PujaPackageCsvRow,
} from '@poozari/shared';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import type { ZodError } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

/** Long enough for a bulk write, short enough that a stuck import gives up. */
const TRANSACTION_OPTIONS = { timeout: 120_000, maxWait: 15_000 };

type TagKind = 'deities' | 'festivals' | 'benefits';
const TAG_KINDS: TagKind[] = ['deities', 'festivals', 'benefits'];

/** Singular label used in error messages, e.g. 'deity'. */
const TAG_LABELS: Record<TagKind, string> = {
  deities: 'deity',
  festivals: 'festival',
  benefits: 'benefit',
};

/** Prisma model delegate backing each tag kind. */
const TAG_DELEGATES: Record<TagKind, 'deity' | 'festival' | 'benefit'> = {
  deities: 'deity',
  festivals: 'festival',
  benefits: 'benefit',
};

interface NamedRecord {
  id: string;
  name: string;
  slug: string;
}

/**
 * Canonical keys of the columns the uploaded sheet actually carries.
 *
 * Updates write only these, so a sheet that leaves a column out keeps the
 * current value instead of blanking it.
 */
function presentColumns(records: CsvRecord[]): Set<string> {
  const present = new Set<string>();
  for (const record of records) {
    for (const key of Object.keys(record.values)) present.add(key);
  }
  return present;
}

/** Lookup table that accepts either the slug or the (case-insensitive) name. */
function indexNamed<T extends NamedRecord>(items: T[]): Map<string, T> {
  const index = new Map<string, T>();
  for (const item of items) {
    index.set(item.slug.toLowerCase(), item);
    index.set(item.name.toLowerCase(), item);
  }
  return index;
}

/** Flatten Zod issues onto spreadsheet coordinates. */
function issuesFrom(
  error: ZodError,
  row: number,
  columnFor: (path: (string | number)[]) => string | undefined = (path) =>
    typeof path[0] === 'string' ? path[0] : undefined,
): BulkImportIssue[] {
  return error.issues.map((issue) => ({
    row,
    column: columnFor(issue.path),
    message: issue.message,
  }));
}

/** Derive a slug that is not already taken, appending -2, -3, … if needed. */
function uniqueSlug(name: string, taken: Set<string>): string {
  const base = slugify(name) || 'item';
  let candidate = base;
  let suffix = 2;
  while (taken.has(candidate)) candidate = `${base}-${suffix++}`;
  taken.add(candidate);
  return candidate;
}

const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Readable random password for pandits whose password column was left blank. */
function generatePassword(): string {
  let out = '';
  for (let i = 0; i < 10; i++) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  return out;
}

interface PreparedPuja {
  row: number;
  action: 'create' | 'update';
  existingId?: string;
  slug: string;
  title: string;
  data: {
    title: string;
    slug: string;
    summary: string;
    description: string;
    imageUrl?: string;
    locationType: 'HOME' | 'TEERTH' | 'TEMPLE';
    templeId?: string;
    cityId?: string;
    isActive: boolean;
  };
  packages: PujaPackageCsvRow[];
  /** Tag names, resolved to ids inside the transaction (some may be created there). */
  tagNames: Record<TagKind, string[]>;
}

interface PreparedPandit {
  row: number;
  action: 'create' | 'update';
  existingUserId?: string;
  existingProfileId?: string;
  email: string;
  displayName: string;
  /** Plaintext held only long enough to hash it once the whole file validates. */
  plainPassword?: string;
  passwordHash?: string;
  generatedPassword?: string;
  profile: {
    displayName: string;
    bio: string;
    phone: string;
    experienceYears: number;
    specializations: string[];
    serviceCityIds: string[];
    servicePincodes: string[];
    isAvailable: boolean;
    isActive: boolean;
  };
  detail: string;
}

/**
 * CSV bulk import for the Super Admin panel.
 *
 * Every import runs in two phases. Phase one parses and validates the whole
 * file against the catalog as it stands and reports issues by spreadsheet cell;
 * phase two writes the rows in a single transaction. Nothing is written while
 * any row is invalid, so an admin never has to reconcile a half-applied file —
 * they fix the sheet and upload again.
 */
@Injectable()
export class BulkImportService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- Pujas */

  async importPujas(input: BulkImportInput): Promise<BulkImportResult> {
    const template = CSV_TEMPLATES.pujas;
    const records = this.readRecords(input.csv, template.columns.map((column) => column.key));
    const present = presentColumns(records);
    const hasPackageColumns = records.some((record) => packageSlotsIn(record.values).length > 0);

    const [cities, temples, deities, festivals, benefits, existingPujas] = await Promise.all([
      this.prisma.city.findMany({ select: { id: true, name: true, slug: true } }),
      this.prisma.temple.findMany({ select: { id: true, name: true, slug: true, cityId: true } }),
      this.prisma.deity.findMany({ select: { id: true, name: true, slug: true } }),
      this.prisma.festival.findMany({ select: { id: true, name: true, slug: true } }),
      this.prisma.benefit.findMany({ select: { id: true, name: true, slug: true } }),
      this.prisma.puja.findMany({ select: { id: true, slug: true } }),
    ]);

    const cityIndex = indexNamed(cities);
    const templeIndex = indexNamed(temples);
    const tagIndexes: Record<TagKind, Map<string, NamedRecord>> = {
      deities: indexNamed(deities),
      festivals: indexNamed(festivals),
      benefits: indexNamed(benefits),
    };
    const pujaIdBySlug = new Map(existingPujas.map((puja) => [puja.slug, puja.id]));

    const issues: BulkImportIssue[] = [];
    const prepared: PreparedPuja[] = [];
    const slugRows = new Map<string, number>();
    const missingTags: Record<TagKind, Set<string>> = {
      deities: new Set(),
      festivals: new Set(),
      benefits: new Set(),
    };

    for (const record of records) {
      const rowIssues: BulkImportIssue[] = [];
      // Field errors never short-circuit the checks below: an admin editing a
      // spreadsheet should see everything wrong with a row in one pass.
      const parsed = pujaCsvRowSchema.safeParse(record.values);
      if (!parsed.success) rowIssues.push(...issuesFrom(parsed.error, record.row));
      const row = parsed.success ? parsed.data : null;

      /* Slug: unique within the file, and either new or updatable. */
      let existingId: string | undefined;
      if (row) {
        const duplicateOf = slugRows.get(row.slug);
        if (duplicateOf !== undefined) {
          rowIssues.push({
            row: record.row,
            column: 'slug',
            message: `Slug "${row.slug}" is already used on row ${duplicateOf} of this file`,
          });
        }
        slugRows.set(row.slug, record.row);

        existingId = pujaIdBySlug.get(row.slug);
        if (existingId && input.mode === 'create') {
          rowIssues.push({
            row: record.row,
            column: 'slug',
            message: `A puja with slug "${row.slug}" already exists. Switch the mode to "Update existing" to overwrite it.`,
          });
        }
      }

      /* Packages: one or more packageN_* slots. */
      const packages: PujaPackageCsvRow[] = [];
      for (const slot of packageSlotsIn(record.values)) {
        const cells = readPackageSlot(record.values, slot);
        if (!cells) continue;
        const parsedPackage = pujaPackageCsvSchema.safeParse(cells.raw);
        if (!parsedPackage.success) {
          rowIssues.push(
            ...issuesFrom(
              parsedPackage.error,
              record.row,
              (path) => cells.columns[path[0] as keyof PujaPackageCsvRow],
            ),
          );
          continue;
        }
        packages.push(parsedPackage.data);
      }
      // A new puja needs a price. An update may leave the package columns out
      // entirely, which keeps the packages it already has.
      if (packages.length === 0 && (!existingId || hasPackageColumns)) {
        rowIssues.push({
          row: record.row,
          column: 'package1_name',
          message: existingId
            ? 'At least one package (name + price) is required. Remove the package columns to keep the current ones.'
            : 'At least one package (name + price) is required',
        });
      }

      /* City / temple must already exist — those carry data a CSV cannot supply. */
      const cityCell = record.values.city ?? '';
      const templeCell = record.values.temple ?? '';
      let cityId: string | undefined;
      let templeId: string | undefined;
      if (cityCell) {
        const city = cityIndex.get(cityCell.toLowerCase());
        if (city) cityId = city.id;
        else
          rowIssues.push({
            row: record.row,
            column: 'city',
            message: `Unknown city "${cityCell}". Add it under Catalog first.`,
          });
      }
      if (templeCell) {
        const temple = templeIndex.get(templeCell.toLowerCase());
        if (temple) {
          templeId = temple.id;
          // A temple already knows its city; fill the city in when left blank.
          if (!cityId && !cityCell) cityId = temple.cityId;
        } else {
          rowIssues.push({
            row: record.row,
            column: 'temple',
            message: `Unknown temple "${templeCell}". Add it under Catalog first.`,
          });
        }
      }

      /* Deities / festivals / benefits: existing, or created on request. */
      const newTags: Record<TagKind, string[]> = { deities: [], festivals: [], benefits: [] };
      for (const kind of TAG_KINDS) {
        for (const name of splitCsvList(record.values[kind])) {
          if (tagIndexes[kind].has(name.toLowerCase())) continue;
          if (input.createMissingTags) {
            newTags[kind].push(name);
            continue;
          }
          rowIssues.push({
            row: record.row,
            column: kind,
            message: `Unknown ${TAG_LABELS[kind]} "${name}". Tick "Create missing tags" or add it under Catalog first.`,
          });
        }
      }

      if (!row || rowIssues.length) {
        issues.push(...rowIssues);
        continue;
      }
      // Only rows that made it this far can ask for a tag to be created.
      for (const kind of TAG_KINDS) {
        for (const name of newTags[kind]) missingTags[kind].add(name);
      }

      prepared.push({
        row: record.row,
        action: existingId ? 'update' : 'create',
        existingId,
        slug: row.slug,
        title: row.title,
        data: {
          title: row.title,
          slug: row.slug,
          summary: row.summary,
          description: row.description,
          imageUrl: row.imageUrl || undefined,
          locationType: row.locationType,
          templeId,
          cityId,
          isActive: row.isActive,
        },
        packages,
        tagNames: { deities: row.deities, festivals: row.festivals, benefits: row.benefits },
      });
    }

    const rows: BulkImportRow[] = prepared.map((item) => ({
      row: item.row,
      label: item.title,
      slug: item.slug,
      action: item.action,
      detail: item.packages.length
        ? `${item.packages.length} package${item.packages.length === 1 ? '' : 's'} · from ${formatInr(
            Math.min(...item.packages.map((pkg) => pkg.priceInr)),
          )}`
        : 'packages unchanged',
    }));

    const createdTagNames = TAG_KINDS.flatMap((kind) => [...missingTags[kind]]);
    if (issues.length || input.dryRun) {
      return this.summarise(input, 'pujas', records.length, rows, issues, createdTagNames, true);
    }

    await this.prisma.$transaction(async (tx) => {
      /* Create any requested tags first, then everything resolves to an id. */
      for (const kind of TAG_KINDS) {
        const names = [...missingTags[kind]];
        if (names.length === 0) continue;
        const delegate = tx[TAG_DELEGATES[kind]] as {
          findMany(args: unknown): Promise<{ slug: string }[]>;
          create(args: unknown): Promise<NamedRecord>;
        };
        const taken = new Set(
          (await delegate.findMany({ select: { slug: true } })).map((entity) => entity.slug),
        );
        for (const name of names) {
          const created = await delegate.create({
            data: { name, slug: uniqueSlug(name, taken) },
            select: { id: true, name: true, slug: true },
          });
          tagIndexes[kind].set(name.toLowerCase(), created);
          tagIndexes[kind].set(created.slug.toLowerCase(), created);
        }
      }

      const tagIds = (kind: TagKind, names: string[]) =>
        names
          .map((name) => tagIndexes[kind].get(name.toLowerCase())?.id)
          .filter((id): id is string => Boolean(id))
          .map((id) => ({ id }));

      for (const item of prepared) {
        const relations = {
          deities: tagIds('deities', item.tagNames.deities),
          festivals: tagIds('festivals', item.tagNames.festivals),
          benefits: tagIds('benefits', item.tagNames.benefits),
        };
        if (item.action === 'update' && item.existingId) {
          // Only columns the sheet carries are written. A column left out of
          // the file keeps its current value; a blank cell in a column that IS
          // present clears the field.
          const data: Prisma.PujaUpdateInput = {
            title: item.data.title,
            slug: item.data.slug,
            locationType: item.data.locationType,
          };
          if (present.has('summary')) data.summary = item.data.summary;
          if (present.has('description')) data.description = item.data.description;
          if (present.has('imageUrl')) data.imageUrl = item.data.imageUrl ?? null;
          if (present.has('isActive')) data.isActive = item.data.isActive;
          if (present.has('city') || present.has('temple')) {
            data.city = item.data.cityId ? { connect: { id: item.data.cityId } } : { disconnect: true };
            data.temple = item.data.templeId
              ? { connect: { id: item.data.templeId } }
              : { disconnect: true };
          }
          for (const kind of TAG_KINDS) {
            if (present.has(kind)) data[kind] = { set: relations[kind] };
          }
          await tx.puja.update({ where: { id: item.existingId }, data });

          // Packages are replaced wholesale, but only when the sheet has them.
          if (item.packages.length > 0) {
            await tx.package.deleteMany({ where: { pujaId: item.existingId } });
            await tx.package.createMany({
              data: item.packages.map((pkg) => ({ ...pkg, pujaId: item.existingId as string })),
            });
          }
        } else {
          await tx.puja.create({
            data: {
              ...item.data,
              packages: { create: item.packages },
              deities: { connect: relations.deities },
              festivals: { connect: relations.festivals },
              benefits: { connect: relations.benefits },
            },
          });
        }
      }
    }, TRANSACTION_OPTIONS);

    return this.summarise(input, 'pujas', records.length, rows, issues, createdTagNames, false);
  }

  /* -------------------------------------------------------------- Pandits */

  async importPandits(input: BulkImportInput): Promise<BulkImportResult> {
    const template = CSV_TEMPLATES.pandits;
    const records = this.readRecords(input.csv, template.columns.map((column) => column.key));
    const present = presentColumns(records);

    const [cities, existingUsers] = await Promise.all([
      this.prisma.city.findMany({ select: { id: true, name: true, slug: true } }),
      this.prisma.user.findMany({
        where: { email: { not: null } },
        select: { id: true, email: true, role: true, panditProfile: { select: { id: true } } },
      }),
    ]);
    const cityIndex = indexNamed(cities);
    const userByEmail = new Map(
      existingUsers.map((user) => [(user.email as string).toLowerCase(), user]),
    );

    const issues: BulkImportIssue[] = [];
    const prepared: PreparedPandit[] = [];
    const emailRows = new Map<string, number>();
    const phoneRows = new Map<string, number>();

    for (const record of records) {
      const rowIssues: BulkImportIssue[] = [];
      // As with pujas, one pass reports every problem in the row.
      const parsed = panditCsvRowSchema.safeParse(record.values);
      if (!parsed.success) rowIssues.push(...issuesFrom(parsed.error, record.row));

      /* Service cities read from the raw cell, so they report even if a field above failed. */
      const serviceCityIds: string[] = [];
      for (const name of splitCsvList(record.values.serviceCities)) {
        const city = cityIndex.get(name.toLowerCase());
        if (city) serviceCityIds.push(city.id);
        else
          rowIssues.push({
            row: record.row,
            column: 'serviceCities',
            message: `Unknown city "${name}". Add it under Catalog first.`,
          });
      }

      if (!parsed.success) {
        issues.push(...rowIssues);
        continue;
      }
      const row = parsed.data;

      const duplicateEmailRow = emailRows.get(row.email);
      if (duplicateEmailRow !== undefined) {
        rowIssues.push({
          row: record.row,
          column: 'email',
          message: `Email "${row.email}" is already used on row ${duplicateEmailRow} of this file`,
        });
      }
      emailRows.set(row.email, record.row);

      const duplicatePhoneRow = phoneRows.get(row.phone);
      if (duplicatePhoneRow !== undefined) {
        rowIssues.push({
          row: record.row,
          column: 'phone',
          message: `Phone "${row.phone}" is already used on row ${duplicatePhoneRow} of this file`,
        });
      }
      phoneRows.set(row.phone, record.row);

      const existing = userByEmail.get(row.email);
      if (existing && existing.role !== UserRole.PANDIT) {
        rowIssues.push({
          row: record.row,
          column: 'email',
          message: `"${row.email}" already belongs to a non-pandit account`,
        });
      } else if (existing && input.mode === 'create') {
        rowIssues.push({
          row: record.row,
          column: 'email',
          message: `A pandit with email "${row.email}" already exists. Switch the mode to "Update existing" to overwrite them.`,
        });
      } else if (existing && !existing.panditProfile) {
        rowIssues.push({
          row: record.row,
          column: 'email',
          message: `"${row.email}" has a login but no pandit profile. Fix that record by hand.`,
        });
      }

      if (rowIssues.length) {
        issues.push(...rowIssues);
        continue;
      }

      // New pandits always get a password; updates keep the current one unless
      // the CSV supplies a replacement.
      const generatedPassword = !existing && !row.password ? generatePassword() : undefined;
      prepared.push({
        row: record.row,
        action: existing ? 'update' : 'create',
        existingUserId: existing?.id,
        existingProfileId: existing?.panditProfile?.id,
        email: row.email,
        displayName: row.displayName,
        generatedPassword,
        plainPassword: row.password || generatedPassword,
        profile: {
          displayName: row.displayName,
          bio: row.bio,
          phone: row.phone,
          experienceYears: row.experienceYears,
          specializations: row.specializations,
          serviceCityIds,
          servicePincodes: row.servicePincodes,
          // A deactivated account is always offline, matching the single-edit form.
          isAvailable: row.isActive ? row.isAvailable : false,
          isActive: row.isActive,
        },
        detail: [
          `${row.experienceYears} yrs`,
          serviceCityIds.length === 1 ? '1 city' : serviceCityIds.length ? `${serviceCityIds.length} cities` : null,
          row.servicePincodes.length === 1
            ? '1 pincode'
            : row.servicePincodes.length
              ? `${row.servicePincodes.length} pincodes`
              : null,
          row.isActive ? null : 'deactivated',
        ]
          .filter(Boolean)
          .join(' · '),
      });
    }

    const rows: BulkImportRow[] = prepared.map((item) => ({
      row: item.row,
      label: item.displayName,
      slug: item.email,
      action: item.action,
      detail: item.detail,
      generatedPassword: item.generatedPassword,
    }));

    if (issues.length || input.dryRun) {
      return this.summarise(input, 'pandits', records.length, rows, issues, [], true);
    }

    /* Hash outside the transaction: bcrypt is deliberately slow. */
    for (const item of prepared) {
      if (item.plainPassword) item.passwordHash = await bcrypt.hash(item.plainPassword, 10);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of prepared) {
        if (item.action === 'update' && item.existingUserId && item.existingProfileId) {
          // As with pujas, a column the sheet leaves out keeps its current value.
          const data: Prisma.PanditProfileUpdateInput = {
            displayName: item.profile.displayName,
            phone: item.profile.phone,
          };
          if (present.has('bio')) data.bio = item.profile.bio;
          if (present.has('experienceYears')) data.experienceYears = item.profile.experienceYears;
          if (present.has('specializations')) data.specializations = item.profile.specializations;
          if (present.has('serviceCities')) data.serviceCityIds = item.profile.serviceCityIds;
          if (present.has('servicePincodes')) data.servicePincodes = item.profile.servicePincodes;
          if (present.has('isActive')) data.isActive = item.profile.isActive;
          if (present.has('isAvailable') || present.has('isActive')) {
            data.isAvailable = item.profile.isAvailable;
          }
          await tx.panditProfile.update({ where: { id: item.existingProfileId }, data });
          await tx.user.update({
            where: { id: item.existingUserId },
            data: {
              name: item.profile.displayName,
              ...(item.passwordHash ? { passwordHash: item.passwordHash } : {}),
            },
          });
        } else {
          await tx.user.create({
            data: {
              email: item.email,
              name: item.profile.displayName,
              role: UserRole.PANDIT,
              passwordHash: item.passwordHash,
              panditProfile: { create: item.profile },
            },
          });
        }
      }
    }, TRANSACTION_OPTIONS);

    return this.summarise(input, 'pandits', records.length, rows, issues, [], false);
  }

  /* --------------------------------------------------------------- Shared */

  private readRecords(csv: string, knownKeys: string[]): CsvRecord[] {
    const { headers, records } = parseCsvRecords(csv, knownKeys);
    if (headers.length === 0) {
      throw new BadRequestException('That file has no header row. Start from the template.');
    }
    if (records.length === 0) {
      throw new BadRequestException(
        'That file has a header row but no data rows. Add your rows below the header.',
      );
    }
    if (records.length > BULK_IMPORT_MAX_ROWS) {
      throw new BadRequestException(
        `That file has ${records.length} rows. Import at most ${BULK_IMPORT_MAX_ROWS} at a time.`,
      );
    }
    return records;
  }

  private summarise(
    input: BulkImportInput,
    entity: BulkImportResult['entity'],
    totalRows: number,
    rows: BulkImportRow[],
    issues: BulkImportIssue[],
    createdTags: string[],
    previewOnly: boolean,
  ): BulkImportResult {
    const counted = previewOnly && issues.length ? [] : rows;
    return {
      entity,
      mode: input.mode,
      // True whenever nothing was written: a dry run, or a file blocked by issues.
      dryRun: previewOnly,
      totalRows,
      created: counted.filter((row) => row.action === 'create').length,
      updated: counted.filter((row) => row.action === 'update').length,
      createdTags,
      rows,
      issues,
    };
  }
}
