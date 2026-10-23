import { Module } from '@nestjs/common';
import { EarningsModule } from '../earnings/earnings.module';
import { PanditPortalController } from './pandit-portal.controller';
import { PanditPortalService } from './pandit-portal.service';

@Module({
  imports: [EarningsModule],
  controllers: [PanditPortalController],
  providers: [PanditPortalService],
})
export class PanditPortalModule {}
