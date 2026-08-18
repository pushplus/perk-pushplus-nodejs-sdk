import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { PushPlusError } from '../exception';
import { HttpRequester } from '../http';
import { FileMultipart } from '../multipart';
import { AbstractApi, isApiSuccess } from './base';

/**
 * 开放接口基类。会自动在 header 中带上 access-key，
 * 并在收到 401 类业务错误时尝试重试一次（刷新 AccessKey 后重试）。
 */
export abstract class OpenAbstractApi extends AbstractApi {
  static readonly HEADER_ACCESS_KEY = 'access-key';
  /** PushPlus AccessKey 失效相关的业务码（用于触发自动重试）。 */
  private static readonly CODE_ACCESS_KEY_INVALID = 401;

  protected readonly accessKeyManager: AccessKeyManager;

  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, accessKeyManager: AccessKeyManager) {
    super(config, http);
    this.accessKeyManager = accessKeyManager;
  }

  private async headersWithAccessKey(): Promise<Record<string, string>> {
    const key = await this.accessKeyManager.getAccessKey();
    return { [OpenAbstractApi.HEADER_ACCESS_KEY]: key };
  }

  /**
   * 执行带 access-key 的请求；当返回 code=401 时自动刷新 key 并重试一次。
   */
  protected async executeOpen<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers = await this.headersWithAccessKey();
    const resp = await this.execute<T>(method, path, headers, body);
    if (isApiSuccess(resp)) {
      return resp.data as T;
    }
    if (resp.code === OpenAbstractApi.CODE_ACCESS_KEY_INVALID) {
      this.accessKeyManager.invalidate();
      const retryHeaders = await this.headersWithAccessKey();
      const retry = await this.execute<T>(method, path, retryHeaders, body);
      if (isApiSuccess(retry)) {
        return retry.data as T;
      }
      throw new PushPlusError(
        `PushPlus 开放接口业务失败(重试后): code=${retry.code}, msg=${retry.msg}`,
        retry.code ?? -1,
      );
    }
    throw new PushPlusError(
      `PushPlus 开放接口业务失败: code=${resp.code}, msg=${resp.msg}`,
      resp.code ?? -1,
    );
  }

  /** 以 multipart 上传文件（自动携带 access-key；code=401 时刷新后重试一次）。 */
  protected executeOpenMultipart<T>(path: string, multipart: FileMultipart): Promise<T> {
    return this.executeOpenRaw<T>('POST', path, multipart.body, {
      'Content-Type': multipart.contentType,
    });
  }

  /**
   * 执行带二进制 body 的开放接口请求；当返回 code=401 时自动刷新 key 并重试一次。
   */
  protected async executeOpenRaw<T>(
    method: string,
    path: string,
    body: Uint8Array,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const headers = { ...(await this.headersWithAccessKey()), ...(extraHeaders ?? {}) };
    const resp = await this.executeRaw<T>(method, path, headers, body);
    if (isApiSuccess(resp)) {
      return resp.data as T;
    }
    if (resp.code === OpenAbstractApi.CODE_ACCESS_KEY_INVALID) {
      this.accessKeyManager.invalidate();
      const retryHeaders = { ...(await this.headersWithAccessKey()), ...(extraHeaders ?? {}) };
      const retry = await this.executeRaw<T>(method, path, retryHeaders, body);
      if (isApiSuccess(retry)) {
        return retry.data as T;
      }
      throw new PushPlusError(
        `PushPlus 开放接口业务失败(重试后): code=${retry.code}, msg=${retry.msg}`,
        retry.code ?? -1,
      );
    }
    throw new PushPlusError(
      `PushPlus 开放接口业务失败: code=${resp.code}, msg=${resp.msg}`,
      resp.code ?? -1,
    );
  }
}
