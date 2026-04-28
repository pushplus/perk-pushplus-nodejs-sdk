import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import { PageQuery, PageResult, WebhookItem, WebhookSaveRequest } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - webhook 渠道配置（文档「七. 渠道配置接口」 1-4）。
 */
export class WebhookApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  list(q?: PageQuery): Promise<PageResult<WebhookItem>> {
    return this.executeOpen<PageResult<WebhookItem>>('POST', '/api/open/webhook/list', q ?? {});
  }

  detail(webhookId: number): Promise<WebhookItem> {
    return this.executeOpen<WebhookItem>(
      'GET',
      this.appendQuery('/api/open/webhook/detail', { webhookId }),
    );
  }

  /** 新增 webhook，返回新 id。 */
  add(req: WebhookSaveRequest): Promise<number> {
    return this.executeOpen<number>('POST', '/api/open/webhook/add', req);
  }

  edit(req: WebhookSaveRequest): Promise<string> {
    return this.executeOpen<string>('POST', '/api/open/webhook/edit', req);
  }
}
