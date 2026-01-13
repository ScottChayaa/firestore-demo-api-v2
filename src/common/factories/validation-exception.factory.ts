import { BadRequestException, ValidationError } from '@nestjs/common';

/**
 * 自訂 ValidationPipe Exception Factory
 * 格式化 validation 錯誤訊息為結構化格式
 */
export function validationExceptionFactory(errors: ValidationError[]) {
  const formattedErrors = errors.map((error) => ({
    field: error.property,
    value: error.value,
    constraints: error.constraints,
  }));

  return new BadRequestException({
    statusCode: 400,
    message: '請求參數驗證失敗',
    errors: formattedErrors,
  });
}
