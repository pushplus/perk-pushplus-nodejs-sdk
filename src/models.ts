import { CallbackEvent, Channel, SendStatus, Template, WebhookType } from './enums';

/**
 * PushPlus 接口统一响应。所有接口都遵循 `{code, msg, data}` 结构。
 */
export interface ApiResponse<T = unknown> {
  code?: number;
  msg?: string;
  data?: T;
}

/** 通用分页请求参数。 */
export interface PageQuery {
  /** 当前所在分页数，默认 1。 */
  current?: number;
  /** 每页大小，默认 20，最大 50。 */
  pageSize?: number;
}

/** 分页响应结构。 */
export interface PageResult<T> {
  pageNum?: number;
  pageSize?: number;
  total?: number;
  pages?: number;
  list?: T[];
}

/* ============================== 发送消息 ============================== */

/**
 * 发送消息请求。对应 `/send` 接口。
 *
 * 推荐使用 `SendRequestBuilder`（`SendRequest.builder()`）链式构建。
 */
export interface SendRequest {
  /** 用户 token 或消息 token。可不填，由 SDK 从 PushPlusConfig 自动注入。 */
  token?: string;
  /** 消息标题。 */
  title?: string;
  /** 消息内容；必填。 */
  content?: string;
  /** 群组编码。不填仅发送给自己；channel 为 webhook 时无效。 */
  topic?: string;
  /** 发送模板，默认 html。 */
  template?: Template | string;
  /** 发送渠道，默认 wechat。 */
  channel?: Channel | string;
  /** 渠道配置参数（cp/webhook/mail 渠道使用渠道编码）。 */
  option?: string;
  /** 异步回调地址。 */
  callbackUrl?: string;
  /** 毫秒时间戳；服务器时间大于此时间戳消息不会发送。 */
  timestamp?: number;
  /** 好友令牌；多个用逗号分隔。 */
  to?: string;
  /** 预处理编码（仅会员）。 */
  pre?: string;
}

export class SendRequestBuilder {
  private req: SendRequest = {};

  token(v?: string): this { this.req.token = v; return this; }
  title(v?: string): this { this.req.title = v; return this; }
  content(v?: string): this { this.req.content = v; return this; }
  topic(v?: string): this { this.req.topic = v; return this; }
  template(v?: Template | string): this { this.req.template = v; return this; }
  channel(v?: Channel | string): this { this.req.channel = v; return this; }
  option(v?: string): this { this.req.option = v; return this; }
  callbackUrl(v?: string): this { this.req.callbackUrl = v; return this; }
  timestamp(v?: number): this { this.req.timestamp = v; return this; }
  to(v?: string): this { this.req.to = v; return this; }
  pre(v?: string): this { this.req.pre = v; return this; }

  build(): SendRequest {
    return { ...this.req };
  }
}

/**
 * 创建 SendRequest 链式构造器。
 */
export function sendRequest(): SendRequestBuilder {
  return new SendRequestBuilder();
}

/* ============================== 多渠道发送 ============================== */

/**
 * 多渠道发送消息请求。对应 `/batchSend` 接口。
 */
export interface BatchSendRequest {
  token?: string;
  title?: string;
  content?: string;
  topic?: string;
  template?: Template | string;
  /** 多渠道，逗号分隔。 */
  channel?: string;
  /** 多渠道 option，逗号分隔；与 channel 一一对应。 */
  option?: string;
  callbackUrl?: string;
  timestamp?: number;
  to?: string;
  pre?: string;
}

/**
 * 链式 Builder：支持以 `channel(Channel)` / `option(string)` 形式累积调用，
 * 内部自动用逗号拼接并按顺序一一对应。
 *
 * 也可以通过 `channelString`/`optionString` 直接指定 CSV 字符串。
 * 累积式优先级高于 CSV 字符串。
 */
export class BatchSendRequestBuilder {
  private req: BatchSendRequest = {};
  private readonly channelList: string[] = [];
  private readonly optionList: string[] = [];

  token(v?: string): this { this.req.token = v; return this; }
  title(v?: string): this { this.req.title = v; return this; }
  content(v?: string): this { this.req.content = v; return this; }
  topic(v?: string): this { this.req.topic = v; return this; }
  template(v?: Template | string): this { this.req.template = v; return this; }
  callbackUrl(v?: string): this { this.req.callbackUrl = v; return this; }
  timestamp(v?: number): this { this.req.timestamp = v; return this; }
  to(v?: string): this { this.req.to = v; return this; }
  pre(v?: string): this { this.req.pre = v; return this; }

  /** 追加一个 channel。 */
  channel(ch: Channel | string): this {
    this.channelList.push(typeof ch === 'string' ? ch : (ch as string));
    return this;
  }

  /** 追加一个 option，与最近一次 channel() 配对；可传空串。 */
  option(opt?: string): this {
    this.optionList.push(opt ?? '');
    return this;
  }

  /** 直接以 CSV 形式指定多渠道字符串（与累积式 channel(Channel) 互斥）。 */
  channelString(csv?: string): this { this.req.channel = csv; return this; }

  /** 直接以 CSV 形式指定 option 字符串。 */
  optionString(csv?: string): this { this.req.option = csv; return this; }

  build(): BatchSendRequest {
    const finalChannel = this.channelList.length > 0 ? this.channelList.join(',') : this.req.channel;
    const finalOption = this.optionList.length > 0 ? this.optionList.join(',') : this.req.option;
    return { ...this.req, channel: finalChannel, option: finalOption };
  }
}

/**
 * 创建 BatchSendRequest 链式构造器。
 */
export function batchSendRequest(): BatchSendRequestBuilder {
  return new BatchSendRequestBuilder();
}

/** 批量发送的单条渠道结果。 */
export interface BatchSendResult {
  /** 消息流水号；可用于查询发送结果。 */
  shortCode?: string;
  /** 业务消息。 */
  message?: string;
  /** 业务 code。 */
  code?: number;
  /** 渠道。 */
  channel?: Channel | string;
}

/* ============================== 回调 ============================== */

export interface MessageCompleteInfo {
  /** 推送错误内容（如有）。 */
  message?: string;
  /** 消息流水号。 */
  shortCode?: string;
  /** 发送状态：0-未发送，1-发送中，2-发送成功，3-发送失败。 */
  sendStatus?: SendStatus | number;
}

export interface TopicUserInfo {
  id?: number;
  openId?: string;
  topicId?: number;
  userSex?: number;
  isFollow?: number;
  nickName?: string;
  havePhone?: number;
  topicCode?: string;
  topicName?: string;
  headImgUrl?: string;
  emailStatus?: number;
}

export interface FriendInfo {
  token?: string;
  friendId?: number;
  isFollow?: number;
  nickName?: string;
  havePhone?: number;
  createTime?: string;
  emailStatus?: number;
}

/**
 * PushPlus 回调统一载体。
 *
 * 使用 `parseCallback(json)` 解析回调请求体后，
 * 根据 `event` 判断事件类型并取对应的字段。
 */
export interface CallbackPayload {
  event?: CallbackEvent | string;
  messageInfo?: MessageCompleteInfo;
  topicUserInfo?: TopicUserInfo;
  friendInfo?: FriendInfo;
  /** 自定义二维码参数（仅 add_friend 事件有值）。 */
  qrCode?: string;
}

/* ============================== 开放接口 - access ============================== */

export interface AccessKeyResult {
  /** 访问令牌，后续请求需加到 header 中。 */
  accessKey?: string;
  /** 过期时间（单位秒）。 */
  expiresIn?: number;
}

/* ============================== 开放接口 - user ============================== */

export interface UserInfo {
  openId?: string;
  unionId?: string;
  nickName?: string;
  headImgUrl?: string;
  userSex?: number;
  token?: string;
  phoneNumber?: string;
  email?: string;
  emailStatus?: number;
  birthday?: string;
  points?: number;
}

export interface SendCount {
  wechatSendCount?: number;
  cpSendCount?: number;
  webhookSendCount?: number;
  mailSendCount?: number;
}

export interface UserLimitTime {
  /** 1-无限制，2-短期限制，3-永久限制。 */
  sendLimit?: number;
  userLimitTime?: string;
}

/* ============================== 开放接口 - message ============================== */

export interface MessageItem {
  topicName?: string;
  /** 消息类型：1-一对一消息，2-一对多消息。 */
  messageType?: number;
  title?: string;
  shortCode?: string;
  channel?: Channel | string;
  updateTime?: string;
}

export interface SendMessageResult {
  /** 0-未投递，1-发送中，2-已发送，3-发送失败。 */
  status?: SendStatus | number;
  errorMessage?: string;
  updateTime?: string;
}

/* ============================== 开放接口 - message token ============================== */

export interface MessageTokenAddRequest {
  /** 令牌名称；必填。 */
  name: string;
  /** 过期时间，格式 yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss；不填默认 2999-12-31。 */
  expireTime?: string;
}

export interface MessageTokenEditRequest {
  id: number;
  name?: string;
  expireTime?: string;
}

export interface MessageTokenItem {
  id?: number;
  name?: string;
  expireTime?: string;
  token?: string;
}

export interface MessageTokenOption {
  id?: number;
  name?: string;
}

/* ============================== 开放接口 - topic ============================== */

export interface TopicListQuery {
  current?: number;
  pageSize?: number;
  /** 例如 { topicType: 0 }；0-我创建的，1-我加入的。 */
  params?: Record<string, unknown>;
}

export interface TopicQrCode {
  qrCodeImgUrl?: string;
  /** 0-临时二维码，1-永久二维码。 */
  forever?: number;
}

export interface TopicAddRequest {
  topicCode?: string;
  topicName?: string;
  contact?: string;
  introduction?: string;
  receiptMessage?: string;
  appId?: string;
  icon?: string;
  /** 0普通；1积分；2公开。默认 0。 */
  topicType?: number;
  price?: number | string;
  topicDescribe?: string;
}

export interface TopicEditRequest {
  /** 群组编号，必填。 */
  topic: number;
  topicCode?: string;
  topicName?: string;
  contact?: string;
  introduction?: string;
  receiptMessage?: string;
  icon?: string;
  price?: number | string;
  topicDescribe?: string;
}

export interface TopicDetail {
  topicId?: number;
  topicName?: string;
  topicCode?: string;
  qrCodeImgUrl?: string;
  contact?: string;
  introduction?: string;
  receiptMessage?: string;
  nickName?: string;
  createTime?: string;
  topicUserCount?: number;
  icon?: string;
  appId?: string;
  topicType?: number;
  price?: number | string;
  topicDescribe?: string;
  userNickName?: string;
  isApproved?: number;
  firstIsApproved?: number;
  approveReason?: string;
  isOpen?: number;
}

export interface TopicItem {
  icon?: string;
  topicId?: number;
  topicCode?: string;
  topicName?: string;
  nickName?: string;
  createTime?: string;
  topicUserCount?: number;
  /** 0普通群组；1积分群组；2公开群组。 */
  topicType?: number;
  isApproved?: number;
  firstIsApproved?: number;
  approveReason?: string;
  /** 0否，1是。 */
  isOpen?: number;
}

export interface TopicUserItem {
  id?: number;
  nickName?: string;
  openId?: string;
  headImgUrl?: string;
  userSex?: number;
  havePhone?: number;
  isFollow?: number;
  emailStatus?: number;
  followTime?: string;
  remark?: string;
}

export interface TopicUserListQuery {
  current?: number;
  pageSize?: number;
  /** 例如 { topicId }。 */
  params?: Record<string, unknown>;
}

/* ============================== 开放接口 - webhook ============================== */

export interface WebhookItem {
  id?: number;
  webhookCode?: string;
  webhookName?: string;
  webhookType?: WebhookType | number;
  webhookTypeName?: string;
  webhookUrl?: string;
  createTime?: string;
  /** 自定义类型才返回。 */
  httpMethod?: string;
  headers?: string;
  body?: string;
}

export interface WebhookSaveRequest {
  /** 仅修改时使用。 */
  id?: number;
  webhookCode?: string;
  webhookName?: string;
  webhookType?: WebhookType | number;
  webhookUrl?: string;
  /** 自定义类型时使用。 */
  httpMethod?: string;
  headers?: string;
  body?: string;
}

/* ============================== 开放接口 - friend ============================== */

export interface FriendItem {
  id?: number;
  friendId?: number;
  token?: string;
  headImgUrl?: string;
  nickName?: string;
  emailStatus?: number;
  havePhone?: number;
  isFollow?: number;
  remark?: string;
  createTime?: string;
}

export interface FriendQrCode {
  qrCodeImgUrl?: string;
}

/* ============================== 开放接口 - clawbot ============================== */

export interface ClawBotInfo {
  createTime?: string;
  /** 是否有对话令牌（文档为字符串/数字混用，统一用 number 兼容）。 */
  haveContextToken?: number;
}

export interface ClawBotMessage {
  /** 1-文字，3-语音。 */
  type?: number;
  text?: string;
}

export interface ClawBotQrCode {
  url?: string;
  qrcode?: string;
}

/* ============================== 开放接口 - channel ============================== */

export interface MpItem {
  id?: number;
  nickName?: string;
  headImg?: string;
  principalName?: string;
  authorizationAppid?: string;
  funcInfo?: string;
  serviceType?: number;
  verifyType?: number;
  alias?: string;
  updateTime?: string;
}

export interface CpItem {
  id?: number;
  cpName?: string;
  cpCode?: string;
}

export interface MailItem {
  id?: number;
  mailName?: string;
  mailCode?: string;
}

export interface MailDetail {
  id?: number;
  mailName?: string;
  mailCode?: string;
  account?: string;
  password?: string;
  smtpServer?: string;
  smtpSsl?: number;
  smtpPort?: number;
  createTime?: string;
}

/* ============================== 开放接口 - setting ============================== */

export interface UserDefaultDetail {
  id?: number;
  channel?: Channel | string;
  option?: string;
  pre?: string;
  updateTime?: string;
  name?: string;
  tokenId?: number;
}

export interface UserDefaultItem {
  id?: number;
  channel?: Channel | string;
  channelTxt?: string;
  updateTime?: string;
  name?: string;
}

export interface UserDefaultSaveRequest {
  /** 默认配置编号（修改时必填）。 */
  id?: number;
  channel?: Channel | string;
  option?: string;
  pre?: string;
  /** 消息令牌 id；用户令牌为 0。 */
  tokenId?: number;
}

/* ============================== 开放接口 - pre ============================== */

export interface PreItem {
  id?: number;
  preName?: string;
  preCode?: string;
  /** 1-JavaScript。 */
  contentType?: number;
  createTime?: string;
}

export interface PreDetail {
  id?: number;
  preName?: string;
  preCode?: string;
  contentType?: number;
  content?: string;
}

export interface PreSaveRequest {
  /** 修改时必填。 */
  id?: number;
  content?: string;
  preName?: string;
  preCode?: string;
  /** 1-JavaScript。 */
  contentType?: number;
}

export interface PreTestRequest {
  content?: string;
  contentType?: number;
  message?: string;
}
