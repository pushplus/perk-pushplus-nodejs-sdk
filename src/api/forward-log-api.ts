import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import { ForwardLogDetail, ForwardLogItem, ForwardLogListQuery, PageResult } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 消息规则触发记录（文档「十四. 消息规则接口」第 10、11 节）。
 */
export class ForwardLogApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 获取触发记录列表。 */
  list(q?: ForwardLogListQuery): Promise<PageResult<ForwardLogItem>> {
    return this.executeOpen<PageResult<ForwardLogItem>>('POST', '/api/open/forwardLog/list', q ?? {});
  }

  /** 查看触发记录详情。 */
  detail(logId: number): Promise<ForwardLogDetail> {
    return this.executeOpen<ForwardLogDetail>(
      'GET',
      this.appendQuery('/api/open/forwardLog/detail', { logId }),
    );
  }
}
