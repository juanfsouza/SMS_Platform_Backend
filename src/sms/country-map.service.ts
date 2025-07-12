import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CountryMapService {
  private readonly logger = new Logger(CountryMapService.name);
  private readonly apiUrl = 'https://api.sms-activate.ae/stubs/handler_api.php';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getCountryMap(): Promise<Record<string, string>> {
    const apiKey = this.configService.get('smsActivate.apiKey');
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}?api_key=${apiKey}&action=getCountries`),
      );
      const countries = response.data;
      this.logger.debug(`getCountries response: ${JSON.stringify(countries)}`);

      const countryMap: Record<string, string> = {};
      Object.keys(countries).forEach((numericCode) => {
        const countryData = countries[numericCode];
        if (countryData && countryData.eng) {
          countryMap[numericCode] = countryData.eng.toLowerCase().replace(/\s+/g, '');
        }
      });
      this.logger.log(`Mapped ${Object.keys(countryMap).length} countries`);
      return countryMap;
    } catch (error) {
      this.logger.error(`Failed to fetch countries: ${error.message}`, error.stack);
      throw new Error(`Failed to fetch countries: ${error.message}`);
    }
  }
}