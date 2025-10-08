export interface SmsProviderConfig {
  name: 'sms-activate' | 'active-sms';
  apiUrl: string;
  buyEndpoint?: string;
  statusEndpoint?: string;
  webhookEndpoint?: string;
  authType: 'api-key' | 'bearer' | 'none';
  responseFormat: 'sms-activate' | 'active-sms';
}

export const SMS_PROVIDERS: Record<string, SmsProviderConfig> = {
  'sms-activate': {
    name: 'sms-activate',
    apiUrl: 'https://api.sms-activate.ae/stubs/handler_api.php',
    authType: 'api-key',
    responseFormat: 'sms-activate',
  },
  'active-sms': {
    name: 'active-sms',
    apiUrl: 'https://findexsms.com/sms',
    buyEndpoint: '/buy',
    statusEndpoint: '/status',
    authType: 'none',
    responseFormat: 'active-sms',
  },
};

export const getSmsProviderConfig = (providerName: string = 'active-sms'): SmsProviderConfig => {
  return SMS_PROVIDERS[providerName] || SMS_PROVIDERS['active-sms'];
};
