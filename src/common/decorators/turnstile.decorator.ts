import { SetMetadata } from '@nestjs/common';

export const TURNSTILE_KEY = 'turnstile';
export const UseTurnstile = () => SetMetadata(TURNSTILE_KEY, true);