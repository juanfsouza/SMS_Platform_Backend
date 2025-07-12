import { z } from 'zod';

// Map user-facing service codes to SMS-Activate service codes
const SERVICE_MAP: Record<string, string> = {
  wa: '0', // WhatsApp
  tg: '1', // Telegram
  vk: '2', // VK
  ok: '3', // OK
  wb: '4', // WeChat
  go: '5', // Google
  fb: '6', // Facebook
  tw: '7', // Twitter
  ot: '204', // Other
};

// Map numeric country codes to SMS-Activate country codes
const COUNTRY_MAP: Record<string, string> = {
  '0': 'bac', // Russia
  '1': 'baa', // Ukraine
  '2': 'bah', // Kazakhstan
  '6': 'bau', // Indonesia
  '16': 'bdp', // China
};

const VALID_SERVICES = Object.keys(SERVICE_MAP);
const VALID_COUNTRIES = Object.keys(COUNTRY_MAP);

export const BuySmsDto = z.object({
  service: z.string().refine((val) => VALID_SERVICES.includes(val), {
    message: `Invalid service. Must be one of: ${VALID_SERVICES.join(', ')}`,
  }),
  country: z.string().regex(/^\d+$/, { message: 'Country must be a numeric code' }).refine((val) => VALID_COUNTRIES.includes(val), {
    message: `Invalid country code. Must be one of: ${VALID_COUNTRIES.join(', ')}`,
  }),
});

export const mapToSmsActivateCodes = (service: string, country: string): { service: string; country: string } => {
  return {
    service: SERVICE_MAP[service] || service,
    country: COUNTRY_MAP[country] || country,
  };
};

export type BuySmsDto = z.infer<typeof BuySmsDto>;