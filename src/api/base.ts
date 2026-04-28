import { ResolvedPushPlusConfig } from '../config';
import { PushPlusError } from '../exception';
import { HttpRequester, HttpResponse, isSuccessfulHttpStatus } from '../http';
import { ApiResponse } from '../models';

/**
 * API 基类，提供请求执行与统一错误处理。
 */
export abstract class AbstractApi {
  protected readonly config: ResolvedPushPlusConfig;
  protected readonly http: HttpRequester;

  constructor(config: ResolvedPushPlusConfig, http: HttpRequester) {
    this.config = config;
    this.http = http;
  }

  /** 拼接绝对 URL。 */
  protected resolveUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return this.config.baseUrl + (path.startsWith('/') ? path : '/' + path);
  }

  /** 把对象拼成 query string。 */
  protected buildQuery(params: Record<string, unknown> | undefined | null): string {
    if (!params) return '';
    const parts: string[] = [];
    for (const [k, v] of Object.entries(params)) {
      if (v == null) continue;
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return parts.join('&');
  }

  /** 在 path 上追加 query string。 */
  protected appendQuery(path: string, params: Record<string, unknown> | undefined | null): string {
    const q = this.buildQuery(params);
    if (!q) return path;
    return path + (path.includes('?') ? '&' : '?') + q;
  }

  /**
   * 执行请求并返回原始 ApiResponse（不进行 code 校验）。
   */
  protected async execute<T>(
    method: string,
    path: string,
    headers: Record<string, string> | undefined | null,
    body: unknown,
  ): Promise<ApiResponse<T>> {
    const url = this.resolveUrl(path);
    const json = body == null ? null : safeStringify(body);
    const resp = await this.http.execute({ method, url, headers: headers ?? undefined, body: json });
    if (!isSuccessfulHttpStatus(resp.statusCode)) {
      throw new PushPlusError(
        `PushPlus 接口 HTTP 调用失败: status=${resp.statusCode}, body=${resp.body}`,
        resp.statusCode,
      );
    }
    return parseApiResponse<T>(resp);
  }

  /** 执行请求并直接返回 data；非 200 抛出异常。 */
  protected async executeForData<T>(
    method: string,
    path: string,
    headers: Record<string, string> | undefined | null,
    body: unknown,
  ): Promise<T> {
    const resp = await this.execute<T>(method, path, headers, body);
    if (!isApiSuccess(resp)) {
      throw new PushPlusError(
        buildBusinessErrorMessage('PushPlus 接口业务失败', resp),
        resp.code ?? -1,
      );
    }
    return resp.data as T;
  }
}

export function isApiSuccess<T>(resp: ApiResponse<T>): boolean {
  return resp.code === 200;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (e) {
    throw new PushPlusError(`序列化请求体失败: ${(e as Error).message}`, -1, { cause: e });
  }
}

function parseApiResponse<T>(resp: HttpResponse): ApiResponse<T> {
  if (!resp.body || resp.body.length === 0) {
    throw new PushPlusError('PushPlus 接口返回为空');
  }
  let raw: ApiResponse<unknown>;
  try {
    raw = JSON.parse(resp.body) as ApiResponse<unknown>;
  } catch (e) {
    throw new PushPlusError(
      `解析 PushPlus 响应失败: ${(e as Error).message}, payload=${resp.body}`,
      -1,
      { cause: e },
    );
  }
  if (raw == null || typeof raw !== 'object') {
    throw new PushPlusError(`PushPlus 接口返回结构异常: ${resp.body}`);
  }
  const result: ApiResponse<T> = {
    code: raw.code,
    msg: raw.msg,
    data: raw.data as T,
  };
  if (!isApiSuccess(result)) {
    // 业务失败场景：把 data 中的字符串/简单值附加到 msg，方便使用者直接拿到错误描述。
    const dataText = extractDataText(raw.data);
    if (dataText && (!result.msg || result.msg.length === 0)) {
      result.msg = dataText;
    } else if (dataText && result.msg && !result.msg.includes(dataText)) {
      result.msg = result.msg + ': ' + dataText;
    }
  }
  return result;
}

function extractDataText(data: unknown): string | null {
  if (data == null) return null;
  const t = typeof data;
  if (t === 'string') return data as string;
  if (t === 'number' || t === 'boolean') return String(data);
  try {
    return JSON.stringify(data);
  } catch {
    return null;
  }
}

function buildBusinessErrorMessage(prefix: string, resp: ApiResponse<unknown>): string {
  return `${prefix}: code=${resp.code}, msg=${resp.msg}`;
}
