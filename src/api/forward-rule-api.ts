import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import {
  ForwardRuleDetail,
  ForwardRuleItem,
  ForwardRuleSaveRequest,
  ForwardRuleSetting,
  ForwardRuleTestRequest,
  ForwardRuleTestResult,
  PageQuery,
  PageResult,
} from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 消息规则（文档「十四. 消息规则接口」）。注：需开通会员后才能开启。
 */
export class ForwardRuleApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 获取消息规则列表。 */
  list(q?: PageQuery): Promise<PageResult<ForwardRuleItem>> {
    return this.executeOpen<PageResult<ForwardRuleItem>>('POST', '/api/open/forwardRule/list', q ?? {});
  }

  /** 查看消息规则详情。 */
  detail(ruleId: number): Promise<ForwardRuleDetail> {
    return this.executeOpen<ForwardRuleDetail>(
      'GET',
      this.appendQuery('/api/open/forwardRule/detail', { ruleId }),
    );
  }

  /** 新增消息规则。 */
  async add(req: ForwardRuleSaveRequest): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/forwardRule/add', req);
  }

  /** 修改消息规则；会整体覆盖模板变量和发送目标。 */
  async edit(req: ForwardRuleSaveRequest): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/forwardRule/edit', req);
  }

  /** 删除消息规则。 */
  async delete(ruleId: number): Promise<void> {
    await this.executeOpen<unknown>(
      'DELETE',
      this.appendQuery('/api/open/forwardRule/delete', { ruleId }),
    );
  }

  /**
   * 启用 / 停用消息规则。
   *
   * @param status 1-启用，0-停用
   */
  async changeStatus(ruleId: number, status: number): Promise<void> {
    await this.executeOpen<unknown>(
      'GET',
      this.appendQuery('/api/open/forwardRule/changeStatus', { ruleId, status }),
    );
  }

  /** 用模拟请求测试规则，不会真正发送消息。 */
  test(req: ForwardRuleTestRequest): Promise<ForwardRuleTestResult> {
    return this.executeOpen<ForwardRuleTestResult>('POST', '/api/open/forwardRule/test', req);
  }

  /** 获取消息规则总开关模式。 */
  getSetting(): Promise<ForwardRuleSetting> {
    return this.executeOpen<ForwardRuleSetting>('GET', '/api/open/forwardRule/setting');
  }

  /**
   * 设置消息规则总开关模式。
   *
   * @param mode 0-关闭，1-开启且未命中仍推送，2-开启且未命中不推送
   */
  async saveSetting(mode: number): Promise<void> {
    await this.executeOpen<unknown>(
      'GET',
      this.appendQuery('/api/open/forwardRule/setting', { mode }),
    );
  }
}
