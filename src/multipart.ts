import { PushPlusError } from './exception';

/** 二进制文件输入。 */
export type FileInput = Uint8Array | ArrayBuffer | Blob;

export interface FileMultipart {
  contentType: string;
  body: Uint8Array;
}

/** 构造仅含一个 file 字段的 multipart/form-data 请求体。 */
export function buildFileMultipart(
  fileName: string,
  contentType: string | undefined,
  fileBytes: Uint8Array,
): FileMultipart {
  if (fileBytes == null || fileBytes.byteLength === 0) {
    throw new PushPlusError('上传文件内容不能为空');
  }
  const safeName = fileName && fileName.trim() ? fileName : 'file';
  const mime = contentType && contentType.trim() ? contentType : 'application/octet-stream';
  const boundary = '----PushPlusBoundary' + randomBoundarySuffix();
  const crlf = '\r\n';
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="file"; filename="${escapeFileName(safeName)}"${crlf}` +
      `Content-Type: ${mime}${crlf}${crlf}`,
  );
  const tail = enc.encode(`${crlf}--${boundary}--${crlf}`);
  const body = new Uint8Array(head.byteLength + fileBytes.byteLength + tail.byteLength);
  body.set(head, 0);
  body.set(fileBytes, head.byteLength);
  body.set(tail, head.byteLength + fileBytes.byteLength);
  return { contentType: `multipart/form-data; boundary=${boundary}`, body };
}

export async function toFileBytes(file: FileInput): Promise<Uint8Array> {
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

function escapeFileName(name: string): string {
  return name.replace(/"/g, '_').replace(/\r/g, ' ').replace(/\n/g, ' ');
}

function randomBoundarySuffix(): string {
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s;
}
