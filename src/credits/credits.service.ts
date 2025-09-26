import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CountryMapService } from '../sms/country-map.service';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);
  private readonly smsActivateApiUrl = 'https://api.sms-activate.ae/stubs/handler_api.php';
  private readonly FIXED_MARKUP = 1.5;

  private readonly SERVICE_NAME_MAP: Record<string, string> = {
    full: 'Full Rent',
    go: 'Google',
    ig: 'Instagram+Threads',
    fb: 'Facebook',
    wa: 'WhatsApp',
    tg: 'Telegram',
    am: 'Amazon',
    oi: 'Tinder',
    hw: 'Alipay/Alibaba/1688',
    mm: 'Microsoft',
    vi: 'Viber',
    tw: 'Twitter',
    ds: 'Discord',
    mb: 'Yahoo',
    lf: 'TikTok/Douyin',
    wx: 'Apple',
    wb: 'WeChat',
    ni: 'Gojek',
    ot: 'Any other',
    ka: 'Shopee',
    vz: 'Hinge',
    jg: 'Grab',
    bnu: 'Qpon',
    ev: 'Picpay',
    ts: 'PayPal',
    ub: 'Uber',
    ew: 'Nike',
    pm: 'AOL',
    yw: 'Grindr',
    vk: 'vk.com',
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
    dh: 'eBay',
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
    nf: 'Netflix',
    ue: 'Onet',
    fk: 'BLIBLI',
    blz: 'MiniPay',
    tm: 'Akulaku',
    bz: 'Blizzard',
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
    kt: 'KakaoTalk',
    mv: 'Fruitz',
    aka: 'LinkAja',
    im: 'Imo',
    fu: 'Snapchat',
    tn: 'LinkedIn',
    ee: 'Twilio',
    zk: 'Deliveroo',
    apq: 'WePoker',
    aq: 'Glovo',
    ok: 'ok.ru',
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
    byf: 'SeaBank',
    bnl: 'Reddit',
    bdg: 'HUD',
    alg: 'Ankama',
    wr: 'Walmart',
    si: 'Cita Previa',
    auc: 'TotalPass',
    wh: 'TanTan',
    ahb: 'Ubisoft',
    asf: 'TextFree',
    yx: 'JTExpress',
    bgt: 'Alfamidi',
    bab: 'Opera Mini',
    vg: 'ShellBox',
    xx: 'Joyride',
    agg: 'OneForma',
    ahx: 'Bitrue',
    bkd: 'Sahibinden',
    ma: 'Mail.ru',
    kk: 'Idealista',
    ahd: 'Midnite',
    ft: 'Bookmakers',
    agl: 'Betano',
    ac: 'DoorDash',
    ws: 'Feeld',
    qv: 'Badoo',
    sg: 'OZON',
    azi: 'TheL',
    re: 'Coinbase',
    hx: 'AliExpress',
    afd: 'Astra Otoshop',
    aqt: 'Skrill',
    aey: 'Next',
    blo: 'SiliconFlow 硅基流动',
    ya: 'Yandex/Uber',
    bgv: 'Clearpay',
    aqm: 'Tala',
    uu: 'Wildberries',
    aju: 'Daya Auto',
    abc: 'Taptap Send',
    azl: 'MotoRan',
    asb: 'YUEWEN 阅文集团',
    bwx: 'Chagee',
    atl: 'Watsons MY',
    tf: 'Noon',
    tu: 'Lyft',
    cw: 'PaddyPower',
    aiw: 'Roblox',
    zs: 'Bilibili',
    ano: 'Shopify',
    axx: 'Shopback',
    bo: 'Wise',
    uk: 'Airbnb',
    aym: 'Langit Musik',
    rl: 'inDriver',
    agm: 'CMB',
    fz: 'KFC',
    hu: 'Ukrnet',
    apf: 'Carrefour',
    uf: 'Eneba',
    qj: 'Whoosh',
    pz: 'Lidl',
    bhu: 'TMTW',
    xt: 'Flipkart',
    afz: 'Klarna',
    aws: '7-Eleven',
    ban: 'BLINK by BonusLink',
    akp: 'Her',
    kl: 'kolesa.kz',
    bfw: 'Finya',
    ij: 'Revolut',
    bvi: 'Salams',
    gf: 'GoogleVoice',
    bas: 'Stoiximan',
    axb: 'TrueID',
    bdr: 'Yara Farmcare',
    aex: 'Neon',
    blm: 'Epic Games',
    km: 'Rozetka',
    aba: 'Rappi',
    xs: 'GroupMe',
    dp: 'ProtonMail',
    zm: 'OfferUp',
    bra: 'Touch n Go TNG',
    bgj: 'MoonPay',
    bon: 'RetailMeNot',
    aje: 'CupidMedia',
    bxw: 'Credinex',
    axn: 'FastMoss',
    mt: 'Steam',
    et: 'Clubhouse',
    ajy: 'All Access',
    mx: 'SoulApp',
    bls: 'WeTV',
    avj: 'SumUp',
    abo: 'WEBDE',
    brk: 'Indeed',
    btn: 'Itau',
    bsl: 'Oskelly',
    agx: 'MeiQFashion',
    bn: 'Alfagift',
    bhr: 'Dil Mil',
    sr: 'Starbucks',
    ip: 'Burger King',
    qx: 'WorldRemit',
    kf: 'Weibo',
    ht: 'Bitso',
    bfv: 'Chocofamily',
    tr: 'Paysend',
    brc: 'Casa it',
    dg: 'Mercari',
    anx: 'InfinitePay',
    pr: 'Trendyol',
    abg: 'PagBank',
    ann: 'Bradesco',
    zb: 'FreeNow',
    akl: 'DOKU',
    co: 'Rediffmail',
    bay: 'Genome',
    jq: 'Paysafecard',
    adt: 'willhaben',
    gq: 'Freelancer',
    ls: 'Careem',
    zo: 'Kaggle',
    bfg: 'EMAG',
    ti: 'cryptocom',
    akd: 'Feels',
    avb: 'Tealive',
    pu: 'Justdating',
    blp: 'MEEFF',
    axp: 'ChargePoint',
    ani: 'Talabat',
    btv: 'Radiate',
    aoe: 'Sendwave',
    lj: 'Santander',
    bgx: 'Paxel',
    anq: 'Hitnspin',
    bbm: 'TrueMoney',
    bvs: 'Вчасно',
    fh: 'Lalamove',
    aor: 'OKX',
    ako: 'Ryde',
    my: 'CAIXA',
    sw: 'NCsoft',
    ge: 'Paytm',
    aci: 'Colombian Cupid',
    zh: 'Zoho',
    qh: 'Oriflame',
    fw: '99acres',
    ajq: 'MyValue',
    abq: 'Upwork',
    bwa: 'Hostinger',
    afs: 'Privalia',
    apr: 'Capital One',
    bbl: 'Autodesk',
    aon: 'Binance',
    aru: 'UNNI 강남언니',
    arf: 'Enjoei',
    bwe: 'Immutable Play',
    alp: 'Mera Gaon',
    bxv: 'PAPER',
    ace: 'Tata Neu',
    apd: '2dehands',
    bpq: 'MChat',
    ii: 'CashKaro',
    ama: 'WooPlus',
    rt: 'hily',
    abn: 'Bybit',
    aoi: 'Cryptonow',
    dr: 'OpenAI',
    ci: 'redBus',
    nq: 'Trip',
    qt: 'MoneyСontrol',
    gr: 'Astropay',
    jx: 'Swiggy',
    aok: 'NETELLER',
    bgn: 'Veeka',
    gs: 'SamsungShop',
    yy: 'Venmo',
    agk: 'Ipsos iSay',
    atn: 'Fawry',
    avm: 'Instacart',
    acr: 'QwikCilver',
    akj: 'Easycash',
    ang: 'TOMORO COFFEE',
    bmd: 'VooV Meeting',
    zl: 'Airtel',
    bob: 'Shell GO',
    asq: 'Warpcast',
    ie: 'bet365',
    aix: 'Move It',
    bjz: 'Jeevansathi',
    acu: 'CityMall',
    afe: 'GovBr',
    alo: 'Profee',
    aup: 'Botim',
    vs: 'WinzoGame',
    aps: 'Skelbiu',
    aiz: 'Brevo',
    zy: 'Nttgame',
    aav: 'Alchemy',
    bwu: 'SkyBet',
    cp: 'Uklon',
    kq: 'FotoCasa',
    btl: 'D4',
    hb: 'Twitch',
    bxj: 'Quero-Quero PAG',
    nl: 'Myntra',
    qq: 'Tencent QQ',
    bai: 'SNKRDUNK',
    beo: 'BigPay',
    brv: '999 md',
    ae: 'myGLO',
    bmi: 'Sisal',
    amz: 'ImmoScout24',
    ape: 'Toutiao',
    ex: 'Linode',
    yn: 'Allegro',
    adi: 'Zepto',
    bpt: 'SerpApi',
    aow: 'Geekay',
    avk: 'Quoka',
    bbi: 'aiqfome',
    bry: 'Mobile DE',
    bjq: 'Surveyon',
    bsv: 'AmarthaFin',
    bl: 'BIGO LIVE',
    ck: 'BeReal',
    auh: 'KeeTa 美团',
    aay: 'JioMart',
    anm: 'CaltexGO',
    app: 'ClassPass',
    aol: 'Paysera',
    bwo: 'KabanchikUA',
    cm: 'Prom',
    fd: 'Mamba',
    yq: 'mail.com',
    alm: 'Muzz',
    bbk: 'FilipinoCupid',
    bsa: 'will',
    awz: 'PlayTime',
    bol: 'My TELUS',
    wc: 'Craigslist',
    bqb: 'Weex',
    bxr: 'AlFursan',
    alb: 'Guiche Web',
    aeg: 'Flowwow',
    aua: '同程旅行 Tongcheng Travel',
    bqp: 'Zara',
    ly: 'Olacabs',
    bwt: 'Stanleybet',
    mw: 'Transfergo',
    aze: 'beehiiv',
    bfr: 'Dott',
    bxs: 'LikeCard',
    qy: 'Zhihu',
    xg: 'FortunaSK',
    acd: 'Cloud.ru',
    ah: 'EscapeFromTarkov',
    kg: 'FreeChargeApp',
    blr: 'DocuSign',
    zd: 'Zilch',
    bk: 'G2G',
    acw: 'YouDo',
    ayb: 'AsianDating',
    bem: 'Shafa',
    bli: 'Scalapay',
    brr: 'LemFi',
    btx: 'Amap 高德地图',
    qe: 'GG',
    yu: 'Xiaomi',
    aiq: 'Prime Opinion',
    aoh: 'YooMoney',
    axr: 'Match',
    us: 'IRCTC',
    anw: 'Premmia',
    bsj: 'Pagaleve',
    ef: 'Nextdoor',
    xu: 'RecargaPay',
    ank: 'Garena',
    ayc: 'HungerStation',
    ais: 'DiDiFood',
    bjp: 'Ria',
    oe: 'Codashop',
    xj: 'White Calling',
    auw: '3Fun',
    bhg: 'Telz',
    abe: 'Foodora',
    aid: 'Kwiff',
    amb: 'Vercel',
    em: 'ZéDelivery',
    afm: 'myboost',
    cv: 'WashXpress',
    aea: 'HungryPanda',
    zp: 'Pinduoduo',
    auz: 'Outlier',
    agc: 'VIMpay',
    aqb: 'Pinoy Peso',
    bbu: 'InternationalCupid',
    bfh: 'Finom',
    bxm: 'Prezzee',
    il: 'IQOS',
    agw: 'Adverts',
    bkk: 'Poparide',
    bvx: 'Lagkagehuset',
    akr: 'Voi',
    bua: 'Mistral AI',
    aty: 'FRND',
    bye: 'WhatsApp Business',
    ahe: 'Bunq',
    apg: 'Damai',
    arn: 'GFK',
    vd: 'Betfair',
    agd: 'Grailed',
    ns: 'Oldubil',
    bdn: 'Teman Prima',
    bp: 'GoFundMe',
    aom: 'Monzo',
    bgc: 'AJIO',
    beh: 'LUUP',
    ve: 'Dream11',
    abh: 'UOL Host',
    aoz: 'ReclameAQUI',
    ard: 'Maya',
    ul: 'Getir',
    bpc: 'LOVOO',
    bxf: 'Disney Plus',
    dc: 'YikYak',
    nh: 'AlloBank',
    wv: 'AIS',
    abs: 'Playerzpot',
    aly: 'Bebeclub',
    ax: 'CrefisaMais',
    bd: 'X5ID',
    bgf: 'Rapido',
    bni: 'Pets4Homes',
    bsz: 'Sling Money',
    bvp: 'Forte',
    byg: 'Jeton',
    eb: 'Voltz',
    jo: 'SticPay',
    zx: 'CommunityGaming',
    aas: 'XXGame',
    ahi: 'Daki',
    api: 'KKTIX',
    ave: 'BizneX',
    aya: 'Gopay',
    bbf: 'Neosurf',
    bej: 'KERETAKU',
    bom: 'Solcredito',
    brn: 'Tune AI',
    fg: 'IndianOil',
    hp: 'Meesho',
    kp: 'HQ Trivia',
    qd: 'Taobao',
    ss: 'hezzl',
    we: 'DrugVokrug',
    ys: 'ZCity',
    abi: 'BytePlus',
    adq: 'Uzum',
    aip: 'AfreecaTV',
    aqe: 'PeraMoo',
    atr: 'RIDE',
    awq: 'Atlas Earth',
    bci: 'Pesobox',
    bjk: 'ElectroPay',
    bqc: 'Wigl',
    bso: 'PayWell',
    bvb: 'Uphold',
    ir: 'Chispa',
    tp: 'IndiaGold',
    aeu: 'TheFork',
    amp: 'VerifyKit',
    apa: 'Exness',
    axq: 'Eventbrite',
    bko: 'Vision Plus',
    bod: 'Genspark',
    btk: 'Mais Store',
    cb: 'Bazos',
    gz: 'LYKA',
    um: 'Belwest',
    yi: 'Yemeksepeti',
    adg: 'Yono777',
    afx: 'Gamesofa',
    alc: 'Facily',
    ast: 'THXapp',
    awg: 'Natura Avon',
    ayn: 'Lime',
    bf: 'Keybase',
    bik: 'Hanwha Life',
    bpp: 'Bliq',
    bsd: 'Codeium',
    bug: '2GO',
    bxg: 'BAT',
    fs: 'Şikayet var',
    kx: 'Vivo',
    qo: 'Moneylion',
    ww: 'BIP',
    abt: 'ArenaPlus',
    aei: 'Sharyat',
    ago: 'Servify',
    aoo: 'Pegasus Airlines',
    aub: 'Smitten',
    bac: 'IndiaMart',
    bda: 'The Simple Peso',
    bqr: 'ASAAS',
    btb: 'SM Malls Online',
    byj: 'Sorpa',
    lz: 'Things',
    oq: 'Vlife',
    rs: 'Lotus',
    akm: 'LOTTE Mart',
    anj: 'Gemini',
    apk: 'Liberty',
    ary: 'Presto',
    avi: 'Oye Turtle',
    bbg: 'Square',
    bhy: 'HighLevel',
    sv: 'Dostavista',
    wg: 'Skout',
    agh: 'Getnet',
    aqf: 'Coze',
    atv: '快手 Kuaishou',
    awr: 'KCEX',
    azf: 'Welocalize',
    bck: 'Onion Academy 洋葱学园',
    bjl: 'Digio',
    bmh: 'Welink',
    bqd: 'EasyPark',
    bss: 'Trade Republic',
    bvc: 'ELEV8',
    dq: 'IceCasino',
    gd: 'Surveytime',
    iy: 'FoodHub',
    ll: '888casino',
    oc: 'DealShare',
    rc: 'Skype',
    zn: 'Biedronka',
    aa: 'Probo',
    aev: 'Inshallah',
    aha: 'Angel One',
    ak: 'Douyu',
    amw: 'Tise',
    arh: 'Super Ace',
    aus: 'PalawanPay',
    baz: 'Christian Filipina',
    bgz: 'Deloitte',
    bky: 'Tesco',
    boe: 'HP Gas Vitran',
    bwf: 'MyGo',
    ch: 'Pocket52',
    vy: 'Meta',
    abd: 'BeBoo',
    adh: 'Frizza',
    ai: 'CELEBe',
    apt: 'Airwallex',
    awh: 'NGCASH',
    ayo: '360Kredi',
    bbq: 'Chime',
    bfa: 'Webmotors',
    bil: 'SafeW',
    bui: 'OKbet',
    th: 'WestStein',
    ze: 'Shpock',
    ael: 'Cloud Manager',
    agr: 'Driffle',
    aqu: 'KBX',
    axh: 'TAOVIP',
    bdd: 'BetMen',
    bgl: 'DeLorean Labs',
    bnp: 'Airba Fresh',
    bqs: 'CGV',
    btc: 'Depinsim',
    bvt: 'SoCo',
    byl: 'Nala',
    ud: 'Disney Hotstar',
    vj: 'Stormgain',
    zz: 'DENT',
    aaw: 'Aya Bank',
    acx: 'VCollective',
    afk: 'Chevron',
    ahm: 'Eureka',
    apl: 'Sideline',
    bbh: 'Qbet',
    bi: '勇仕网络Ys4fun',
    blk: 'HDI',
    bou: '汇旺 Huione Pay',
    btz: 'IRWIN',
    fj: 'Potato Chat',
    kr: 'Eyecon',
    agi: 'Njuškalo',
    alq: 'Etsy',
    aqg: 'Publix',
    atw: 'DeepSeek',
    bqi: 'Datanyze',
    bsu: 'Dingtone',
    bvd: 'SOCIALMATTE',
    ja: 'Weverse',
    ari: 'Ring4',
    axs: 'AIS PLAY',
    bb: 'LazyPay',
    bds: 'رسال resal',
    bkz: 'Rewardy',
    bog: 'France Mobilities',
    bre: 'Лемана ПРО',
    btm: 'ZeeNow',
    bwi: 'CIMB',
    hc: 'MOMO',
    mp: 'Winmasters',
    pp: 'Huya',
    sl: 'robota.ua',
    ali: 'StockyDodo',
    ata: 'Authy',
    awj: 'HyperJar',
    ayt: 'Roqqu',
    bbr: 'WalletHub',
    bix: 'Hotel101',
    bsk: 'Web3Auth',
    buk: 'NABIS',
    bxl: 'Findom',
    xc: 'SynotTip',
    abv: 'PlayZone',
    agv: 'DoneDeal',
    aqz: 'BlazeTech',
    aud: 'bkSMS',
    axl: 'Viralmu',
    bgm: 'BlockPicks',
    bkf: 'myXL',
    bqt: 'PENTA',
    btd: 'Volcengine 火山引擎',
    bvu: 'SwaRail',
    bym: 'Yonder',
    oy: 'CashFly',
    ru: 'HOP',
    xv: 'Wish',
    aax: 'Boyaa',
    acy: 'Airtime',
    aho: 'Upland',
    anl: 'AttaPoll',
    apm: 'Index',
    ayf: 'ITV',
    ber: 'Gumtree',
    bid: 'Hablax',
    bow: 'Affirm',
    bu: 'MonobankIndia',
    ait: 'FeetFinder',
    aqh: 'Rayobyte',
    atx: 'Winee3',
    bcw: 'Online Check Writer',
    bfz: 'Snapmint',
    bmm: 'Hey Cash',
    bqk: 'Lex',
    byc: 'Vantage',
    lt: 'BitClout',
    oh: 'MapleSEA',
    rh: 'Ace2Three',
    aab: 'BharatPe',
    acj: 'TeriMeriChoice',
    an: 'Adidas',
    ark: 'SageMaker Studio Lab',
    axu: 'Sipay',
    bba: 'SwitchUp',
    bdt: 'HOT51',
    bhh: 'Appen',
    boh: 'Yophone',
    bwk: 'Sorted Wallet',
    hl: 'Band',
    ms: 'NovaPoshta',
    uz: 'OffGamers',
    yp: 'Payzapp',
    abf: 'Parimatch',
    adk: 'Khatabook',
    aig: 'Five Surveys',
    alk: 'HUGESoft',
    ao: 'UU163',
    awl: 'KitaBeli',
    ayw: 'E4B',
    biy: 'TaDa',
    blx: '2ememain',
    bpz: 'Just Eat',
    bul: 'Openbank',
    nr: 'Tosla',
    qu: 'Agroinform',
    zj: 'ROBINHOOD',
    aeq: 'Godrej',
    ajn: 'Gopuff',
    amh: 'MitID',
    aox: 'Aukro',
    ara: 'Shareful',
    baq: 'Redbubble',
    bdh: 'Singledk',
    bqv: 'Yuzu',
    bte: 'CROCOBET',
    en: 'Hermes',
    mc: 'Michat',
    oz: 'Poshmark',
    ry: 'McDonalds',
    afp: 'VFS GLOBAL',
    ahq: 'Bitget',
    asm: 'PH777',
    avl: 'BRImo BRI',
    ayh: 'GB Wallet',
    bbj: 'OnePay',
    bet: 'Fibank',
    bih: 'Indosaku',
    box: 'Thumbtack',
    bs: 'TradeUP',
    bx: 'Dosi',
    fl: 'RummyLoot',
    ku: 'RoyalWin',
    tc: 'Rumbler',
    abp: 'D5BET',
    aec: 'AaHIRA Fashion',
    aiv: 'Remitly',
    alt: 'Segari',
    aqj: 'BigBasket',
    aww: 'Pecunpay',
    ba: 'Expressmoney',
    bgb: 'EZMatch',
    bjr: 'Pony',
    bms: 'Playpark',
    bqn: 'Upward',
    bsx: 'KulturPass',
    bvm: 'Тикетон',
    du: 'AUBANK',
    jj: 'Aitu',
    lw: 'MrGreen',
    xm: 'Letual',
    zr: 'Papara',
    aag: 'Pockit',
    aki: 'tiketcom',
    anf: 'ZoomInfo',
    bbb: 'dscout',
    bdw: 'Valora',
    bhq: 'Solitaire Cash',
    blb: 'foundit',
    bok: 'Riobet',
    brl: 'Paperspace',
    btr: 'Duet',
    hn: 'Bonia',
    so: 'RummyWealth',
    adl: 'EarnEasy',
    aoa: 'Hicard',
    aqc: 'Omne by FWD',
    awn: 'DialMyCalls',
    ayx: 'C24 Bank',
    bfi: 'wcode',
    biz: 'BeCharge',
    bqa: 'AirAsia MOVE',
    bsm: 'Ahlan',
    buq: '로드나인 LORDNINE',
    bxq: 'OURO',
    dn: 'Paxful',
    lh: '24betting',
    xe: 'GalaxyChat',
    acb: 'Spark Driver',
    aer: 'PlayerAuctions',
    aml: 'Xbox',
    aoy: 'PLN Mobile',
    arb: 'Las Vegas Casino',
    aul: 'Alignable',
    axo: 'Fanatics Live',
    bkm: 'MoneyHelp',
    bqx: 'Club Q8',
    btf: 'Blackbird',
    byv: 'Dutch Bros',
    gw: 'CallApp',
    sa: 'AGIBANK',
    vp: 'Kwai',
    xz: 'paycell',
    aaz: 'Ozan',
    ad: 'Iti',
    afr: 'Ultragaz',
    ahv: 'Curve',
    ala: 'GetResponse',
    asp: 'PhonePe',
    ayk: 'Radquest',
    bev: 'ITN',
    bii: 'MEXC',
    bue: '映客 inke',
    bxe: 'Bitexen',
    cx: 'Icrypex',
    fo: 'MobiKwik',
    hy: 'Ininal',
    kv: 'Rush',
    ng: 'FunPay',
    ql: 'CMTcuzdan',
    te: 'eFood',
    wt: 'IZI',
    aed: 'Booking.com',
    alw: 'Vida',
    aql: 'Xigua Video 西瓜视频',
    atz: 'Air India',
    baa: 'Wirex',
    bcy: 'Finplus',
    bju: 'Odix Pay',
    bqo: 'Caffe Nero',
    bsy: 'Air Miles',
    bvn: 'Globo',
    dy: 'Zomato',
    gm: 'Mocospace',
    jn: 'CloudBet',
    lx: 'DewuPoison',
    oj: 'LoveRu',
    rm: 'Faberlic',
    xr: 'Tango',
    aaq: 'Netease',
    ahf: 'GAIL`s Bakery',
    aph: 'Openbudget',
    ars: 'Bingo Plus',
    avd: 'NCA888',
    axz: 'WarPin',
    bbe: 'Branch'
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly countryMapService: CountryMapService,
  ) {}

  async updateMarkupPercentage(percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 1000) {
      throw new BadRequestException('Markup percentage must be between 0 and 1000');
    }
    await this.prisma.markup.upsert({
      where: { id: 1 },
      update: { percentage, updatedAt: new Date() },
      create: { id: 1, percentage, createdAt: new Date(), updatedAt: new Date() },
    });
    this.logger.log(`Markup percentage updated to ${percentage}%`);
    await this.fetchAndCacheServicePrices();
  }

  async setMarkupPercentage(percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 1000) {
      throw new BadRequestException('Markup percentage must be between 0 and 1000');
    }
    await this.prisma.markup.upsert({
      where: { id: 1 },
      update: { percentage, updatedAt: new Date() },
      create: { id: 1, percentage, createdAt: new Date(), updatedAt: new Date() },
    });
    this.logger.log(`Markup percentage set to ${percentage}%`);
  }

  async getMarkupPercentage(): Promise<number> {
    const markup = await this.prisma.markup.findFirst({ where: { id: 1 } });
    return markup?.percentage || 0;
  }

  async fetchAndCacheServicePrices(): Promise<void> {
    const apiKey = this.configService.get('smsActivate.apiKey');
    const exchangeRate = parseFloat(this.configService.get('usdBrlExchangeRate') || '5.5');
    const adminMarkupPercentage = await this.getMarkupPercentage();
    const priceRecords: Array<{ service: string; country: string; priceUsd: number; priceBrl: number }> = [];

    const countryMap = await this.countryMapService.getCountryMap();
    const countryCodes = Object.keys(countryMap);
    this.logger.log(`Country map has ${countryCodes.length} countries: ${countryCodes.join(', ')}`);

    this.logger.log(`Fetching prices for all countries and services`);

    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.smsActivateApiUrl}?api_key=${apiKey}&action=getPrices`),
      );
      const prices = response.data;
      this.logger.debug(`Fetched SMS-Activate prices: ${JSON.stringify(prices, null, 2)}`);

      if (!prices || typeof prices !== 'object') {
        throw new BadRequestException('Invalid SMS-Activate prices response');
      }

      const countryIds = Object.keys(prices);
      this.logger.log(`Found ${countryIds.length} country IDs from SMS-Activate API: ${countryIds.join(', ')}`);

      for (const countryId of countryIds) {
        if (!countryCodes.includes(countryId)) {
          this.logger.warn(`Country ID ${countryId} not found in countryMap, skipping`);
          continue;
        }
        const services = prices[countryId];
        if (!services || typeof services !== 'object') {
          this.logger.warn(`No services found for country ID: ${countryId}`);
          continue;
        }
        const serviceCodes = Object.keys(services);
        this.logger.debug(`Country ${countryId} has ${serviceCodes.length} services: ${serviceCodes.join(', ')}`);
        for (const service of serviceCodes) {
          const priceData = services[service];
          const priceUsdBase = parseFloat(priceData.cost);
          if (isNaN(priceUsdBase) || priceUsdBase <= 0) {
            this.logger.warn(`Invalid price for country: ${countryId}, service: ${service}, cost: ${priceData.cost}`);
            continue;
          }

          const priceUsd = priceUsdBase * this.FIXED_MARKUP;
          const priceBrl = priceUsd * exchangeRate * (1 + adminMarkupPercentage / 100);
          priceRecords.push({
            service: service,
            country: countryId,
            priceUsd: parseFloat(priceUsd.toFixed(2)),
            priceBrl: parseFloat(priceBrl.toFixed(2)),
          });
        }
      }

      if (priceRecords.length === 0) {
        this.logger.warn('No valid prices found from SMS-Activate API after processing, but proceeding with empty cache');
      } else {
        await this.prisma.$transaction([
          this.prisma.servicePrice.deleteMany(),
          this.prisma.servicePrice.createMany({ data: priceRecords }),
        ]);
        this.logger.log(`Cached ${priceRecords.length} service prices with 50% fixed markup and ${adminMarkupPercentage}% admin markup`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch SMS-Activate prices: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch SMS-Activate prices: ${error.message}`);
    }
  }

  async getServicePrice(service: string, country: string): Promise<{ priceBrl: number; priceUsd: number }> {
    let price = await this.prisma.servicePrice.findFirst({
      where: { service, country },
    });
    if (!price) {
      this.logger.warn(`Price not found for service=${service}, country=${country}. Triggering price refresh.`);
      await this.fetchAndCacheServicePrices();
      price = await this.prisma.servicePrice.findFirst({
        where: { service, country },
      });
      if (!price) {
        throw new BadRequestException(`Price not found for service ${service} and country ${country} after refresh.`);
      }
    }
    return { priceBrl: price.priceBrl, priceUsd: price.priceUsd };
  }

  async getAllServicePrices(): Promise<Array<{ service: string; serviceName: string; country: string; priceBrl: number; priceUsd: number }>> {
    const prices = await this.prisma.servicePrice.findMany({
      select: { service: true, country: true, priceBrl: true, priceUsd: true },
    });
    if (prices.length === 0) {
      this.logger.warn('No prices available in cache');
    }
    this.logger.log(`Returning ${prices.length} service prices`);
    return prices.map(price => ({
      ...price,
      serviceName: this.SERVICE_NAME_MAP[price.service] || price.service
    }));
  }

  async getPaginatedServicePrices(
    limit: number,
    offset: number,
    includeTotal: boolean = false
  ): Promise<Array<{ service: string; serviceName: string; country: string; priceBrl: number; priceUsd: number }> | { prices: Array<{ service: string; serviceName: string; country: string; priceBrl: number; priceUsd: number }>; total: number }> {
    // Limitar o limite máximo para evitar sobrecarga
    const safeLimit = Math.min(limit, 10000);
    const safeOffset = Math.max(offset, 0);

    const queryPromise = this.prisma.servicePrice.findMany({
      select: { service: true, country: true, priceBrl: true, priceUsd: true },
      orderBy: { service: 'asc' },
      take: safeLimit,
      skip: safeOffset,
    });

    if (includeTotal) {
      const [prices, total] = await Promise.all([
        queryPromise,
        this.prisma.servicePrice.count()
      ]);
      
      const pricesWithNames = prices.map(price => ({
        ...price,
        serviceName: this.SERVICE_NAME_MAP[price.service] || price.service
      }));
      
      this.logger.log(`Returning ${prices.length} service prices (${safeOffset + 1}-${safeOffset + prices.length} of ${total})`);
      return { prices: pricesWithNames, total };
    } else {
      const prices = await queryPromise;
      const pricesWithNames = prices.map(price => ({
        ...price,
        serviceName: this.SERVICE_NAME_MAP[price.service] || price.service
      }));
      this.logger.log(`Returning ${prices.length} service prices (${safeOffset + 1}-${safeOffset + prices.length})`);
      return pricesWithNames;
    }
  }

  async getFilteredServicePrices(
    where: { service?: string[]; country?: string[] },
    limit: number,
    offset: number,
  ): Promise<Array<{ service: string; serviceName: string; country: string; priceBrl: number; priceUsd: number }>> {
    const query: any = {};
    if (where.service?.length) query.service = { in: where.service };
    if (where.country?.length) query.country = { in: where.country };
    
    // Limitar o limite máximo para evitar sobrecarga
    const safeLimit = Math.min(limit, 10000);
    const safeOffset = Math.max(offset, 0);
    
    const prices = await this.prisma.servicePrice.findMany({
      where: query,
      select: { service: true, country: true, priceBrl: true, priceUsd: true },
      orderBy: { service: 'asc' },
      take: safeLimit,
      skip: safeOffset,
    });
    this.logger.log(`Returning ${prices.length} filtered service prices for query: ${JSON.stringify(query)}`);
    return prices.map(price => ({
      ...price,
      serviceName: this.SERVICE_NAME_MAP[price.service] || price.service
    }));
  }

  async getFilteredServicePricesWithTotal(
    where: { service?: string[]; country?: string[] },
    limit: number,
    offset: number,
    includeTotal: boolean = false
  ): Promise<Array<{ service: string; serviceName: string; country: string; priceBrl: number; priceUsd: number }> | { prices: Array<{ service: string; serviceName: string; country: string; priceBrl: number; priceUsd: number }>; total: number }> {
    const query: any = {};
    if (where.service?.length) query.service = { in: where.service };
    if (where.country?.length) query.country = { in: where.country };
    
    // Limitar o limite máximo para evitar sobrecarga
    const safeLimit = Math.min(limit, 10000);
    const safeOffset = Math.max(offset, 0);

    const queryPromise = this.prisma.servicePrice.findMany({
      where: query,
      select: { service: true, country: true, priceBrl: true, priceUsd: true },
      orderBy: { service: 'asc' },
      take: safeLimit,
      skip: safeOffset,
    });

    if (includeTotal) {
      const [prices, total] = await Promise.all([
        queryPromise,
        this.prisma.servicePrice.count({ where: query })
      ]);
      
      const pricesWithNames = prices.map(price => ({
        ...price,
        serviceName: this.SERVICE_NAME_MAP[price.service] || price.service
      }));
      
      this.logger.log(`Returning ${prices.length} filtered service prices (${safeOffset + 1}-${safeOffset + prices.length} of ${total}) for query: ${JSON.stringify(query)}`);
      return { prices: pricesWithNames, total };
    } else {
      const prices = await queryPromise;
      const pricesWithNames = prices.map(price => ({
        ...price,
        serviceName: this.SERVICE_NAME_MAP[price.service] || price.service
      }));
      this.logger.log(`Returning ${prices.length} filtered service prices (${safeOffset + 1}-${safeOffset + prices.length}) for query: ${JSON.stringify(query)}`);
      return pricesWithNames;
    }
  }

  async getFilteredServicePricesByName(
    serviceNameFilter: string,
    limit: number,
    offset: number,
    includeTotal: boolean = false
  ): Promise<Array<{ service: string; serviceName: string; country: string; priceBrl: number; priceUsd: number }> | { prices: Array<{ service: string; serviceName: string; country: string; priceBrl: number; priceUsd: number }>; total: number }> {
    // Find service codes that match the name filter
    const matchingServices = Object.entries(this.SERVICE_NAME_MAP)
      .filter(([code, name]) => name.toLowerCase().includes(serviceNameFilter.toLowerCase()))
      .map(([code]) => code);

    if (matchingServices.length === 0) {
      if (includeTotal) {
        return { prices: [], total: 0 };
      }
      return [];
    }

    const query = { service: { in: matchingServices } };
    const safeLimit = Math.min(limit, 10000);
    const safeOffset = Math.max(offset, 0);

    const queryPromise = this.prisma.servicePrice.findMany({
      where: query,
      select: { service: true, country: true, priceBrl: true, priceUsd: true },
      orderBy: { service: 'asc' },
      take: safeLimit,
      skip: safeOffset,
    });

    if (includeTotal) {
      const [prices, total] = await Promise.all([
        queryPromise,
        this.prisma.servicePrice.count({ where: query })
      ]);
      
      const pricesWithNames = prices.map(price => ({
        ...price,
        serviceName: this.SERVICE_NAME_MAP[price.service] || price.service
      }));
      
      this.logger.log(`Returning ${prices.length} filtered service prices by name (${safeOffset + 1}-${safeOffset + prices.length} of ${total}) for filter: ${serviceNameFilter}`);
      return { prices: pricesWithNames, total };
    } else {
      const prices = await queryPromise;
      const pricesWithNames = prices.map(price => ({
        ...price,
        serviceName: this.SERVICE_NAME_MAP[price.service] || price.service
      }));
      this.logger.log(`Returning ${prices.length} filtered service prices by name (${safeOffset + 1}-${safeOffset + prices.length}) for filter: ${serviceNameFilter}`);
      return pricesWithNames;
    }
  }

  async getFilteredServicePricesByCountryName(
    countryNameFilter: string,
    limit: number,
    offset: number,
    includeTotal: boolean = false
  ): Promise<Array<{ service: string; serviceName: string; country: string; priceBrl: number; priceUsd: number }> | { prices: Array<{ service: string; serviceName: string; country: string; priceBrl: number; priceUsd: number }>; total: number }> {
    // Mapeamento de nomes de países para IDs (baseado no countries.json do frontend)
    const countryNameToIdMap: Record<string, string> = {
      'russia': '0', 'ukraine': '1', 'kazakhstan': '2', 'china': '3', 'philippines': '4',
      'myanmar': '5', 'indonesia': '6', 'malaysia': '7', 'kenya': '8', 'tanzania': '9',
      'vietnam': '10', 'kyrgyzstan': '11', 'united states': '12', 'israel': '13', 'hong kong': '14',
      'poland': '15', 'united kingdom': '16', 'madagascar': '17', 'congo': '18', 'nigeria': '19',
      'macao': '20', 'egypt': '21', 'india': '22', 'ireland': '23', 'cambodia': '24',
      'laos': '25', 'haiti': '26', 'ivory coast': '27', 'gambia': '28', 'serbia': '29',
      'yemen': '30', 'south africa': '31', 'romania': '32', 'colombia': '33', 'estonia': '34',
      'azerbaijan': '35', 'canada': '36', 'morocco': '37', 'ghana': '38', 'argentina': '39',
      'uzbekistan': '40', 'cameroon': '41', 'chad': '42', 'germany': '43', 'lithuania': '44',
      'croatia': '45', 'sweden': '46', 'iraq': '47', 'netherlands': '48', 'latvia': '49',
      'austria': '50', 'belarus': '51', 'thailand': '52', 'saudi arabia': '53', 'mexico': '54',
      'taiwan': '55', 'spain': '56', 'iran': '57', 'algeria': '58', 'slovenia': '59',
      'bangladesh': '60', 'senegal': '61', 'turkmenistan': '62', 'norway': '63', 'palestine': '64',
      'finland': '65', 'portugal': '66', 'greece': '67', 'czech republic': '68', 'dominican republic': '69',
      'guatemala': '70', 'luxembourg': '71', 'jordan': '72', 'georgia': '73', 'brazil': '74',
      'sri lanka': '75', 'peru': '76', 'pakistan': '77', 'new zealand': '78', 'guinea': '79',
      'moldova': '80', 'ecuador': '81', 'france': '82', 'armenia': '83', 'italy': '84',
      'tunisia': '85', 'bolivia': '86', 'cuba': '87', 'burundi': '88', 'gabon': '89',
      'switzerland': '90', 'rwanda': '91', 'benin': '92', 'somalia': '93', 'chile': '94',
      'turkey': '95', 'nepal': '96', 'venezuela': '97', 'mongolia': '98', 'south korea': '99',
      'united arab emirates': '100', 'australia': '101', 'cyprus': '102', 'japan': '103', 'denmark': '104',
      'paraguay': '105', 'lebanon': '106', 'jamaica': '107', 'honduras': '108', 'macedonia': '109',
      'nicaragua': '110', 'kuwait': '111', 'el salvador': '112', 'libya': '113', 'panama': '114',
      'costa rica': '115', 'belize': '116', 'trinidad and tobago': '117', 'montenegro': '118', 'syria': '119',
      'qatar': '120', 'bahrain': '121', 'hungary': '122', 'malawi': '123', 'albania': '124',
      'fiji': '125', 'ethiopia': '126', 'mali': '127', 'mozambique': '128', 'mauritius': '129',
      'seychelles': '130', 'comoros': '131', 'mayotte': '132', 'reunion': '133', 'saint helena': '134',
      'ascension island': '135', 'tristan da cunha': '136', 'british indian ocean territory': '137'
    };

    // Find country IDs that match the name filter
    const matchingCountries = Object.entries(countryNameToIdMap)
      .filter(([name, id]) => name.toLowerCase().includes(countryNameFilter.toLowerCase()))
      .map(([name, id]) => id);

    if (matchingCountries.length === 0) {
      if (includeTotal) {
        return { prices: [], total: 0 };
      }
      return [];
    }

    const query = { country: { in: matchingCountries } };
    const safeLimit = Math.min(limit, 10000);
    const safeOffset = Math.max(offset, 0);

    const queryPromise = this.prisma.servicePrice.findMany({
      where: query,
      select: { service: true, country: true, priceBrl: true, priceUsd: true },
      orderBy: { service: 'asc' },
      take: safeLimit,
      skip: safeOffset,
    });

    if (includeTotal) {
      const [prices, total] = await Promise.all([
        queryPromise,
        this.prisma.servicePrice.count({ where: query })
      ]);
      
      const pricesWithNames = prices.map(price => ({
        ...price,
        serviceName: this.SERVICE_NAME_MAP[price.service] || price.service
      }));
      
      this.logger.log(`Returning ${prices.length} filtered service prices by country name (${safeOffset + 1}-${safeOffset + prices.length} of ${total}) for filter: ${countryNameFilter}`);
      return { prices: pricesWithNames, total };
    } else {
      const prices = await queryPromise;
      const pricesWithNames = prices.map(price => ({
        ...price,
        serviceName: this.SERVICE_NAME_MAP[price.service] || price.service
      }));
      this.logger.log(`Returning ${prices.length} filtered service prices by country name (${safeOffset + 1}-${safeOffset + prices.length}) for filter: ${countryNameFilter}`);
      return pricesWithNames;
    }
  }

  async updateSingleServicePrice(service: string, country: string, priceBrl: number, priceUsd: number): Promise<void> {
    const existingPrice = await this.prisma.servicePrice.findFirst({
      where: { service, country },
    });

    if (!existingPrice) {
      throw new BadRequestException(`Price not found for service ${service} and country ${country}`);
    }

    await this.prisma.servicePrice.updateMany({
      where: { service, country },
      data: { 
        priceBrl: parseFloat(priceBrl.toFixed(2)), 
        priceUsd: parseFloat(priceUsd.toFixed(2)) 
      },
    });

    this.logger.log(`Updated single price for service=${service}, country=${country} to BRL=${priceBrl}, USD=${priceUsd}`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePriceRefreshCron() {
    this.logger.log('Running daily price refresh cron job');
    await this.fetchAndCacheServicePrices();
    this.logger.log('Daily price refresh completed');
  }

  async getAllAvailableServices(): Promise<string[]> {
    try {
      const services = await this.prisma.servicePrice.findMany({
        select: { service: true },
        distinct: ['service'],
        orderBy: { service: 'asc' }
      });
      
      const serviceList = services.map(s => s.service);
      this.logger.log(`Found ${serviceList.length} available services in database`);
      return serviceList;
    } catch (error) {
      this.logger.error(`Error getting all services: ${error.message}`);
      throw error;
    }
  }

  async getServiceCountriesCount(): Promise<{ [service: string]: number }> {
    try {
      const counts = await this.prisma.servicePrice.groupBy({
        by: ['service'],
        _count: {
          country: true
        }
      });
      
      const result: { [service: string]: number } = {};
      counts.forEach(item => {
        result[item.service] = item._count.country;
      });
      
      this.logger.log(`Found countries count for ${Object.keys(result).length} services`);
      return result;
    } catch (error) {
      this.logger.error(`Error getting service countries count: ${error.message}`);
      throw error;
    }
  }

  async getServicePrices(service: string, limit: number = 1000): Promise<any[]> {
    try {
      const safeLimit = Math.min(limit, 10000);
      const prices = await this.prisma.servicePrice.findMany({
        where: { service },
        take: safeLimit,
        orderBy: { priceBrl: 'asc' }
      });
      
      const result = prices.map(price => ({
        service: price.service,
        country: price.country,
        priceBrl: price.priceBrl,
        priceUsd: price.priceUsd,
        serviceName: this.SERVICE_NAME_MAP[price.service] || price.service.toUpperCase()
      }));
      
      this.logger.log(`Found ${result.length} prices for service ${service}`);
      return result;
    } catch (error) {
      this.logger.error(`Error getting service prices for ${service}: ${error.message}`);
      throw error;
    }
  }
}