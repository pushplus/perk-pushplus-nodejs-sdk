import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { PushPlusError } from '../exception';
import { HttpRequester, callExecuteRaw, isSuccessfulHttpStatus } from '../http';
import {
  ImageItem,
  ImageUploadResult,
  ImageUploadToken,
  PageQuery,
  PageResult,
} from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 二进制图片输入。
 *
 * - `Uint8Array`：Node 与浏览器通用（Buffer 是 Uint8Array 的子类）
 * - `ArrayBuffer`：原始字节缓冲
 * - `Blob`/`File`：浏览器与 Node 18+ 都支持
 */
export type ImageFileInput = Uint8Array | ArrayBuffer | Blob;

/** 通用上传选项。 */
export interface ImageUploadOptions {
  /** 文件名（建议带扩展名，如 `logo.png`）。 */
  fileName: string;
  /** 文件 MIME 类型；未指定时按文件名后缀猜测。 */
  contentType?: string;
}

/**
 * 开放接口 - 图片服务（文档「十二. 图片服务接口」）。
 *
 * 包含 4 个接口：
 *
 * 1. {@link ImageApi.getUploadToken} 获取上传凭证
 * 2. {@link ImageApi.upload} 上传图片到七牛云（multipart/form-data，**不**带 access-key）
 * 3. {@link ImageApi.list} 已上传图片列表
 * 4. {@link ImageApi.delete} 主动删除图片
 *
 * 另外提供 {@link ImageApi.uploadBytes} 等便捷方法，
 * 内部自动「先取凭证 → 再上传」。仅支持图片类型，30 天有效期。
 */
export class ImageApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 1. 获取上传凭证。 */
  getUploadToken(): Promise<ImageUploadToken> {
    return this.executeOpen<ImageUploadToken>('GET', '/api/open/userImage/uploadToken');
  }

  /**
   * 2. 上传图片到七牛云。
   *
   * 使用「获取上传凭证」返回的 `uploadUrl` 与 `uploadToken`，
   * 按七牛云表单上传规范以 `multipart/form-data` 提交。该请求
   * **不会** 携带 PushPlus 的 `access-key` 头。
   */
  async upload(
    token: ImageUploadToken,
    file: ImageFileInput,
    options: ImageUploadOptions,
  ): Promise<ImageUploadResult> {
    if (token == null) {
      throw new PushPlusError('上传凭证 token 不能为 null');
    }
    if (!token.uploadToken) {
      throw new PushPlusError('上传凭证 uploadToken 不能为空');
    }
    const uploadUrl = token.uploadUrl || token.uploadHost;
    if (!uploadUrl) {
      throw new PushPlusError('上传凭证未返回 uploadUrl/uploadHost');
    }
    return this.uploadToQiniu(uploadUrl, token.uploadToken, file, options);
  }

  /**
   * 2. 上传图片到七牛云（低层方法）。直接指定上传地址与 token。
   */
  async uploadToQiniu(
    uploadUrl: string,
    uploadToken: string,
    file: ImageFileInput,
    options: ImageUploadOptions,
  ): Promise<ImageUploadResult> {
    if (!uploadUrl) {
      throw new PushPlusError('uploadUrl 不能为空');
    }
    if (!uploadToken) {
      throw new PushPlusError('uploadToken 不能为空');
    }
    const bytes = await toUint8Array(file);
    if (bytes.byteLength === 0) {
      throw new PushPlusError('上传文件内容不能为空');
    }

    const fileName = options.fileName || 'file';
    const contentType =
      options.contentType || guessContentTypeByName(fileName) || 'application/octet-stream';

    const boundary = '----PushPlusBoundary' + randomBoundarySuffix();
    const body = buildMultipartBody(boundary, uploadToken, fileName, contentType, bytes);

    const resp = await callExecuteRaw(this.http, {
      method: 'POST',
      url: uploadUrl,
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
    if (!isSuccessfulHttpStatus(resp.statusCode)) {
      throw new PushPlusError(
        `上传图片到七牛云失败: status=${resp.statusCode}, body=${resp.body}`,
        resp.statusCode,
      );
    }
    let result: ImageUploadResult;
    try {
      result = JSON.parse(resp.body) as ImageUploadResult;
    } catch (e) {
      throw new PushPlusError(
        `解析七牛云响应失败: ${(e as Error).message}, payload=${resp.body}`,
        -1,
        { cause: e },
      );
    }
    if (result == null || typeof result !== 'object') {
      throw new PushPlusError(`七牛云返回非 JSON 对象: ${resp.body}`);
    }
    if (result.errno !== 0) {
      throw new PushPlusError(
        `七牛云上传失败: errno=${result.errno}, msg=${result.msg ?? ''}`,
        result.errno ?? -1,
      );
    }
    return result;
  }

  /**
   * 便捷方法：自动获取上传凭证后上传字节数组 / Blob / ArrayBuffer。
   *
   * @example
   * ```ts
   * await client.image.uploadBytes(buffer, { fileName: 'a.png' });
   * await client.image.uploadBytes(blob, { fileName: 'b.jpg', contentType: 'image/jpeg' });
   * ```
   */
  async uploadBytes(file: ImageFileInput, options: ImageUploadOptions): Promise<ImageUploadResult> {
    const token = await this.getUploadToken();
    return this.upload(token, file, options);
  }

  /** 3. 图片列表。 */
  list(query?: PageQuery): Promise<PageResult<ImageItem>> {
    return this.executeOpen<PageResult<ImageItem>>(
      'POST',
      '/api/open/userImage/list',
      query ?? {},
    );
  }

  /**
   * 4. 主动删除图片；未删除的图片默认 30 天后由系统自动清理。
   */
  async delete(id: number): Promise<void> {
    await this.executeOpen<unknown>(
      'DELETE',
      this.appendQuery('/api/open/userImage/delete', { id }),
    );
  }
}

/* ============================== 内部辅助 ============================== */

async function toUint8Array(file: ImageFileInput): Promise<Uint8Array> {
  if (file == null) {
    throw new PushPlusError('上传文件不能为 null');
  }
  if (file instanceof Uint8Array) {
    return file;
  }
  if (file instanceof ArrayBuffer) {
    return new Uint8Array(file);
  }
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    const ab = await file.arrayBuffer();
    return new Uint8Array(ab);
  }
  throw new PushPlusError(`不支持的上传文件类型: ${Object.prototype.toString.call(file)}`);
}

function buildMultipartBody(
  boundary: string,
  uploadToken: string,
  fileName: string,
  contentType: string,
  fileBytes: Uint8Array,
): Uint8Array {
  const crlf = '\r\n';
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="token"${crlf}${crlf}` +
      `${uploadToken}${crlf}` +
      `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="file"; filename="${escapeFileName(fileName)}"${crlf}` +
      `Content-Type: ${contentType}${crlf}${crlf}`,
  );
  const tail = enc.encode(`${crlf}--${boundary}--${crlf}`);
  const out = new Uint8Array(head.byteLength + fileBytes.byteLength + tail.byteLength);
  out.set(head, 0);
  out.set(fileBytes, head.byteLength);
  out.set(tail, head.byteLength + fileBytes.byteLength);
  return out;
}

function escapeFileName(name: string): string {
  return name.replace(/"/g, '_').replace(/\r/g, ' ').replace(/\n/g, ' ');
}

function guessContentTypeByName(name: string | undefined): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return null;
}

function randomBoundarySuffix(): string {
  // 32 个 hex 字符；不依赖 Node-only 的 crypto，浏览器/Node 都能跑。
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s;
}
