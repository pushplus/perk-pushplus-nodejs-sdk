import { ResolvedPushPlusConfig } from '../config';
import { PushPlusError } from '../exception';
import { HttpRequester } from '../http';
import { AccessKeyResult } from '../models';
import { AbstractApi } from './base';

/**
 * AccessKey 接口。对应文档「一. 获取 AccessKey」。
 */
export class AccessKeyApi extends AbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester) {
    super(config, http);
  }

  /** 使用配置中的 token + secretKey 获取 AccessKey。 */
  getAccessKey(): Promise<AccessKeyResult>;
  /** 使用指定 token + secretKey 获取 AccessKey。 */
  getAccessKey(token: string, secretKey: string): Promise<AccessKeyResult>;
  async getAccessKey(token?: string, secretKey?: string): Promise<AccessKeyResult> {
    const t = token ?? this.config.token;
    const sk = secretKey ?? this.config.secretKey;
    if (!t || t.trim().length === 0) {
      throw new PushPlusError('获取 AccessKey 需要 token');
    }
    if (!sk || sk.trim().length === 0) {
      throw new PushPlusError('获取 AccessKey 需要 secretKey');
    }
    return this.executeForData<AccessKeyResult>(
      'POST',
      '/api/common/openApi/getAccessKey',
      null,
      { token: t, secretKey: sk },
    );
  }
}
