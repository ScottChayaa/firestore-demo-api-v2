import { Controller, Get, Post, Body, Param, Req, HttpException } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { PinoLogger } from 'nestjs-pino';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: PinoLogger,
  ) {}

  @Public()
  @Get('hello')
  getRoot() {
    // 測試不同日誌級別
    this.logger.trace('This is trace level');
    this.logger.debug('This is debug level');
    this.logger.info({ message: 'Root endpoint accessed', details: ['test', 'data'] });
    this.logger.warn('This is warning level');

    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  // 測試 POST 請求
  @Public()
  @Post('test/echo')
  testEcho(@Body() body: any) {
    return {
      message: 'Echo response',
      receivedBody: body,
      timestamp: new Date().toISOString(),
    };
  }

  // 測試帶 params 的 URI
  @Public()
  @Get('test/users/:userId')
  testGetUser(@Param('userId') userId: string) {
    return {
      message: 'User details',
      userId,
      timestamp: new Date().toISOString(),
    };
  }

  // 測試帶多個 params 的 URI
  @Public()
  @Get('test/users/:userId/orders/:orderId')
  testGetUserOrder(
    @Param('userId') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return {
      message: 'Order details',
      userId,
      orderId,
      timestamp: new Date().toISOString(),
    };
  }

  // 測試錯誤處理 (500)
  @Public()
  @Get('test/error/500')
  testError500() {
    throw new HttpException('Internal Server Error Test', 500);
  }
}
