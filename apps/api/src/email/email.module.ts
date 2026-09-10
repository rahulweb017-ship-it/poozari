import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Global so any feature module can notify without re-importing it — the same
 * pattern as PrismaModule and StorageModule.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
