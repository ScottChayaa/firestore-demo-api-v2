import { Transform, Type } from 'class-transformer';

/**
 * 将查询参数字符串转换为 boolean
 *
 * 支持的值：
 * - 'true', '1', 'yes' => true
 * - 'false', '0', 'no' => false
 * - undefined, null => undefined
 *
 * @example
 * ```typescript
 * export class QueryDto {
 *   @IsOptional()
 *   @IsBoolean()
 *   @ToBoolean()
 *   isActive?: boolean;
 * }
 * ```
 */
export function ToBoolean() {
  const toPlain = Transform(
    ({ value }) => {
      return value;
    },
    { toPlainOnly: true },
  );

  const toClass = (params: any) => {
    const value = params.value;

    if (value === undefined || value === null) {
      return undefined;
    }

    // 处理字符串（优先处理，因为 query string 都是字符串）
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();

      // 明确的 false 值
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') {
        return false;
      }

      // 明确的 true 值
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
    }

    // 如果已经是 boolean，直接返回
    if (typeof value === 'boolean') {
      return value;
    }

    // 数字类型
    if (typeof value === 'number') {
      return value !== 0;
    }

    // 其他情况，使用 Boolean 转换
    return Boolean(value);
  };

  return function (target: any, propertyKey: string) {
    Type(() => String)(target, propertyKey);
    Transform(toClass, { toClassOnly: true })(target, propertyKey);
    toPlain(target, propertyKey);
  };
}
