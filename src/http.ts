import { ResolvedPushPlusConfig } from './config';
import { PushPlusError } from './exception';

export interface HttpRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
}

export interface HttpResponse {
  statusCode: number;
  body: string;
}

/**
 * HTTP 请求执行器抽象。
 *
 * SDK 默认提供基于 `fetch` 的实现（Node 18+ 内置 / 浏览器原生）。
 * 调用方也可以自行实现并通过 `PushPlusClient` 注入以使用其它客户端（如 axios/undici/got）。
 */
export interface HttpRequester {
  execute(options: HttpRequestOptions): Promise<HttpResponse>;
}

/**
 * 基于 fetch 的请求执行器。
 *
 * - Node.js：18+ 自带全局 fetch；< 18 需要使用 polyfill 或自定义 HttpRequester。
 * - 浏览器：所有现代浏览器原生支持。
 *
 * 实现是无状态的，可作为 SDK 单例长期复用。
 */
export class FetchHttpRequester implements HttpRequester {
  private readonly readTimeoutMs: number;
  private readonly logRequest: boolean;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: ResolvedPushPlusConfig, fetchImpl?: typeof fetch) {
    this.readTimeoutMs = config.readTimeoutMs;
    this.logRequest = config.logRequest;
    this.userAgent = config.userAgent;
    const resolved = fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
    if (!resolved) {
      throw new PushPlusError(
        '当前运行环境没有可用的 fetch 实现。请在 Node.js 18+ 中运行，' +
          '或自行注入 HttpRequester 实例。',
      );
    }
    this.fetchImpl = resolved;
  }

  async execute(options: HttpRequestOptions): Promise<HttpResponse> {
    const { method, url, headers, body } = options;
    const finalHeaders: Record<string, string> = {};

    let hasContentType = false;
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (k == null || v == null) continue;
        finalHeaders[k] = v;
        if (k.toLowerCase() === 'content-type') hasContentType = true;
      }
    }
    if (body != null && !hasContentType) {
      finalHeaders['Content-Type'] = 'application/json;charset=UTF-8';
    }
    // 浏览器中不允许设置 User-Agent，仅在非浏览器环境下添加
    if (typeof window === 'undefined' && !finalHeaders['User-Agent'] && !finalHeaders['user-agent']) {
      finalHeaders['User-Agent'] = this.userAgent;
    }

    if (this.logRequest) {
      // eslint-disable-next-line no-console
      console.debug('[pushplus] >>>', method, url, 'body=', body);
    }

    const controller = new AbortController();
    const timer = this.readTimeoutMs > 0 ? setTimeout(() => controller.abort(), this.readTimeoutMs) : null;

    try {
      const init: RequestInit = {
        method: method.toUpperCase(),
        headers: finalHeaders,
        signal: controller.signal,
      };
      if (body != null) {
        init.body = body;
      }
      const resp = await this.fetchImpl(url, init);
      const respBody = await resp.text();
      if (this.logRequest) {
        // eslint-disable-next-line no-console
        console.debug('[pushplus] <<< status=', resp.status, 'body=', respBody);
      }
      return { statusCode: resp.status, body: respBody };
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err && err.name === 'AbortError') {
        throw new PushPlusError(`调用 PushPlus 接口超时(${this.readTimeoutMs}ms): ${err.message ?? ''}`, -1, {
          cause: e,
        });
      }
      throw new PushPlusError(`调用 PushPlus 接口失败: ${err?.message ?? String(e)}`, -1, { cause: e });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

/**
 * 是否处于成功的 HTTP 状态码区间（2xx）。
 */
export function isSuccessfulHttpStatus(status: number): boolean {
  return status >= 200 && status < 300;
}
