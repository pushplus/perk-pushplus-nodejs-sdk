import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import { SendCount, UserInfo, UserLimitTime } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 用户接口（文档「三. 用户接口」）。
 */
export class UserApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 获取用户 token。 */
  getToken(): Promise<string> {
    return this.executeOpen<string>('GET', '/api/open/user/token');
  }

  /** 个人资料详情。 */
  myInfo(): Promise<UserInfo> {
    return this.executeOpen<UserInfo>('GET', '/api/open/user/myInfo');
  }

  /** 获取解封剩余时间。 */
  getLimitTime(): Promise<UserLimitTime> {
    return this.executeOpen<UserLimitTime>('GET', '/api/open/user/userLimitTime');
  }

  /** 查询当日消息接口请求次数。 */
  getSendCount(): Promise<SendCount> {
    return this.executeOpen<SendCount>('GET', '/api/open/user/sendCount');
  }
}
