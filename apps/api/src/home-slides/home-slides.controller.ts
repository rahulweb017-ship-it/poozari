import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import { HomeSlidesService } from './home-slides.service';

@Controller('home-slides')
export class HomeSlidesController {
  constructor(private readonly slides: HomeSlidesService) {}

  /** Public: the banners on the home page slider. */
  @Public()
  @Get()
  list() {
    return this.slides.listActive();
  }
}
