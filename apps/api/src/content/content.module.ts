import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { WhatsappController } from './whatsapp.controller';

@Module({
  controllers: [ContentController, WhatsappController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
