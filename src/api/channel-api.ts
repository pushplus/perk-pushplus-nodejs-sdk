import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import { CpItem, MailDetail, MailItem, MpItem, PageQuery, PageResult } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 微信公众号/企业微信/邮箱渠道列表（文档「七. 渠道配置接口」 5-8）。
 */
export class ChannelApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 5. 微信公众号渠道列表。 */
  mpList(q?: PageQuery): Promise<PageResult<MpItem>> {
    return this.executeOpen<PageResult<MpItem>>('POST', '/api/open/mp/list', q ?? {});
  }

  /** 6. 企业微信应用渠道列表。 */
  cpList(q?: PageQuery): Promise<PageResult<CpItem>> {
    return this.executeOpen<PageResult<CpItem>>('POST', '/api/open/cp/list', q ?? {});
  }

  /** 7. 邮箱渠道列表。 */
  mailList(q?: PageQuery): Promise<PageResult<MailItem>> {
    return this.executeOpen<PageResult<MailItem>>('POST', '/api/open/mail/list', q ?? {});
  }

  /** 8. 邮箱渠道详情。 */
  mailDetail(mailId: number): Promise<MailDetail> {
    return this.executeOpen<MailDetail>(
      'GET',
      this.appendQuery('/api/open/mail/detail', { mailId }),
    );
  }
}
