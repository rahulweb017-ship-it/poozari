import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AddonsModule } from './addons/addons.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { CatalogModule } from './catalog/catalog.module';
import { ContentModule } from './content/content.module';
import { CurrencyModule } from './currency/currency.module';
import { EmailModule } from './email/email.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { LiveModule } from './live/live.module';
import { PanditPortalModule } from './pandit-portal/pandit-portal.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { RazorpayWebhookModule } from './payments/webhook/razorpay-webhook.module';
import { ProductOrdersModule } from './product-orders/product-orders.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    EmailModule,
    AuthModule,
    CatalogModule,
    CurrencyModule,
    AddonsModule,
    ContentModule,
    BookingsModule,
    PaymentsModule,
    ProductOrdersModule,
    RazorpayWebhookModule,
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
