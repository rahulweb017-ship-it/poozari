import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { CatalogModule } from './catalog/catalog.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { LiveModule } from './live/live.module';
import { PanditPortalModule } from './pandit-portal/pandit-portal.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductOrdersModule } from './product-orders/product-orders.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule,
    CatalogModule,
    BookingsModule,
    PaymentsModule,
    ProductOrdersModule,
    AdminModule,
    PanditPortalModule,
    LiveModule,
  ],
  providers: [
    // JWT auth runs globally; routes opt out with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
