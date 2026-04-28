import { ResolvedPushPlusConfig } from '../config';
import { PushPlusError } from '../exception';
import { HttpRequester } from '../http';
import { BatchSendRequest, BatchSendResult, SendRequest } from '../models';
import { RateLimitGuard } from '../rate-limit';
import { AbstractApi } from './base';

/**
 * 发送消息接口。
 *
 * 对应 PushPlus 文档「二. 发送消息接口」与「三. 多渠道发送消息接口」。
 *
 * 内置本地限流守卫：当上游返回 ErrorCode.RATE_LIMITED（code=900）时，
 * 后续对同一 token 的发送调用会在 SDK 内被直接短路抛 PushPlusError，
 * 不再发起 HTTP，直到守卫到期自动解除。
 */
export class MessageApi extends AbstractApi {
  private readonly rateLimitGuard: RateLimitGuard;

  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, rateLimitGuard: RateLimitGuard) {
    super(config, http);
    this.rateLimitGuard = rateLimitGuard;
  }

  /** 暴露限流守卫，便于运维场景手动 clear 或观察解禁时间。 */
  getRateLimitGuard(): RateLimitGuard {
    return this.rateLimitGuard;
  }

  /**
   * 发送单条消息。
   *
   * @returns 消息流水号
   */
  async send(request: SendRequest): Promise<string> {
    const req = this.withDefaultToken(request);
    validateSend(req);
    this.rateLimitGuard.check(req.token);
    return this.executeWithGuard(req.token, () =>
      this.executeForData<string>('POST', '/send', null, req),
    );
  }

  /**
   * 多渠道发送消息。
   */
  async batchSend(request: BatchSendRequest): Promise<BatchSendResult[]> {
    const req = this.withDefaultBatchToken(request);
    validateBatch(req);
    this.rateLimitGuard.check(req.token);
    return this.executeWithGuard(req.token, () =>
      this.executeForData<BatchSendResult[]>('POST', '/batchSend', null, req),
    );
  }

  /** 便捷方法：以默认渠道、默认模板发送一条简单消息。 */
  sendSimple(title: string | undefined, content: string): Promise<string> {
    return this.send({ title, content });
  }

  /* ============================== 内部辅助 ============================== */

  private async executeWithGuard<T>(token: string | undefined, call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (e) {
      if (e instanceof PushPlusError && e.isRateLimited()) {
        this.rateLimitGuard.markBlocked(token);
      }
      throw e;
    }
  }

  private withDefaultToken(req: SendRequest): SendRequest {
    if (req == null) throw new PushPlusError('SendRequest 不能为空');
    if (!req.token || req.token.trim().length === 0) {
      return { ...req, token: this.requireToken() };
    }
    return req;
  }

  private withDefaultBatchToken(req: BatchSendRequest): BatchSendRequest {
    if (req == null) throw new PushPlusError('BatchSendRequest 不能为空');
    if (!req.token || req.token.trim().length === 0) {
      return { ...req, token: this.requireToken() };
    }
    return req;
  }

  private requireToken(): string {
    const t = this.config.token;
    if (!t || t.trim().length === 0) {
      throw new PushPlusError('发送消息需要 token，但 PushPlusConfig.token 为空');
    }
    return t;
  }
}

function validateSend(req: SendRequest): void {
  if (!req.content || req.content.trim().length === 0) {
    throw new PushPlusError('发送消息 content 不能为空');
  }
}

function validateBatch(req: BatchSendRequest): void {
  if (!req.content || req.content.trim().length === 0) {
    throw new PushPlusError('批量发送消息 content 不能为空');
  }
}
