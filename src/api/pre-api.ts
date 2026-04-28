import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import { PageQuery, PageResult, PreDetail, PreItem, PreSaveRequest, PreTestRequest } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 预处理信息（文档「十一. 预处理信息接口」）。注：需开通会员。
 */
export class PreApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  list(q?: PageQuery): Promise<PageResult<PreItem>> {
    return this.executeOpen<PageResult<PreItem>>('POST', '/api/open/pre/list', q ?? {});
  }

  detail(preId: number): Promise<PreDetail> {
    return this.executeOpen<PreDetail>('GET', this.appendQuery('/api/open/pre/detail', { preId }));
  }

  add(req: PreSaveRequest): Promise<number> {
    return this.executeOpen<number>('POST', '/api/open/pre/add', req);
  }

  edit(req: PreSaveRequest): Promise<string> {
    return this.executeOpen<string>('POST', '/api/open/pre/edit', req);
  }

  delete(preId: number): Promise<string> {
    return this.executeOpen<string>(
      'DELETE',
      this.appendQuery('/api/open/pre/delete', { preId }),
    );
  }

  /** 测试预处理代码，返回处理后的消息。 */
  test(req: PreTestRequest): Promise<string> {
    return this.executeOpen<string>('POST', '/api/open/pre/test', req);
  }
}
