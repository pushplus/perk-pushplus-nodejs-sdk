import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import { FriendBlacklistItem, FriendItem, FriendQrCode, PageQuery, PageResult } from '../models';
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

  /**
   * 5. 将好友加入黑名单。
   *
   * 加入后将解除双方好友关系，对方无法再添加你。不能将自己加入黑名单，仅可将已有好友加入黑名单。
   *
   * @param friendId 好友 id（好友列表中的 friendId 字段）
   */
  async addBlacklist(friendId: number): Promise<void> {
    await this.executeOpen<unknown>(
      'POST',
      this.appendQuery('/api/open/friend/addBlacklist', { friendId }),
    );
  }

  /** 6. 好友黑名单列表。 */
  blacklistList(query?: PageQuery): Promise<PageResult<FriendBlacklistItem>> {
    return this.executeOpen<PageResult<FriendBlacklistItem>>(
      'POST',
      '/api/open/friend/blacklistList',
      query ?? {},
    );
  }

  /**
   * 7. 解除好友黑名单。
   *
   * 解除后不会自动恢复好友关系，需重新扫码添加。
   *
   * @param id 黑名单记录 ID（黑名单列表中的 id 字段）
   */
  async removeBlacklist(id: number): Promise<void> {
    await this.executeOpen<unknown>(
      'POST',
      this.appendQuery('/api/open/friend/removeBlacklist', { id }),
    );
  }
}
