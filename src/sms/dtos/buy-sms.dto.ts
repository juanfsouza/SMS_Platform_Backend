import { z } from 'zod';
import { CountryMapService } from '../country-map.service';

const VALID_SERVICES = [
  'wa', // WhatsApp
  'tg', // Telegram
  'vk', // VK
  'ok', // OK
  'wb', // WeChat
  'go', // Google
  'fb', // Facebook
  'tw', // Twitter
  'lf', // TikTok
  'ig', // Instagram
  'ot', // Other
  'dh', // Ebay
  'aa', // Probo
  'ee', // Twilio
  'hb', // Twitch
  'ahb', // Ubisoft
  'kf', // Weibo
  'rc', // Skype
  'am', // Amazon
  'ds', // Discord
  'an', // AliExpress
  'bbl', // Autodesk
  'ts', // PayPal
  'nf', // Netflix
  'mm', // Microsoft
  'tn', // LinkedIn
  'ew', // Nike
  'mt', // Steam
  'oi', // Tinder
  'ya', // Uber
  'uk', // Airbnb
  'my', // Caixa
  'ip', // Burger King
  'bz', // Blizzard
  'aon', // Binace
  'zs', // Bilibili
  'baa', 'bax', 'baw', 'aa', 'ac', 'ad', 'ae', 'ah', 'ai', 'ak', 'am', 'bbm', 'an', 'bbl', 'ao', 'bbo', 'aq', 'ar', 'bbs', 'at', 'av', 'bbt', 'aw', 'ax', 'bbv', 'ba', 'bd', // Add more from getPrices
  // Add all service codes from getPrices logs
];

export const SERVICE_NAME_MAP: Record<string, string> = {
  wa: 'WhatsApp',
  tg: 'Telegram',
  vk: 'VK',
  ok: 'OK',
  wb: 'WeChat',
  go: 'Google',
  fb: 'Facebook',
  tw: 'Twitter',
  ig: 'Instagram',
  lf: 'TikTok',
  ot: 'Other',
  baa: 'Wirex',
  bax: 'Теремок',
  baw: 'Leadgid',
  dh: 'Ebay',
  aa: 'Probo',
  ee: 'Twilio',
  hb: 'Twitch',
  ahb: 'Ubisoft',
  kf: 'Weibo',
  rc: 'Skype',
  am: 'Amazon',
  ds: 'Discord',
  an: 'AliExpress',
  bbl: 'Autodesk',
  ts: 'PayPal',
  nf: 'Netflix',
  mm: 'Microsoft',
  tn: 'LinkedIn',
  ew: 'Nike',
  mt: 'Steam',
  oi: 'Tinder',
  ya: 'Uber',
  uk: 'Airbnb',
  my: 'Caixa',
  ip: 'Burger King',
  bz: 'Blizzard',
  aon: 'Binace',
  zs: 'Bilibili',
  blm: 'Epic Games',
  vp: 'Kwai',
};

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
    service: service,
    country: country,
  };
};

export type BuySmsDto = z.infer<typeof BuySmsDto>;

export { CountryMapService };