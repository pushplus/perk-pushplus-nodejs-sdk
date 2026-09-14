import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import { CmccInfo } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 新消息 ClawBot（文档「九. 新消息ClawBot接口」）。
 *
 * 需先在手机 5G 消息的「新消息ClawBot」应用号中获取 Channel API Key，再调用绑定接口。
 * 发送消息时 channel 传 `cmcc`。仅支持中国移动用户。
 */
export class CmccApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 1. 绑定新消息 ClawBot。apiKey 必须以 ak_ 或 app_ 开头。 */
  async bind(apiKey: string): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/cmcc/bind', { apiKey });
  }

  /** 2. 查询绑定状态。 */
  info(): Promise<CmccInfo> {
    return this.executeOpen<CmccInfo>('GET', '/api/open/cmcc/info');
  }

  /** 3. 解绑新消息 ClawBot。 */
  async unbind(): Promise<void> {
    await this.executeOpen<unknown>('GET', '/api/open/cmcc/unbind');
  }

  /** 4. 发送测试消息。未绑定会返回「未绑定新消息ClawBot」。 */
  async sendTest(): Promise<void> {
    await this.executeOpen<unknown>('GET', '/api/open/cmcc/test');
  }
}
