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
  'ka', // Shopee
  'kt', // KakaoTalk
  'hw', // Alipay/Alibaba/1688
  'vi', // Viber
  'mb', // Yahoo
  'wx', // Apple
  'ni', // Gojek
  'vz', // Hinge
  'jg', // Grab
  'bnu', // Qpon
  'ev', // Picpay
  'pm', // AOL
  'yw', // Grindr
  'bw', // Signal
  'bdp', // Kredito
  'li', // Baidu
  'vr', // MotorkuX
  'fr', // Dana
  'me', // Line messenger
  'qf', // RedBook
  'gp', // Ticketmaster
  'acm', // Razer
  'xh', // OVO
  'nz', // Foodpanda
  'nc', // Payoneer
  'cq', // Mercado
  'cn', // Fiverr
  'ju', // Indomaret
  'aez', // Shein
  'aaa', // Nubank
  'xd', // Tokopedia
  'nv', // Naver
  'ki', // 99app
  'dl', // Lazada
  'awv', // Wallapop
  'pf', // pof.com
  'pc', // Casino/bet/gambling
  'agb', // Smiles
  'sn', // OLX
  'yl', // Yalla
  'bny', // Suno
  'pd', // IFood
  'bex', // Whatnot
  'asy', // Fore Coffee
  'ky', // SpatenOktoberfest
  'abk', // GMX
  'xk', // DiDi
  'do', // Leboncoin
  'aik', // ZUS Coffee
  'acz', // Claude
  'ue', // Onet
  'fk', // BLIBLI
  'blz', // MiniPay
  'tm', // Akulaku
  'df', // Happn
  'gj', // Carousell
  'fv', // Vidio
  'ep', // Temu
  'kc', // Vinted
  'mo', // Bumble
  'tx', // Bolt
  'aff', // C6 Bank
  'byp', // Kaito
  'bwv', // Manus
  'bcx', // Bantusaku
  'za', // JDcom
  'blt', // INDOPAKET
  'vm', // OkCupid
  'ua', // BlaBlaCar
  'mv', // Fruitz
  'aka', // LinkAja
  'im', // Imo
  'fu', // Snapchat
  'zk', // Deliveroo
  'apq', // WePoker
  'aq', // Glovo
  'bme', // myIM3
  'bcq', // Mantan
  'ajj', // Rebtel
  'bau', // FieldStar
  'als', // Greggs
  'agj', // Marktplaats
  'rr', // Wolt
  'ahl', // Maxim
  'sy', // Brahma
  'ff', // AVON
  'blh', // Winner
  'tl', // Truecaller
  'bc', // GCash
  'lc', // Subito
  'blm', // Epic Games
  'vp', // Kwai
  'baa', 'bax', 'baw', 'ac', 'ad', 'ae', 'ah', 'ai', 'ak', 'am', 'bbm', 'an', 'bbl', 'ao', 'bbo', 'ar', 'bbs', 'at', 'av', 'bbt', 'aw', 'ax', 'bbv', 'ba', 'bd', // Additional services
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
  ka: 'Shopee',
  kt: 'KakaoTalk',
  hw: 'Alipay/Alibaba/1688',
  vi: 'Viber',
  mb: 'Yahoo',
  wx: 'Apple',
  ni: 'Gojek',
  vz: 'Hinge',
  jg: 'Grab',
  bnu: 'Qpon',
  ev: 'Picpay',
  pm: 'AOL',
  yw: 'Grindr',
  bw: 'Signal',
  bdp: 'Kredito',
  li: 'Baidu',
  vr: 'MotorkuX',
  fr: 'Dana',
  me: 'Line messenger',
  qf: 'RedBook',
  gp: 'Ticketmaster',
  acm: 'Razer',
  xh: 'OVO',
  nz: 'Foodpanda',
  nc: 'Payoneer',
  cq: 'Mercado',
  cn: 'Fiverr',
  ju: 'Indomaret',
  aez: 'Shein',
  aaa: 'Nubank',
  xd: 'Tokopedia',
  nv: 'Naver',
  ki: '99app',
  dl: 'Lazada',
  awv: 'Wallapop',
  pf: 'pof.com',
  pc: 'Casino/bet/gambling',
  agb: 'Smiles',
  sn: 'OLX',
  yl: 'Yalla',
  bny: 'Suno',
  pd: 'IFood',
  bex: 'Whatnot',
  asy: 'Fore Coffee',
  ky: 'SpatenOktoberfest',
  abk: 'GMX',
  xk: 'DiDi',
  do: 'Leboncoin',
  aik: 'ZUS Coffee',
  acz: 'Claude',
  ue: 'Onet',
  fk: 'BLIBLI',
  blz: 'MiniPay',
  tm: 'Akulaku',
  df: 'Happn',
  gj: 'Carousell',
  fv: 'Vidio',
  ep: 'Temu',
  kc: 'Vinted',
  mo: 'Bumble',
  tx: 'Bolt',
  aff: 'C6 Bank',
  byp: 'Kaito',
  bwv: 'Manus',
  bcx: 'Bantusaku',
  za: 'JDcom',
  blt: 'INDOPAKET',
  vm: 'OkCupid',
  ua: 'BlaBlaCar',
  mv: 'Fruitz',
  aka: 'LinkAja',
  im: 'Imo',
  fu: 'Snapchat',
  zk: 'Deliveroo',
  apq: 'WePoker',
  aq: 'Glovo',
  bme: 'myIM3',
  bcq: 'Mantan',
  ajj: 'Rebtel',
  bau: 'FieldStar',
  als: 'Greggs',
  agj: 'Marktplaats',
  rr: 'Wolt',
  ahl: 'Maxim',
  sy: 'Brahma',
  ff: 'AVON',
  blh: 'Winner',
  tl: 'Truecaller',
  bc: 'GCash',
  lc: 'Subito',
  blm: 'Epic Games',
  vp: 'Kwai',
  baa: 'Wirex',
  bax: 'Теремок',
  baw: 'Leadgid',
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