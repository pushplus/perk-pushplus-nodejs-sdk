import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import {
  PageQuery,
  PageResult,
  QqBotBindInfo,
  QqBotBindLink,
  QqBotInfo,
  QqBotItem,
  QqBotSaveRequest,
  QqCustomBotRequest,
  QqGroupItem,
  QqMyBotList,
} from '../models';
import { OpenAbstractApi } from './open-base';

/** 渠道配置发送类型：发给自己（需指定 botAppId）。 */
export const SEND_TYPE_SELF = 1;

/** 渠道配置发送类型：发送到 QQ 群，未指定 sendType 时的默认值。 */
export const SEND_TYPE_QQ_GROUP = 2;

/**
 * 开放接口 - QQ 机器人（文档「十. QQ机器人接口」）。
 *
 * 除 pushplus 官方机器人外，用户还可以添加自有机器人；带 botAppId 参数的方法用于指定要操作的机器人，
 * 不传时按官方/默认机器人处理。
 */
export class QqBotApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 1. 获取绑定链接与绑定码；refresh 为 true 时旧绑定码失效并重新生成；botAppId 为空时为官方机器人。 */
  getBindLink(refresh = false, botAppId?: string): Promise<QqBotBindLink> {
    const path = this.appendQuery('/api/open/qqBot/getBindLink', {
      refresh: refresh ? true : undefined,
      botAppId: botAppId || undefined,
    });
    return this.executeOpen<QqBotBindLink>('GET', path);
  }

  /** 2. 查询绑定状态；botAppId 为空时为默认机器人。 */
  botInfo(botAppId?: string): Promise<QqBotBindInfo> {
    return this.executeOpen<QqBotBindInfo>('GET', this.withBotAppId('/api/open/qqBot/botInfo', botAppId));
  }

  /** 3. 解绑 QQ 机器人；botAppId 为空时解绑官方机器人。 */
  async unbind(botAppId?: string): Promise<void> {
    await this.executeOpen<unknown>('GET', this.withBotAppId('/api/open/qqBot/unbind', botAppId));
  }

  /** 4. 获取机器人已加入的 QQ 群列表；botAppId 为空时返回全部。 */
  async groupList(botAppId?: string): Promise<QqGroupItem[]> {
    return (
      (await this.executeOpen<QqGroupItem[]>('GET', this.withBotAppId('/api/open/qqBot/groupList', botAppId))) ?? []
    );
  }

  /** 5. 获取 QQ 机器人渠道配置列表。 */
  list(q?: PageQuery): Promise<PageResult<QqBotItem>> {
    return this.executeOpen<PageResult<QqBotItem>>('POST', '/api/open/qqBot/list', q ?? {});
  }

  /** 6. 新增渠道配置：发到指定 QQ 群（sendType=2），或用指定机器人发给自己（sendType=1）。 */
  async add(req: QqBotSaveRequest): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/qqBot/add', withDefaultSendType(req));
  }

  /** 7. 修改渠道配置；配置编码不可修改，但需传原值。 */
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

  /** 9. 我的 QQ 机器人列表：官方与自有机器人及其绑定状态、自有机器人接入信息。 */
  myBots(): Promise<QqMyBotList> {
    return this.executeOpen<QqMyBotList>('GET', '/api/open/qqBot/myBots');
  }

  /** 10. 校验自有机器人凭证并获取头像昵称，不会保存。 */
  previewCustomBot(req: QqCustomBotRequest): Promise<QqBotInfo> {
    return this.executeOpen<QqBotInfo>('POST', '/api/open/qqBot/customBot/preview', req);
  }

  /** 11. 添加自有机器人。 */
  async addCustomBot(req: QqCustomBotRequest): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/qqBot/customBot/add', req);
  }

  /** 12. 修改自有机器人的 AppSecret。 */
  async editCustomBot(req: QqCustomBotRequest): Promise<void> {
    await this.executeOpen<unknown>('POST', '/api/open/qqBot/customBot/edit', req);
  }

  /** 13. 刷新自有机器人的头像昵称。 */
  async refreshCustomBot(botAppId: string): Promise<void> {
    await this.executeOpen<unknown>('GET', this.appendQuery('/api/open/qqBot/customBot/refresh', { botAppId }));
  }

  /** 14. 删除自有机器人，同时删除该机器人上的绑定、QQ 群与渠道配置。 */
  async deleteCustomBot(botAppId: string): Promise<void> {
    await this.executeOpen<unknown>('DELETE', this.appendQuery('/api/open/qqBot/customBot/delete', { botAppId }));
  }

  /** 15. 设置默认 QQ 机器人，需已绑定；发送时不填 option 即用默认机器人发给自己。 */
  async setDefault(botAppId: string): Promise<void> {
    await this.executeOpen<unknown>('GET', this.appendQuery('/api/open/qqBot/setDefault', { botAppId }));
  }

  private withBotAppId(path: string, botAppId?: string): string {
    return this.appendQuery(path, { botAppId: botAppId || undefined });
  }
}

function withDefaultSendType(req: QqBotSaveRequest): QqBotSaveRequest {
  return { ...req, sendType: req.sendType ?? SEND_TYPE_QQ_GROUP };
}
