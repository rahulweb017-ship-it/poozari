import { Module } from '@nestjs/common';
import { PanditPortalController } from './pandit-portal.controller';
import { PanditPortalService } from './pandit-portal.service';

@Module({
  controllers: [PanditPortalController],
  providers: [PanditPortalService],
})
export class PanditPortalModule {}
