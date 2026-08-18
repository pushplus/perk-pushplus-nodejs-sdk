import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import { FileInput, buildFileMultipart, toFileBytes } from '../multipart';
import { DocContent, DocListItem, DocListQuery, DocVo, PageResult } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - push 文档。
 *
 * 文档：https://www.pushplus.plus/doc/ecosystem/doc/
 * 基础路径：`/push/api/open/doc`
 *
 * 文档开放接口不单独提供推送接口。发布后请通过 `client.send` 推送分享页：
 * `template=doc`，`pushId=docCode`。
 */
export class DocApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 我的文档分页。 */
  list(query?: DocListQuery): Promise<PageResult<DocListItem>> {
    return this.executeOpen<PageResult<DocListItem>>(
      'POST',
      '/push/api/open/doc/list',
      query ?? {},
    );
  }

  /** 创建空白文档。 */
  create(title: string): Promise<DocVo> {
    return this.executeOpen<DocVo>('POST', '/push/api/open/doc/create', { title });
  }

  /**
   * 导入 Word（.docx）创建文档。
   *
   * 标题默认取文件名；创建后默认关闭分享，需再调用 publish 才会同步到分享页。
   */
  async importWord(file: FileInput, fileName = 'document.docx'): Promise<DocVo> {
    const bytes = await toFileBytes(file);
    const name = fileName && fileName.trim() ? fileName : 'document.docx';
    return this.executeOpenMultipart<DocVo>(
      '/push/api/open/doc/import',
      buildFileMultipart(name, guessDocxContentType(name), bytes),
    );
  }

  /** 获取文档元信息与 HTML 草稿正文。 */
  content(docCode: string): Promise<DocContent> {
    return this.executeOpen<DocContent>(
      'GET',
      this.appendQuery('/push/api/open/doc/content', { docCode }),
    );
  }

  /** 保存 HTML 草稿（不影响分享页，需再 publish）。 */
  saveContent(docCode: string, content: string): Promise<DocVo> {
    return this.executeOpen<DocVo>('POST', '/push/api/open/doc/saveContent', { docCode, content });
  }

  /** 将草稿同步为分享页快照。 */
  publish(docCode: string): Promise<DocVo> {
    return this.executeOpen<DocVo>(
      'POST',
      this.appendQuery('/push/api/open/doc/publish', { docCode }),
    );
  }

  /** 重命名。 */
  async rename(docCode: string, title: string): Promise<void> {
    await this.executeOpen<unknown>('POST', '/push/api/open/doc/rename', { docCode, title });
  }

  /** 删除文档。 */
  async delete(docCode: string): Promise<void> {
    await this.executeOpen<unknown>(
      'POST',
      this.appendQuery('/push/api/open/doc/delete', { docCode }),
    );
  }

  /**
   * 更新分享设置。
   *
   * @param sharePerm 0 关闭 / 1 开启（仅可查看）
   * @param shareLogin 0 免登录 / 1 需登录；不传则沿用原值
   */
  updateShare(docCode: string, sharePerm: number, shareLogin?: number): Promise<DocVo> {
    const body: Record<string, unknown> = { docCode, sharePerm };
    if (shareLogin != null) body.shareLogin = shareLogin;
    return this.executeOpen<DocVo>('POST', '/push/api/open/doc/updateShare', body);
  }
}

function guessDocxContentType(name: string): string {
  return name.toLowerCase().endsWith('.docx')
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/octet-stream';
}
