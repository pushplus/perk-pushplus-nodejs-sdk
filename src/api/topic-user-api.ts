import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import { PageResult, TopicUserBlacklistItem, TopicUserItem, TopicUserListQuery } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 群组用户（文档「六. 群组用户接口」）。
 */
export class TopicUserApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 1. 获取群组内用户。 */
  subscriberList(query: TopicUserListQuery): Promise<PageResult<TopicUserItem>> {
    return this.executeOpen<PageResult<TopicUserItem>>('POST', '/api/open/topicUser/subscriberList', query);
  }

  /** 2. 删除群组内用户。 */
  deleteUser(topicRelationId: number): Promise<string> {
    const path = this.appendQuery('/api/open/topicUser/deleteTopicUser', { topicRelationId });
    return this.executeOpen<string>('POST', path);
  }

  /** 3. 修改订阅人备注。 */
  async editRemark(id: number, remark: string): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/topicUser/editRemark', { id, remark });
  }

  /**
   * 4. 将订阅人加入黑名单。
   *
   * 加入后将移出群组，对方无法再加入该群组。积分群组不支持黑名单。不能将自己加入黑名单。
   *
   * @param topicRelationId 用户编号（订阅人列表中的 id 字段）
   */
  async addBlacklist(topicRelationId: number): Promise<void> {
    const path = this.appendQuery('/api/open/topicUser/addBlacklist', { topicRelationId });
    await this.executeOpen<unknown>('POST', path);
  }

  /**
   * 5. 订阅人黑名单列表。
   *
   * `query.params.topicId` 必填。
   */
  blacklistList(query: TopicUserListQuery): Promise<PageResult<TopicUserBlacklistItem>> {
    return this.executeOpen<PageResult<TopicUserBlacklistItem>>(
      'POST',
      '/api/open/topicUser/blacklistList',
      query,
    );
  }

  /**
   * 6. 解除订阅人黑名单。
   *
   * 解除后不会自动恢复群组订阅，对方可重新加入该群组。
   *
   * @param id 黑名单记录 ID（黑名单列表中的 id 字段）
   */
  async removeBlacklist(id: number): Promise<void> {
    await this.executeOpen<unknown>(
      'POST',
      this.appendQuery('/api/open/topicUser/removeBlacklist', { id }),
    );
  }
}
