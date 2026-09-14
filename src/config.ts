/**
 * PushPlus SDK 全局配置。
 *
 * 通过 `PushPlusClient.builder()` 或直接 `new PushPlusClient(config)` 构建实例。
 * 所有字段都有合理默认值，仅 `token` 是发送消息接口必填、`secretKey` 是开放接口必填。
 */
export interface PushPlusConfig {
  /**
   * 用户 token 或消息 token，发送消息接口默认使用。
   * 注意：获取 AccessKey 必须使用用户 token。
   */
  token?: string;

  /**
   * 用户 secretKey，调用开放接口（获取 AccessKey）必填。
   * 在 pushplus 个人中心 -> 开发设置 中配置。
   */
  secretKey?: string;

  /**
   * 服务器基础地址。默认：https://www.pushplus.plus
   */
  baseUrl?: string;

  /** 连接超时（毫秒）。默认 10000。 */
  connectTimeoutMs?: number;

  /** 请求/读超时（毫秒）。默认 30000。 */
  readTimeoutMs?: number;

  /**
   * 在 AccessKey 过期前提前多少秒刷新。默认提前 5 分钟（300 秒），
   * 文档中提到老 AccessKey 在新 AccessKey 生成后 5 分钟内仍可用。
   */
  accessKeyRefreshAheadSeconds?: number;

  /** 是否启用请求/响应详细日志。默认关闭。 */
  logRequest?: boolean;

  /**
   * 是否启用本地限流守卫。默认开启。
   *
   * 开启后，当任意一次发送消息接口返回 code=900（请求次数过多）时，
   * 后续对同一 token 的发送调用会被 SDK 直接短路，不再发起 HTTP，
   * 直到 `rateLimitCooldownMs`（默认次日 0 点）到期。
   */
  rateLimitGuardEnabled?: boolean;

  /**
   * 命中 code=900 后的本地禁推时长（毫秒）。
   * 不传或 <=0 表示使用默认策略：到「次日 0 点」。
   *
   * 注意：服务端实际禁推时长可能更长（文档示例为 2 天）。
   */
  rateLimitCooldownMs?: number;

  /** 自定义 User-Agent。 */
  userAgent?: string;
}

/** PushPlus 默认服务地址。 */
export const DEFAULT_BASE_URL = 'https://www.pushplus.plus';

export interface ResolvedPushPlusConfig {
  token: string;
  secretKey: string;
  baseUrl: string;
  connectTimeoutMs: number;
  readTimeoutMs: number;
  accessKeyRefreshAheadSeconds: number;
  logRequest: boolean;
  rateLimitGuardEnabled: boolean;
  rateLimitCooldownMs: number;
  userAgent: string;
}

export function resolveConfig(input: PushPlusConfig | undefined | null): ResolvedPushPlusConfig {
  const cfg = input ?? {};
  const baseUrl = (cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  return {
    token: cfg.token ?? '',
    secretKey: cfg.secretKey ?? '',
    baseUrl: baseUrl || DEFAULT_BASE_URL,
    connectTimeoutMs: cfg.connectTimeoutMs ?? 10000,
    readTimeoutMs: cfg.readTimeoutMs ?? 30000,
    accessKeyRefreshAheadSeconds: cfg.accessKeyRefreshAheadSeconds ?? 300,
    logRequest: cfg.logRequest ?? false,
    rateLimitGuardEnabled: cfg.rateLimitGuardEnabled ?? true,
    rateLimitCooldownMs: cfg.rateLimitCooldownMs ?? 0,
    userAgent: cfg.userAgent ?? `@perk-net/perk-pushplus-sdk/1.2.4`,
  };
}
