import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHello() {
    return {
      message: 'Firestore Demo API v2',
      version: this.configService.get<string>('imageVersion'),
      environment: this.configService.get<string>('nodeEnv'),
      port: this.configService.get<number>('port'),
    };
  }
}
