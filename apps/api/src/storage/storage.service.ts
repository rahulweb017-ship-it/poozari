import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, promises as fs } from 'fs';
import { extname, join, resolve } from 'path';

/**
 * Storage abstraction. Today it writes to local disk under UPLOAD_DIR and
 * returns a public URL path served by the API at /uploads/*.
 *
 * To move to cloud (S3 / Cloudflare R2) later, implement the same interface
 * against the provider SDK and swap the provider binding in StorageModule —
 * callers only depend on savePublicFile()/deletePublicFile().
 */
export interface ObjectStorage {
  /** Persist a file and return its public URL path (e.g. /uploads/abc.webm). */
  savePublicFile(data: Buffer, originalName: string): Promise<string>;
  /** Best-effort delete of a previously saved public file. */
  deletePublicFile(publicPath: string): Promise<void>;
}

const SAFE_EXT = new Set(['.webm', '.mp4', '.mov', '.m4v', '.jpg', '.jpeg', '.png', '.webp']);

@Injectable()
export class LocalDiskStorage implements ObjectStorage {
  private readonly logger = new Logger(LocalDiskStorage.name);
  readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    // Default: apps/api/uploads. Override with UPLOAD_DIR for a mounted volume.
    const configured = this.config.get<string>('UPLOAD_DIR');
    this.uploadDir = configured ? resolve(configured) : resolve(process.cwd(), 'uploads');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async savePublicFile(data: Buffer, originalName: string): Promise<string> {
    let ext = extname(originalName || '').toLowerCase();
    if (!SAFE_EXT.has(ext)) ext = '.bin';
    const name = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    const full = join(this.uploadDir, name);
    await fs.writeFile(full, data);
    this.logger.log(`saved upload ${name} (${data.length} bytes)`);
    return `/uploads/${name}`;
  }

  async deletePublicFile(publicPath: string): Promise<void> {
    // Only delete files that live under our upload dir.
    const name = publicPath.replace(/^\/uploads\//, '');
    if (!name || name.includes('..') || name.includes('/')) return;
    const full = join(this.uploadDir, name);
    await fs.unlink(full).catch(() => undefined);
  }
}
