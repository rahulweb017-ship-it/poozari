import { Module } from '@nestjs/common';
import { PanditsService } from './pandits.service';

@Module({
  providers: [PanditsService],
  exports: [PanditsService],
})
export class PanditsModule {}
