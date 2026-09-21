import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import { AddonsService } from './addons.service';

@Controller('addons')
export class AddonsController {
  constructor(private readonly addons: AddonsService) {}

  /** Public: the extras offered on the booking form. */
  @Public()
  @Get()
  list() {
    return this.addons.listActive();
  }
}
