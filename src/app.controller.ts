import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
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
  @Get()
  getRoot() {
    // 測試不同日誌級別（PinoLogger 自動包含 reqId）
    this.logger.trace('This is trace level');
    this.logger.debug('This is debug level');
    this.logger.info({ message: 'Root endpoint accessed', details: ['test', 'data'] });
    this.logger.warn('This is warning level');

    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    this.logger.debug('This is debug level');

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  // 測試 POST 請求
  @Public()
  @Post('test/echo')
  testEcho(@Body() body: any, @Req() req: any) {
    this.logger.info({ body }, 'Echo request received');
    return {
      message: 'Echo response',
      receivedBody: body,
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    };
  }

  // 測試帶 params 的 URI
  @Public()
  @Get('test/users/:userId')
  testGetUser(@Param('userId') userId: string, @Req() req: any) {
    this.logger.info({ userId }, 'Get user by ID');
    return {
      message: 'User details',
      userId,
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    };
  }

  // 測試帶多個 params 的 URI
  @Public()
  @Get('test/users/:userId/orders/:orderId')
  testGetUserOrder(
    @Param('userId') userId: string,
    @Param('orderId') orderId: string,
    @Req() req: any,
  ) {
    this.logger.info({ userId, orderId }, 'Get user order');
    return {
      message: 'Order details',
      userId,
      orderId,
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    };
  }

  // 測試錯誤處理 (400)
  @Public()
  @Get('test/error/400')
  testError400() {
    this.logger.warn('Testing 400 error');
    throw new Error('Bad Request Test');
  }

  // 測試錯誤處理 (500)
  @Public()
  @Get('test/error/500')
  testError500() {
    this.logger.error('Testing 500 error');
    throw new Error('Internal Server Error Test');
  }
}
