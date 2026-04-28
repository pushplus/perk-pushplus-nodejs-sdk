import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import { FriendItem, FriendQrCode, PageQuery, PageResult } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 好友功能（文档「十. 好友功能接口」）。
 */
export class FriendApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 1. 获取个人二维码。 */
  getQrCode(options: {
    appId?: string;
    content?: string;
    second?: number;
    scanCount?: number;
  }): Promise<FriendQrCode> {
    const p: Record<string, unknown> = {};
    if (options.appId != null) p.appId = options.appId;
    if (options.content != null) p.content = options.content;
    if (options.second != null) p.second = options.second;
    if (options.scanCount != null) p.scanCount = options.scanCount;
    return this.executeOpen<FriendQrCode>('GET', this.appendQuery('/api/open/friend/getQrCode', p));
  }

  /** 2. 获取好友列表。 */
  list(query?: PageQuery): Promise<PageResult<FriendItem>> {
    return this.executeOpen<PageResult<FriendItem>>('POST', '/api/open/friend/list', query ?? {});
  }

  /** 3. 删除好友。 */
  async delete(friendId: number): Promise<void> {
    await this.executeOpen<unknown>(
      'GET',
      this.appendQuery('/api/open/friend/deleteFriend', { friendId }),
    );
  }

  /** 4. 修改好友备注。 */
  async editRemark(id: number, remark: string): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/friend/editRemark', { id, remark });
  }
}
