import { AccessKeyManager } from '../access-key-manager';
import { ResolvedPushPlusConfig } from '../config';
import { HttpRequester } from '../http';
import {
  FormDetail,
  FormListItem,
  FormListQuery,
  FormPublishDiff,
  FormPublishResult,
  FormSaveRequest,
  PageResult,
} from '../models';
import { OpenAbstractApi } from './open-base';

/**
 * 开放接口 - push 表单。
 *
 * 文档：https://www.pushplus.plus/doc/ecosystem/form/
 * 基础路径：`/push/api/open/form`
 */
export class FormApi extends OpenAbstractApi {
  constructor(config: ResolvedPushPlusConfig, http: HttpRequester, mgr: AccessKeyManager) {
    super(config, http, mgr);
  }

  /** 我的表单分页。 */
  list(query?: FormListQuery): Promise<PageResult<FormListItem>> {
    return this.executeOpen<PageResult<FormListItem>>(
      'POST',
      '/push/api/open/form/list',
      query ?? {},
    );
  }

  /** 创建空白表单（草稿）。 */
  create(title: string): Promise<FormListItem> {
    return this.executeOpen<FormListItem>('POST', '/push/api/open/form/create', { title });
  }

  /** 基于已有表单复制一份新草稿。 */
  copy(id: number): Promise<FormListItem> {
    return this.executeOpen<FormListItem>(
      'POST',
      this.appendQuery('/push/api/open/form/copy', { id }),
    );
  }

  /** 保存表单设计（仅更新草稿；已发布需再调用 publish）。 */
  async save(req: FormSaveRequest): Promise<void> {
    await this.executeOpen<unknown>('POST', '/push/api/open/form/save', req);
  }

  /** 表单详情（含草稿题目、主题、设置）。 */
  detail(id: number): Promise<FormDetail> {
    return this.executeOpen<FormDetail>(
      'GET',
      this.appendQuery('/push/api/open/form/detail', { id }),
    );
  }

  /** 草稿与发布快照的题目差异。 */
  publishDiff(id: number): Promise<FormPublishDiff> {
    return this.executeOpen<FormPublishDiff>(
      'GET',
      this.appendQuery('/push/api/open/form/publishDiff', { id }),
    );
  }

  /** 发布表单，开始收集。 */
  publish(id: number): Promise<FormPublishResult> {
    return this.executeOpen<FormPublishResult>(
      'POST',
      this.appendQuery('/push/api/open/form/publish', { id }),
    );
  }

  /** 停止收集。 */
  async stop(id: number): Promise<void> {
    await this.executeOpen<unknown>(
      'POST',
      this.appendQuery('/push/api/open/form/stop', { id }),
    );
  }

  /** 删除表单（不可恢复）。 */
  async delete(id: number): Promise<void> {
    await this.executeOpen<unknown>(
      'POST',
      this.appendQuery('/push/api/open/form/delete', { id }),
    );
  }
}
