import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import {
  LiveAdminController,
  LiveCustomerController,
  LivePanditController,
  LivePublicController,
} from './live.controller';
import { LiveService } from './live.service';

@Module({
  imports: [PaymentsModule],
  controllers: [
    LivePublicController,
    LiveCustomerController,
    LiveAdminController,
    LivePanditController,
  ],
  providers: [LiveService],
})
export class LiveModule {}
