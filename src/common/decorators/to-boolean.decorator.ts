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
  return Transform(
    ({ value }) => {
      if (value === undefined || value === null) {
        return undefined;
      }

      // 如果已经是 boolean，直接返回
      if (typeof value === 'boolean') {
        return value;
      }

      // 处理字符串
      if (typeof value === 'string') {
        const lower = value.toLowerCase().trim();

        // 明确的 true 值
        if (lower === 'true' || lower === '1' || lower === 'yes') {
          return true;
        }

        // 明确的 false 值
        if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') {
          return false;
        }
      }

      // 数字类型
      if (typeof value === 'number') {
        return value !== 0;
      }

      // 其他情况，使用 Boolean 转换
      return Boolean(value);
    },
    { toClassOnly: true }, // 只在 plain-to-class 转换时应用（即 DTO 验证时）
  );
}
