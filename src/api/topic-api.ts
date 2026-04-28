import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import {
  PageResult,
  TopicAddRequest,
  TopicDetail,
  TopicEditRequest,
  TopicItem,
  TopicListQuery,
  TopicQrCode,
} from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 群组接口（文档「五. 群组接口」）。
 */
export class TopicApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 1. 群组列表。 */
  list(query?: TopicListQuery): Promise<PageResult<TopicItem>> {
    return this.executeOpen<PageResult<TopicItem>>('POST', '/api/open/topic/list', query ?? {});
  }

  /** 2. 获取我创建的群组详情。 */
  detail(topicId: number): Promise<TopicDetail> {
    return this.executeOpen<TopicDetail>('GET', this.appendQuery('/api/open/topic/detail', { topicId }));
  }

  /** 3. 获取我加入的群详情。 */
  joinDetail(topicId: number): Promise<TopicDetail> {
    return this.executeOpen<TopicDetail>(
      'GET',
      this.appendQuery('/api/open/topic/joinTopicDetail', { topicId }),
    );
  }

  /** 4. 新增群组，返回新建群组编号。 */
  add(req: TopicAddRequest): Promise<number> {
    return this.executeOpen<number>('POST', '/api/open/topic/add', req);
  }

  /** 5. 修改群组。 */
  edit(req: TopicEditRequest): Promise<string> {
    return this.executeOpen<string>('POST', '/api/open/topic/editTopic', req);
  }

  /** 6. 获取群组二维码。 */
  qrCode(topicId: number, second?: number, scanCount?: number): Promise<TopicQrCode> {
    const params: Record<string, unknown> = { topicId };
    if (second != null) params.second = second;
    if (scanCount != null) params.scanCount = scanCount;
    return this.executeOpen<TopicQrCode>('GET', this.appendQuery('/api/open/topic/qrCode', params));
  }

  /** 7. 退出群组。 */
  exit(topicId: number): Promise<string> {
    return this.executeOpen<string>(
      'GET',
      this.appendQuery('/api/open/topic/exitTopic', { topicId }),
    );
  }

  /** 8. 删除群组。 */
  delete(topicId: number): Promise<string> {
    return this.executeOpen<string>('GET', this.appendQuery('/api/open/topic/delete', { topicId }));
  }

  /**
   * 9. 上下架积分群组。
   *
   * @param isOpen 1-上架，0-下架
   */
  setOpen(topicId: number, isOpen: number): Promise<string> {
    return this.executeOpen<string>('POST', '/api/open/topic/isOpen', { topic: topicId, isOpen });
  }
}
