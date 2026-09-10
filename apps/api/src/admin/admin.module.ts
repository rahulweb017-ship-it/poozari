import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ContentModule } from '../content/content.module';
import { CurrencyModule } from '../currency/currency.module';
import { PanditsModule } from '../pandits/pandits.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AssignmentService } from './assignment.service';
import { BulkImportService } from './bulk-import.service';

@Module({
  imports: [CatalogModule, ContentModule, CurrencyModule, PanditsModule],
  controllers: [AdminController],
  providers: [AdminService, AssignmentService, BulkImportService],
  exports: [AssignmentService],
})
export class AdminModule {}
