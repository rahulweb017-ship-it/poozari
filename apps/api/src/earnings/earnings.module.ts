import { Module } from '@nestjs/common';
import { AdminEarningsController, PanditEarningsController } from './earnings.controller';
import { EarningsService } from './earnings.service';

@Module({
  controllers: [AdminEarningsController, PanditEarningsController],
  providers: [EarningsService],
  exports: [EarningsService],
})
export class EarningsModule {}
