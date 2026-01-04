import { Transform } from 'class-transformer';

/**
 * 将查询参数字符串转换为 boolean
 *
 * 支持的值：
 * - 'true', '1', 'yes' => true
 * - 'false', '0', 'no', '' => false
 * - undefined, null => undefined
 *
 * @example
 * ```typescript
 * export class QueryDto {
 *   @IsOptional()
 *   @ToBoolean()
 *   @IsBoolean()
 *   isActive?: boolean;
 * }
 * ```
 */
export function ToBoolean() {
  return Transform(
    ({ value }) => {
      // undefined 或 null 直接返回 undefined（表示未提供该参数）
      if (value === undefined || value === null) {
        return undefined;
      }

      // 如果已经是 boolean 类型，直接返回
      // 这处理了某些情况下值已经被转换的场景
      if (typeof value === 'boolean') {
        return value;
      }

      // 处理字符串（query string 的标准形式）
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

      // 处理数字类型（虽然 query string 通常不会是数字，但为了健壮性）
      if (typeof value === 'number') {
        return value !== 0;
      }

      // 其他未知情况返回 undefined，让验证器报错
      return undefined;
    },
    { toClassOnly: true }, // 只在 plain-to-class 转换时应用
  );
}
