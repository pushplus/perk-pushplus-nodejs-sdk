import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import { ClawBotInfo, ClawBotMessage, ClawBotQrCode } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - 微信 ClawBot（文档「八. 微信ClawBot接口」）。
 */
export class ClawBotApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 1. 获取二维码。 */
  getBotQrcode(): Promise<ClawBotQrCode> {
    return this.executeOpen<ClawBotQrCode>('GET', '/api/open/clawBot/getBotQrcode');
  }

  /** 2. 扫码结果查询。 */
  async getQrcodeStatus(qrcode: string): Promise<void> {
    await this.executeOpen<unknown>(
      'GET',
      this.appendQuery('/api/open/clawBot/getQrcodeStatus', { getQrcodeStatus: qrcode }),
    );
  }

  /** 3. 绑定详情。 */
  botInfo(): Promise<ClawBotInfo> {
    return this.executeOpen<ClawBotInfo>('GET', '/api/open/clawBot/botInfo');
  }

  /** 4. 解绑。 */
  async unbind(): Promise<void> {
    await this.executeOpen<unknown>('GET', '/api/open/clawBot/unbind');
  }

  /** 5. 获取发送消息。 */
  getMsg(): Promise<ClawBotMessage[]> {
    return this.executeOpen<ClawBotMessage[]>('GET', '/api/open/clawBot/getMsg');
  }
}
