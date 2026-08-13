import { AccessKeyManager } from './access-key-manager';
import { AccessKeyApi } from './api/access-key-api';
import { ChannelApi } from './api/channel-api';
import { ClawBotApi } from './api/clawbot-api';
import { DocApi } from './api/doc-api';
import { ExcelApi } from './api/excel-api';
import { FormApi } from './api/form-api';
import { FriendApi } from './api/friend-api';
import { ImageApi } from './api/image-api';
import { MessageApi } from './api/message-api';
import { MessageTokenApi } from './api/message-token-api';
import { OpenMessageApi } from './api/open-message-api';
import { PreApi } from './api/pre-api';
import { SettingApi } from './api/setting-api';
import { TopicApi } from './api/topic-api';
import { TopicUserApi } from './api/topic-user-api';
import { UserApi } from './api/user-api';
import { WebhookApi } from './api/webhook-api';
import { PushPlusConfig, ResolvedPushPlusConfig, resolveConfig } from './config';
import { PushPlusError } from './exception';
import { FetchHttpRequester, HttpRequester } from './http';
import { BatchSendRequest, BatchSendResult, SendRequest } from './models';
import { RateLimitGuard } from './rate-limit';

export interface PushPlusClientOptions extends PushPlusConfig {
  /** 自定义 HTTP 客户端实现。 */
  httpRequester?: HttpRequester;
}

/**
 * PushPlus SDK 统一入口。
 *
 * 兼容 Node.js（>=18 内置 fetch）与浏览器环境。
 *
 * @example 快速开始
 * ```ts
 * import { PushPlusClient } from '@perk-net/perk-pushplus-sdk';
 *
 * const client = new PushPlusClient({
 *   token: 'your_user_token',
 *   secretKey: 'your_secret_key',  // 调用开放接口才需要
 * });
 *
 * // 发送消息
 * const shortCode = await client.sendSimple('标题', 'Hello PushPlus');
 *
 * // 调用开放接口（无需手动管理 AccessKey）
 * const info = await client.user.myInfo();
 * ```
 */
export class PushPlusClient {
  /** 已解析的不可变配置。 */
  readonly config: ResolvedPushPlusConfig;
  readonly httpRequester: HttpRequester;
  readonly accessKeyManager: AccessKeyManager;
  readonly rateLimitGuard: RateLimitGuard;

  /* ---------------- 各 API ---------------- */
  readonly message: MessageApi;
  readonly accessKey: AccessKeyApi;
  readonly openMessage: OpenMessageApi;
  readonly user: UserApi;
  readonly messageToken: MessageTokenApi;
  readonly topic: TopicApi;
  readonly topicUser: TopicUserApi;
  readonly friend: FriendApi;
  readonly webhook: WebhookApi;
  readonly channel: ChannelApi;
  readonly clawBot: ClawBotApi;
  readonly setting: SettingApi;
  readonly pre: PreApi;
  readonly image: ImageApi;
  readonly form: FormApi;
  readonly doc: DocApi;
  readonly excel: ExcelApi;

  constructor(options: PushPlusClientOptions = {}) {
    this.config = resolveConfig(options);
    this.httpRequester = options.httpRequester ?? new FetchHttpRequester(this.config);
    this.rateLimitGuard = new RateLimitGuard(this.config);

    this.message = new MessageApi(this.config, this.httpRequester, this.rateLimitGuard);
    this.accessKey = new AccessKeyApi(this.config, this.httpRequester);
    this.accessKeyManager = new AccessKeyManager(this.config, this.accessKey);

    this.openMessage = new OpenMessageApi(this.config, this.httpRequester, this.accessKeyManager);
    this.user = new UserApi(this.config, this.httpRequester, this.accessKeyManager);
    this.messageToken = new MessageTokenApi(this.config, this.httpRequester, this.accessKeyManager);
    this.topic = new TopicApi(this.config, this.httpRequester, this.accessKeyManager);
    this.topicUser = new TopicUserApi(this.config, this.httpRequester, this.accessKeyManager);
    this.friend = new FriendApi(this.config, this.httpRequester, this.accessKeyManager);
    this.webhook = new WebhookApi(this.config, this.httpRequester, this.accessKeyManager);
    this.channel = new ChannelApi(this.config, this.httpRequester, this.accessKeyManager);
    this.clawBot = new ClawBotApi(this.config, this.httpRequester, this.accessKeyManager);
    this.setting = new SettingApi(this.config, this.httpRequester, this.accessKeyManager);
    this.pre = new PreApi(this.config, this.httpRequester, this.accessKeyManager);
    this.image = new ImageApi(this.config, this.httpRequester, this.accessKeyManager);
    this.form = new FormApi(this.config, this.httpRequester, this.accessKeyManager);
    this.doc = new DocApi(this.config, this.httpRequester, this.accessKeyManager);
    this.excel = new ExcelApi(this.config, this.httpRequester, this.accessKeyManager);
  }

  /** 与 Java SDK 风格一致的 Builder 入口。 */
  static builder(): PushPlusClientBuilder {
    return new PushPlusClientBuilder();
  }

  /** 工厂方法。 */
  static of(options: PushPlusClientOptions): PushPlusClient {
    return new PushPlusClient(options);
  }

  /* ============================== 便捷转发方法 ============================== */

  /** 发送一条简单消息（默认 wechat / html）。 */
  sendSimple(title: string | undefined, content: string): Promise<string> {
    return this.message.sendSimple(title, content);
  }

  /** 发送消息。 */
  send(req: SendRequest): Promise<string> {
    return this.message.send(req);
  }

  /** 多渠道发送消息。 */
  batchSend(req: BatchSendRequest): Promise<BatchSendResult[]> {
    return this.message.batchSend(req);
  }
}

/**
 * 链式 Builder，与 Java/Python SDK 风格保持一致。
 */
export class PushPlusClientBuilder {
  private readonly opt: PushPlusClientOptions = {};

  token(v?: string): this { this.opt.token = v; return this; }
  secretKey(v?: string): this { this.opt.secretKey = v; return this; }
  baseUrl(v?: string): this { this.opt.baseUrl = v; return this; }
  connectTimeoutMs(v: number): this { this.opt.connectTimeoutMs = v; return this; }
  readTimeoutMs(v: number): this { this.opt.readTimeoutMs = v; return this; }
  accessKeyRefreshAheadSeconds(v: number): this { this.opt.accessKeyRefreshAheadSeconds = v; return this; }
  logRequest(v: boolean): this { this.opt.logRequest = v; return this; }
  rateLimitGuardEnabled(v: boolean): this { this.opt.rateLimitGuardEnabled = v; return this; }
  rateLimitCooldownMs(v: number): this { this.opt.rateLimitCooldownMs = v; return this; }
  userAgent(v: string): this { this.opt.userAgent = v; return this; }
  httpRequester(req: HttpRequester): this { this.opt.httpRequester = req; return this; }

  build(): PushPlusClient {
    if (this.opt.token != null && this.opt.token.trim().length === 0) {
      throw new PushPlusError('token 不能为空字符串');
    }
    return new PushPlusClient(this.opt);
  }
}
