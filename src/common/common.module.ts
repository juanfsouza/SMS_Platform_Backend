import { Module } from '@nestjs/common';
import { TurnstileGuard } from './guards/turnstile.guard';
import { TurnstileModule } from '../turnstile/turnstile.module';

@Module({
  imports: [TurnstileModule],
  providers: [TurnstileGuard],
  exports: [TurnstileGuard],
})
export class CommonModule {}