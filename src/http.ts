import { ResolvedPushPlusConfig } from './config';
import { PushPlusError } from './exception';

export interface HttpRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
}

/**
 * 二进制请求体（multipart 上传等场景使用）。
 *
 * 接受 fetch `BodyInit` 中的常见二进制形态。
 */
export type HttpRawBody = Uint8Array | ArrayBuffer | Blob | null;

export interface HttpRawRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: HttpRawBody;
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
 *
 * `executeRaw` 用于二进制请求体场景（如图片 multipart 上传）。
 * 自定义实现可选择覆写以正确处理二进制；未覆写时调用方应通过
 * {@link callExecuteRaw} 适配回退到 `execute`。
 */
export interface HttpRequester {
  execute(options: HttpRequestOptions): Promise<HttpResponse>;
  /** 可选：执行带二进制 body 的请求。 */
  executeRaw?(options: HttpRawRequestOptions): Promise<HttpResponse>;
}

/**
 * 调用 {@link HttpRequester} 的二进制通道。
 *
 * - 若实现类提供了 `executeRaw`（推荐对二进制场景覆写），则直接使用；
 * - 否则按 UTF-8 把字节解码成字符串后回退到 {@link HttpRequester.execute}，
 *   适用于 body 本身是文本的场景。
 */
export async function callExecuteRaw(
  requester: HttpRequester,
  options: HttpRawRequestOptions,
): Promise<HttpResponse> {
  if (typeof requester.executeRaw === 'function') {
    return requester.executeRaw(options);
  }
  const { method, url, headers, body } = options;
  let text: string | null = null;
  if (body != null) {
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      text = await body.text();
    } else if (body instanceof Uint8Array) {
      text = new TextDecoder('utf-8').decode(body);
    } else if (body instanceof ArrayBuffer) {
      text = new TextDecoder('utf-8').decode(new Uint8Array(body));
    } else {
      text = String(body);
    }
  }
  return requester.execute({ method, url, headers, body: text });
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
    return this.doExecute({
      method: options.method,
      url: options.url,
      headers: options.headers,
      body: options.body ?? null,
      bodyForLog: options.body ?? null,
      defaultContentType: 'application/json;charset=UTF-8',
    });
  }

  async executeRaw(options: HttpRawRequestOptions): Promise<HttpResponse> {
    return this.doExecute({
      method: options.method,
      url: options.url,
      headers: options.headers,
      body: options.body ?? null,
      bodyForLog: null,
      defaultContentType: 'application/octet-stream',
    });
  }

  private async doExecute(args: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body: string | HttpRawBody;
    bodyForLog: string | null;
    defaultContentType: string;
  }): Promise<HttpResponse> {
    const { method, url, headers, body, bodyForLog, defaultContentType } = args;
    const finalHeaders: Record<string, string> = {};

    let hasContentType = false;
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (k == null || v == null) continue;
        finalHeaders[k] = v;
        if (k.toLowerCase() === 'content-type') hasContentType = true;
      }
    }
    if (body != null && !hasContentType && defaultContentType) {
      finalHeaders['Content-Type'] = defaultContentType;
    }
    // 浏览器中不允许设置 User-Agent，仅在非浏览器环境下添加
    if (typeof window === 'undefined' && !finalHeaders['User-Agent'] && !finalHeaders['user-agent']) {
      finalHeaders['User-Agent'] = this.userAgent;
    }

    if (this.logRequest) {
      if (bodyForLog != null) {
        // eslint-disable-next-line no-console
        console.debug('[pushplus] >>>', method, url, 'body=', bodyForLog);
      } else {
        const len = bodyLength(body);
        // eslint-disable-next-line no-console
        console.debug('[pushplus] >>>', method, url, 'bodyBytes=', len);
      }
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
        // fetch BodyInit 兼容 string / Uint8Array / ArrayBuffer / Blob 等。
        init.body = body as BodyInit;
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

function bodyLength(body: unknown): number {
  if (body == null) return 0;
  if (typeof body === 'string') return body.length;
  if (body instanceof Uint8Array) return body.byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body.size;
  return -1;
}

/**
 * 是否处于成功的 HTTP 状态码区间（2xx）。
 */
export function isSuccessfulHttpStatus(status: number): boolean {
  return status >= 200 && status < 300;
}
