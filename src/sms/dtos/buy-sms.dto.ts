import { z } from 'zod';
import { CountryMapService } from '../country-map.service';

const SERVICE_MAP: Record<string, string> = {
  wa: '0', // WhatsApp
  tg: '1', // Telegram
  vk: '2', // VK
  ok: '3', // OK
  wb: '4', // WeChat
  go: '5', // Google
  fb: '6', // Facebook
  tw: '7', // Twitter
  lf: '8', // Tiktok
  ot: '204', // Other
};

const VALID_SERVICES = Object.keys(SERVICE_MAP);

export const BuySmsDto = z.object({
  service: z.string().refine((val) => VALID_SERVICES.includes(val), {
    message: `Invalid service. Must be one of: ${VALID_SERVICES.join(', ')}`,
  }),
  country: z.string().regex(/^\d+$/, { message: 'Country must be a numeric code' }),
});

export const mapToSmsActivateCodes = async (
  service: string,
  country: string,
  countryMapService: CountryMapService,
): Promise<{ service: string; country: string }> => {
  const countryMap = await countryMapService.getCountryMap();
  if (!countryMap[country]) {
    throw new Error(`Invalid country code: ${country}. Available codes: ${Object.keys(countryMap).join(', ')}`);
  }
  return {
    service: SERVICE_MAP[service] || service,
    country: countryMap[country] || country,
  };
};

export type BuySmsDto = z.infer<typeof BuySmsDto>;

export { CountryMapService };
