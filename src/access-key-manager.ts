import { AccessKeyApi } from './api/access-key-api';
import { ResolvedPushPlusConfig } from './config';
import { PushPlusError } from './exception';

/**
 * AccessKey 管理器。
 *
 * 提供线程/异步并发安全的 AccessKey 缓存 + 过期前自动刷新能力。
 *
 * 在调用任意需要 access-key 的开放接口前，OpenAbstractApi 会自动通过本类拿到一个有效的 AccessKey。
 *
 * 刷新策略：在 expiresIn 到期前 `accessKeyRefreshAheadSeconds` 秒视为过期。
 * 文档说明老 key 在新 key 生成后 5 分钟内仍可用，因此默认 300 秒提前量足够安全。
 */
export class AccessKeyManager {
  private readonly config: ResolvedPushPlusConfig;
  private readonly api: AccessKeyApi;

  private cachedKey: string | null = null;
  /** 最早过期时间戳（毫秒，含提前量）；到达此刻必须刷新。 */
  private expireAtMs = 0;

  /** 并发刷新去重。 */
  private inflight: Promise<string> | null = null;

  constructor(config: ResolvedPushPlusConfig, api: AccessKeyApi) {
    this.config = config;
    this.api = api;
  }

  /** 获取有效的 AccessKey。如已缓存且未过期则直接返回；否则触发刷新。 */
  async getAccessKey(): Promise<string> {
    if (this.isValid()) return this.cachedKey as string;
    return this.refresh();
  }

  /** 强制刷新。多次并发调用时仅会真正发起一次刷新请求。 */
  refresh(): Promise<string> {
    if (this.isValid()) return Promise.resolve(this.cachedKey as string);
    if (this.inflight) return this.inflight;
    this.inflight = this.doRefresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  /** 失效缓存。下次调用 getAccessKey() 时会重新拉取。 */
  invalidate(): void {
    this.cachedKey = null;
    this.expireAtMs = 0;
  }

  private async doRefresh(): Promise<string> {
    const result = await this.api.getAccessKey();
    if (!result || !result.accessKey) {
      throw new PushPlusError('获取 AccessKey 失败：返回为空');
    }
    this.cachedKey = result.accessKey;
    const ttlSec = result.expiresIn ?? 7200;
    const aheadSec = Math.max(0, this.config.accessKeyRefreshAheadSeconds);
    const effectiveTtlSec = Math.max(1, ttlSec - aheadSec);
    this.expireAtMs = Date.now() + effectiveTtlSec * 1000;
    return this.cachedKey;
  }

  private isValid(): boolean {
    return this.cachedKey != null && Date.now() < this.expireAtMs;
  }
}
