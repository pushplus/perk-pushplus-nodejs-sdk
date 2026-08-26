import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import {
  PageQuery,
  PageResult,
  QqBotBindInfo,
  QqBotBindLink,
  QqBotItem,
  QqBotSaveRequest,
  QqGroupItem,
} from '../models';
import { OpenAbstractApi } from './open-base';

/** 发送到 QQ 群，目前渠道配置仅支持该类型。 */
const SEND_TYPE_QQ_GROUP = 2;

/**
 * 开放接口 - QQ 机器人（文档「九. QQ机器人接口」）。
 */
export class QqBotApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 1. 获取绑定链接与绑定码；refresh 为 true 时旧绑定码失效并重新生成。 */
  getBindLink(refresh = false): Promise<QqBotBindLink> {
    const path = refresh
      ? this.appendQuery('/api/open/qqBot/getBindLink', { refresh: true })
      : '/api/open/qqBot/getBindLink';
    return this.executeOpen<QqBotBindLink>('GET', path);
  }

  /** 2. 查询绑定状态。 */
  botInfo(): Promise<QqBotBindInfo> {
    return this.executeOpen<QqBotBindInfo>('GET', '/api/open/qqBot/botInfo');
  }

  /** 3. 解绑 QQ 机器人。 */
  async unbind(): Promise<void> {
    await this.executeOpen<unknown>('GET', '/api/open/qqBot/unbind');
  }

  /** 4. 获取机器人已加入的 QQ 群列表。 */
  async groupList(): Promise<QqGroupItem[]> {
    return (await this.executeOpen<QqGroupItem[]>('GET', '/api/open/qqBot/groupList')) ?? [];
  }

  /** 5. 获取 QQ 机器人渠道配置列表。 */
  list(q?: PageQuery): Promise<PageResult<QqBotItem>> {
    return this.executeOpen<PageResult<QqBotItem>>('POST', '/api/open/qqBot/list', q ?? {});
  }

  /** 6. 新增渠道配置，用于把消息发送到指定 QQ 群；发给自己无需创建配置。 */
  async add(req: QqBotSaveRequest): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/qqBot/add', withDefaultSendType(req));
  }

  /** 7. 修改渠道配置；配置编码不可修改。 */
  async edit(req: QqBotSaveRequest): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/qqBot/edit', withDefaultSendType(req));
  }

  /** 8. 删除渠道配置。 */
  async delete(id: number): Promise<void> {
    await this.executeOpen<unknown>(
      'DELETE',
      this.appendQuery('/api/open/qqBot/delete', { id }),
    );
  }
}

function withDefaultSendType(req: QqBotSaveRequest): QqBotSaveRequest {
  return { ...req, sendType: req.sendType ?? SEND_TYPE_QQ_GROUP };
}
