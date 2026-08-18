import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { PushPlusError } from '../exception';
import { HttpRequester } from '../http';
import { FileInput, buildFileMultipart, toFileBytes } from '../multipart';
import { DocListItem, DocListQuery, ExcelContent, ExcelVo, PageResult } from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - push 表格。
 *
 * 文档：https://www.pushplus.plus/doc/ecosystem/sheet/
 * 基础路径：`/push/api/open/excel`
 *
 * 表格开放接口不单独提供推送接口。发布后请通过 `client.send` 推送分享页：
 * `template=excel`，`pushId=docCode`。
 */
export class ExcelApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 我的表格分页。 */
  list(query?: DocListQuery): Promise<PageResult<DocListItem>> {
    return this.executeOpen<PageResult<DocListItem>>(
      'POST',
      '/push/api/open/excel/list',
      query ?? {},
    );
  }

  /** 创建空白表格。 */
  create(title: string): Promise<ExcelVo> {
    return this.executeOpen<ExcelVo>('POST', '/push/api/open/excel/create', { title });
  }

  /**
   * 导入 Excel（.xlsx / .xls）创建表格。
   *
   * 标题默认取文件名；创建后默认关闭分享，需再调用 publish 才会同步到分享页。
   */
  async importExcel(file: FileInput, fileName = 'workbook.xlsx'): Promise<ExcelVo> {
    const bytes = await toFileBytes(file);
    const name = fileName && fileName.trim() ? fileName : 'workbook.xlsx';
    return this.executeOpenMultipart<ExcelVo>(
      '/push/api/open/excel/import',
      buildFileMultipart(name, guessExcelContentType(name), bytes),
    );
  }

  /** 获取表格元信息与整表 JSON 草稿。 */
  content(docCode: string): Promise<ExcelContent> {
    return this.executeOpen<ExcelContent>(
      'GET',
      this.appendQuery('/push/api/open/excel/content', { docCode }),
    );
  }

  /**
   * 整表覆盖保存草稿。
   *
   * `content` 可为 JSON 字符串，或工作簿对象（SDK 会序列化）。
   */
  saveContent(docCode: string, content: string | object): Promise<ExcelVo> {
    return this.executeOpen<ExcelVo>('POST', '/push/api/open/excel/saveContent', {
      docCode,
      content: stringifyJsonContent(content),
    });
  }

  /**
   * 从指定起始单元格起，按二维数组向右向下写入（草稿）。
   *
   * @param range 起始单元格，如 A1
   * @param values 外层为行、内层为列
   * @param sheetName 工作表名称；不传则写入活动表 / 第一张表
   */
  writeCells(
    docCode: string,
    range: string,
    values: unknown[][],
    sheetName?: string,
  ): Promise<ExcelVo> {
    const body: Record<string, unknown> = { docCode, range, values };
    if (sheetName != null) body.sheetName = sheetName;
    return this.executeOpen<ExcelVo>('POST', '/push/api/open/excel/writeCells', body);
  }

  /** 将草稿同步为分享页快照。 */
  publish(docCode: string): Promise<ExcelVo> {
    return this.executeOpen<ExcelVo>(
      'POST',
      this.appendQuery('/push/api/open/excel/publish', { docCode }),
    );
  }

  /** 重命名。 */
  async rename(docCode: string, title: string): Promise<void> {
    await this.executeOpen<unknown>('POST', '/push/api/open/excel/rename', { docCode, title });
  }

  /** 删除表格。 */
  async delete(docCode: string): Promise<void> {
    await this.executeOpen<unknown>(
      'POST',
      this.appendQuery('/push/api/open/excel/delete', { docCode }),
    );
  }

  /**
   * 更新分享设置。
   *
   * @param sharePerm 0 关闭 / 1 开启（仅可查看）
   * @param shareLogin 0 免登录 / 1 需登录；不传则沿用原值
   */
  updateShare(docCode: string, sharePerm: number, shareLogin?: number): Promise<ExcelVo> {
    const body: Record<string, unknown> = { docCode, sharePerm };
    if (shareLogin != null) body.shareLogin = shareLogin;
    return this.executeOpen<ExcelVo>('POST', '/push/api/open/excel/updateShare', body);
  }
}

function stringifyJsonContent(content: string | object): string {
  if (typeof content === 'string') {
    return content;
  }
  try {
    return JSON.stringify(content);
  } catch (e) {
    throw new PushPlusError(`序列化表格内容失败: ${(e as Error).message}`, -1, { cause: e });
  }
}

function guessExcelContentType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (lower.endsWith('.xls')) {
    return 'application/vnd.ms-excel';
  }
  return 'application/octet-stream';
}
