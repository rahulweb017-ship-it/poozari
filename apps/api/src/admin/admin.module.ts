import { Module } from '@nestjs/common';
import { AddonsModule } from '../addons/addons.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ContentModule } from '../content/content.module';
import { CurrencyModule } from '../currency/currency.module';
import { HomeSlidesModule } from '../home-slides/home-slides.module';
import { PanditsModule } from '../pandits/pandits.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ApplicationApprovalService } from './application-approval.service';
import { AssignmentService } from './assignment.service';
import { BulkImportService } from './bulk-import.service';

@Module({
  imports: [
    AddonsModule,
    CatalogModule,
    ContentModule,
    CurrencyModule,
    HomeSlidesModule,
    PanditsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, ApplicationApprovalService, AssignmentService, BulkImportService],
  exports: [AssignmentService],
})
export class AdminModule {}
