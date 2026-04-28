import { ResolvedPushPlusConfig } from './config';
import { ErrorCode } from './enums';
import { PushPlusError } from './exception';

/**
 * 本地限流守卫：当 PushPlus 服务端返回 ErrorCode.RATE_LIMITED（code=900）时，
 * 在内存里按 token 维度记录"解禁时间"，期间任何发送类调用都会直接抛 PushPlusError，
 * 不再发起 HTTP，避免继续打到上游浪费请求并加重账号限制。
 *
 * 对应官方文档建议：https://www.pushplus.plus/doc/guide/code.html
 *
 * 默认禁推到「次日 0 点」自动解禁；也可以通过 rateLimitCooldownMs 配置一个固定时长。
 *
 * 仅本地视角：服务端实际禁推时长可能与本地估算不同（文档示例为 2 天）。
 */
export class RateLimitGuard {
  private readonly enabled: boolean;
  private readonly cooldownMs: number;
  private readonly blockedUntil = new Map<string, number>();

  constructor(config: ResolvedPushPlusConfig) {
    this.enabled = config.rateLimitGuardEnabled;
    this.cooldownMs = config.rateLimitCooldownMs;
  }

  /**
   * 在发起发送类请求前调用：若当前 token 处于限流期，直接抛 PushPlusError
   * （code = ErrorCode.RATE_LIMITED），不会发起 HTTP。
   */
  check(token: string | undefined | null): void {
    if (!this.enabled) return;
    const key = this.normalize(token);
    if (!key) return;
    const until = this.blockedUntil.get(key);
    if (until == null) return;
    const now = Date.now();
    if (now < until) {
      throw new PushPlusError(
        `PushPlus 本地限流守卫：当前 token 已命中 code=900，` +
          `在 ${new Date(until).toISOString()} 之前不再发起请求（请参考官方文档减少无用请求）`,
        ErrorCode.RATE_LIMITED,
      );
    }
    this.blockedUntil.delete(key);
  }

  /**
   * 在收到服务端 code=900 后调用：登记限流状态，直到 cooldownUntil 到期。
   */
  markBlocked(token: string | undefined | null): void {
    if (!this.enabled) return;
    const key = this.normalize(token);
    if (!key) return;
    const until = this.cooldownUntil(Date.now());
    this.blockedUntil.set(key, until);
  }

  /** 仅供测试或运维手动清除（例如已确认服务端解禁）。 */
  clear(token: string | undefined | null): void {
    const key = this.normalize(token);
    if (key) this.blockedUntil.delete(key);
  }

  /** 返回该 token 的解禁时间（毫秒时间戳）；未被限流则为 null。 */
  blockedUntilAt(token: string | undefined | null): number | null {
    const key = this.normalize(token);
    if (!key) return null;
    const until = this.blockedUntil.get(key);
    return until ?? null;
  }

  /**
   * 计算解禁时间：
   * - cooldownMs > 0 时使用 now + cooldownMs；
   * - 否则使用「系统默认时区的次日 0 点」。
   */
  private cooldownUntil(now: number): number {
    if (this.cooldownMs && this.cooldownMs > 0) {
      return now + this.cooldownMs;
    }
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d.getTime();
  }

  private normalize(token: string | undefined | null): string | null {
    if (token == null) return null;
    const t = String(token).trim();
    return t.length === 0 ? null : t;
  }
}
