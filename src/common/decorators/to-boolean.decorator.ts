import { Transform } from 'class-transformer';

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
  return Transform(({ value }) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return Boolean(value);
  });
}
