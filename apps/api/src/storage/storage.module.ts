import { Global, Module } from '@nestjs/common';
import { LocalDiskStorage } from './storage.service';

export const STORAGE = Symbol('STORAGE');

@Global()
@Module({
  providers: [{ provide: STORAGE, useClass: LocalDiskStorage }, LocalDiskStorage],
  exports: [STORAGE, LocalDiskStorage],
})
export class StorageModule {}
