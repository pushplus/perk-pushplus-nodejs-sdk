import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import {
  PageQuery,
  PageResult,
  UserDefaultDetail,
  UserDefaultItem,
  UserDefaultSaveRequest,
} from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 功能设置（文档「九. 功能设置接口」）。
 */
export class SettingApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 1. 获取默认配置列表。 */
  listUserDefault(q?: PageQuery): Promise<PageResult<UserDefaultItem>> {
    return this.executeOpen<PageResult<UserDefaultItem>>('POST', '/api/open/setting/listUserDefault', q ?? {});
  }

  /** 2. 默认配置详情。 */
  detailUserDefault(id: number): Promise<UserDefaultDetail> {
    return this.executeOpen<UserDefaultDetail>(
      'GET',
      this.appendQuery('/api/open/setting/detailUserDefault', { id }),
    );
  }

  /** 3. 新增默认配置。 */
  async addUserDefault(req: UserDefaultSaveRequest): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/setting/addUserDefault', req);
  }

  /** 4. 修改默认配置。 */
  async editUserDefault(req: UserDefaultSaveRequest): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/setting/editUserDefault', req);
  }

  /** 5. 删除默认配置。 */
  async deleteUserDefault(id: number): Promise<void> {
    await this.executeOpen<unknown>(
      'DELETE',
      this.appendQuery('/api/open/setting/deleteUserDefault', { id }),
    );
  }

  /**
   * 6. 修改接收消息限制。
   *
   * @param recevieLimit 0-接收全部，1-不接收消息
   */
  async changeReceiveLimit(recevieLimit: number): Promise<void> {
    await this.executeOpen<unknown>(
      'GET',
      this.appendQuery('/api/open/setting/changeRecevieLimit', { recevieLimit }),
    );
  }

  /**
   * 7. 开启/关闭发送消息功能。
   *
   * @param isSend 0-禁用，1-启用
   */
  async changeIsSend(isSend: number): Promise<void> {
    await this.executeOpen<unknown>(
      'GET',
      this.appendQuery('/api/open/setting/changeIsSend', { isSend }),
    );
  }

  /**
   * 8. 修改打开消息方式。
   *
   * @param openMessageType 0:H5，1:小程序
   */
  async changeOpenMessageType(openMessageType: number): Promise<void> {
    await this.executeOpen<unknown>(
      'GET',
      this.appendQuery('/api/open/setting/changeOpenMessageType', { openMessageType }),
    );
  }

  /**
   * 9. 修改插件渠道转发。
   *
   * @param forward 0:否，1:是
   */
  async changeExtensionForward(forward: number): Promise<void> {
    await this.executeOpen<unknown>(
      'GET',
      this.appendQuery('/api/open/setting/extension', { forward }),
    );
  }
}
