import { ErrorCode, errorCodeFromValue, isRateLimitedCode } from './enums';

/**
 * PushPlus SDK 统一运行时异常。
 *
 * 该异常会在以下场景抛出：
 * - HTTP 请求失败（网络异常、非 2xx 状态码）
 * - PushPlus 业务接口返回 code != 200
 * - JSON 序列化/反序列化异常
 * - SDK 参数校验失败
 * - 本地限流守卫命中（code=900 后被短路），不会真正发起 HTTP 请求
 */
export class PushPlusError extends Error {
  /** PushPlus 接口返回的业务 code。HTTP 错误时为对应的 HTTP 状态码；其他为 -1。 */
  public readonly code: number;

  /** 同 message。便于和其它语言 SDK 风格一致。 */
  public get businessMessage(): string {
    return this.message;
  }

  constructor(message: string, code: number = -1, options?: { cause?: unknown }) {
    super(message);
    this.name = 'PushPlusError';
    this.code = code;
    if (options?.cause !== undefined) {
      // Node 16+ 支持 Error cause
      (this as any).cause = options.cause;
    }
    // 修复部分环境下 instanceof 失效问题
    Object.setPrototypeOf(this, PushPlusError.prototype);
  }

  /** 把数值 code 映射为 ErrorCode 枚举（未知为 UNKNOWN）。 */
  get errorCode(): ErrorCode {
    return errorCodeFromValue(this.code);
  }

  /** 是否为 PushPlus 限流（code=900）。命中后建议当天停止继续调用发送消息接口。 */
  isRateLimited(): boolean {
    return isRateLimitedCode(this.code);
  }
}

/**
 * 兼容 Java SDK 命名（PushPlusException）的别名导出。
 */
export const PushPlusException = PushPlusError;
