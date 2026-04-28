import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import {
  MessageTokenAddRequest,
  MessageTokenEditRequest,
  MessageTokenItem,
  MessageTokenOption,
  PageQuery,
  PageResult,
} from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 消息 token（文档「四. 消息token接口」）。
 */
export class MessageTokenApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 获取消息 token 列表。 */
  list(query?: PageQuery): Promise<PageResult<MessageTokenItem>> {
    return this.executeOpen<PageResult<MessageTokenItem>>('POST', '/api/open/token/list', query ?? {});
  }

  /** 新增消息 token，返回新建的 token 字符串。 */
  add(req: MessageTokenAddRequest): Promise<string> {
    return this.executeOpen<string>('POST', '/api/open/token/add', req);
  }

  /** 修改消息 token。 */
  edit(req: MessageTokenEditRequest): Promise<string> {
    return this.executeOpen<string>('POST', '/api/open/token/edit', req);
  }

  /** 删除消息 token。 */
  delete(id: number): Promise<string> {
    const path = this.appendQuery('/api/open/token/deleteToken', { id });
    return this.executeOpen<string>('DELETE', path);
  }

  /**
   * 消息 token 下拉选择列表。
   *
   * @param type 0-返回所有；1-返回未配置默认推送渠道的消息 token
   */
  selectList(type?: number): Promise<MessageTokenOption[]> {
    const path = this.appendQuery('/api/open/token/selectTokenList', { type: type ?? 0 });
    return this.executeOpen<MessageTokenOption[]>('GET', path);
  }
}
