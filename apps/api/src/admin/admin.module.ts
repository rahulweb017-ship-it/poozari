import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { PanditsModule } from '../pandits/pandits.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AssignmentService } from './assignment.service';

@Module({
  imports: [CatalogModule, PanditsModule],
  controllers: [AdminController],
  providers: [AdminService, AssignmentService],
  exports: [AssignmentService],
})
export class AdminModule {}
