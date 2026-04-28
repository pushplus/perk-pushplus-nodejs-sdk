import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { PushPlusError } from '../exception';
import { HttpRequester } from '../http';
import { MessageItem, PageQuery, PageResult, SendMessageResult } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 消息接口（文档「二. 消息接口」）。
 */
export class OpenMessageApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 1. 消息列表。 */
  list(query?: PageQuery): Promise<PageResult<MessageItem>> {
    return this.executeOpen<PageResult<MessageItem>>('POST', '/api/open/message/list', query ?? {});
  }

  /** 2. 查询消息发送结果。 */
  queryResult(shortCode: string): Promise<SendMessageResult> {
    if (!shortCode || shortCode.trim().length === 0) {
      throw new PushPlusError('shortCode 不能为空');
    }
    const path = this.appendQuery('/api/open/message/sendMessageResult', { shortCode });
    return this.executeOpen<SendMessageResult>('GET', path);
  }

  /** 3. 删除消息。 */
  delete(shortCode: string): Promise<string> {
    if (!shortCode || shortCode.trim().length === 0) {
      throw new PushPlusError('shortCode 不能为空');
    }
    const path = this.appendQuery('/api/open/message/deleteMessage', { shortCode });
    return this.executeOpen<string>('DELETE', path);
  }

  /**
   * 4. 消息详情（HTML 页面 URL）。
   *
   * 该接口直接返回 HTML 内容，SDK 仅返回访问 URL，调用方自行决定是否拉取页面内容。
   */
  detailUrl(shortCode: string): string {
    if (!shortCode || shortCode.trim().length === 0) {
      throw new PushPlusError('shortCode 不能为空');
    }
    return this.resolveUrl('/shortMessage/' + shortCode);
  }
}
