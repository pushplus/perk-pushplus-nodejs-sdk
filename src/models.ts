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
  /** push 编码；template 为 form/doc/excel 时必传。 */
  pushId?: string;
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
  pushId(v?: string): this { this.req.pushId = v; return this; }

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
  /** push 编码；template 为 form/doc/excel 时必传。 */
  pushId?: string;
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
  pushId(v?: string): this { this.req.pushId = v; return this; }

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

/** 会员信息。 */
export interface VipInfo {
  /** 是否会员；0-否，1-是。 */
  isVip?: number;
  /** 会员到期日。 */
  lastDay?: string;
}

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
  /** 会员信息。 */
  vipInfo?: VipInfo;
  /** 实名认证状态；0-未实名，1-已实名。 */
  verifyStatus?: number;
}

export interface SendCount {
  wechatSendCount?: number;
  cpSendCount?: number;
  webhookSendCount?: number;
  mailSendCount?: number;
  qqBotSendCount?: number;
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

/** 群组订阅人黑名单列表项。 */
export interface TopicUserBlacklistItem {
  /** 黑名单记录 ID；解除黑名单时使用。 */
  id?: number;
  /** 被拉黑用户 ID。 */
  userId?: number;
  nickName?: string;
  openId?: string;
  headImgUrl?: string;
  /** 拉黑时间。 */
  createTime?: string;
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

/** 好友黑名单列表项。 */
export interface FriendBlacklistItem {
  /** 黑名单记录 ID；解除黑名单时使用。 */
  id?: number;
  /** 被拉黑好友 ID。 */
  friendId?: number;
  nickName?: string;
  headImgUrl?: string;
  /** 拉黑时间。 */
  createTime?: string;
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

/* ============================== 开放接口 - QQ 机器人 ============================== */

export interface QqBotBindLink {
  /** 带参分享链接，用于生成扫码二维码；已绑定用户再次获取时可能为空。 */
  url?: string;
  /** 绑定码。已是好友时扫码收不到加好友事件，需私聊发送该码；认领 QQ 群也用此码。 */
  bindCode?: string;
  /** 有效期秒数，默认 300。 */
  expireSeconds?: number;
  /** 为当前用户分配的官方机器人 appId。 */
  botAppId?: string;
  botName?: string;
  botAvatar?: string;
}

export interface QqBotInfo {
  botId?: string;
  username?: string;
  avatar?: string;
  appId?: string;
  /** 官方分享链接，可用于拉机器人进群。 */
  shareUrl?: string;
}

export interface QqBotBindInfo {
  /** 0-未绑定，1-已绑定。 */
  isBind?: number;
  /** 1-可接收，0-用户已关闭单聊接收。 */
  receiveStatus?: number;
  createTime?: string;
  botInfo?: QqBotInfo;
}

export interface QqGroupItem {
  /** 群编号；新增渠道配置时作为 qqGroupId 使用。 */
  id?: number;
  groupOpenId?: string;
  groupRemark?: string;
  /** 1-在群，2-群消息接收关闭。 */
  status?: number;
  /** 群名称，接口未授权时为空。 */
  groupName?: string;
  groupFingerMemo?: string;
  groupClassText?: string;
  groupTags?: string[];
  groupMemberNum?: number;
  createTime?: string;
}

export interface QqBotItem {
  id?: number;
  qqName?: string;
  /** 配置编码；发送消息时作为 option 传入。 */
  qqCode?: string;
  /** 2-发到 QQ 群。 */
  sendType?: number;
  qqGroupId?: number;
  groupRemark?: string;
  groupOpenId?: string;
  groupName?: string;
  updateTime?: string;
}

export interface QqBotSaveRequest {
  /** 修改时必填。 */
  id?: number;
  /** 配置名称，必填，最多 64 个字符。 */
  qqName?: string;
  /** 配置编码，新增必填；仅支持字母、数字、下划线和中划线，创建后不可修改。 */
  qqCode?: string;
  /** 发送类型；留空时 SDK 自动填 2（发到 QQ 群）。 */
  sendType?: number;
  /** QQ 群编号，必填，取自 groupList 返回的 id。 */
  qqGroupId?: number;
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

/* ============================== 开放接口 - image ============================== */

/**
 * 图片服务 - 获取上传凭证响应。
 *
 * 对应文档「十二. 图片服务接口 / 1. 获取上传凭证」。
 * 返回七牛云表单上传所需的 token 及上传域名、存储桶等信息。
 */
export interface ImageUploadToken {
  /** 七牛云上传凭证。 */
  uploadToken?: string;
  /** 七牛云上传域名，例如 `https://upload.qiniup.com`。 */
  uploadHost?: string;
  /** 七牛云上传地址，一般等同于 `uploadHost + "/"`。 */
  uploadUrl?: string;
  /** 七牛云存储桶名称。 */
  bucket?: string;
  /** 凭证有效时间（秒）。 */
  expiresIn?: number;
}

/**
 * 图片服务 - 上传图片响应（由七牛云直接返回）。
 *
 * 注意：该响应不是 PushPlus 统一的 `{code, msg, data}` 结构，
 * 判断成功使用 `errno === 0`。
 */
export interface ImageUploadResult {
  /** 错误码；0 表示成功。 */
  errno?: number;
  /** 文件扩展名，例如 `.png`。 */
  ext?: string;
  /** 文件名。 */
  fname?: string;
  /** 文件大小（字节）。 */
  fsize?: number;
  /** 七牛云文件 hash。 */
  hash?: string;
  /** 对象存储中的路径 key。 */
  key?: string;
  /** MIME 类型，例如 `image/png`。 */
  mimeType?: string;
  /** 响应说明。 */
  msg?: string;
  /** 缩略图地址。 */
  thumbnail?: string;
  /** 图片访问地址。 */
  url?: string;
}

/** 图片服务 - 图片列表项。 */
export interface ImageItem {
  /** 图片 id。 */
  id?: number;
  /** 图片地址。 */
  imgUrl?: string;
  /** 缩略图地址。 */
  thumbnail?: string;
  /** 创建时间。 */
  createTime?: string;
}

/* ============================== 开放接口 - form（push 表单） ============================== */

/** 我的表单分页查询。官方结构为 `{current, pageSize, params:{keyword, status}}`。 */
export interface FormListQuery {
  /** 当前所在分页数，默认 1。 */
  current?: number;
  /** 每页大小，默认 20，最大 50。 */
  pageSize?: number;
  params?: {
    /** 按标题关键词搜索。 */
    keyword?: string;
    /** 表单状态：0草稿 / 1收集中 / 2已停止。 */
    status?: number;
    [key: string]: unknown;
  };
}

/** 表单封面页配置。 */
export interface FormCover {
  enabled?: boolean;
  image?: string;
  buttonText?: string;
}

/** 表单主题外观。 */
export interface FormTheme {
  primaryColor?: string;
  backgroundColor?: string;
  headerImage?: string;
  backgroundImage?: string;
  cover?: FormCover;
}

/** 表单收集 / 展示设置。 */
export interface FormSettings {
  endTime?: string | null;
  maxResponses?: number | null;
  oncePerUser?: boolean;
  allowAnonymous?: boolean;
  password?: string;
  showQuestionNumber?: boolean;
  onePerPage?: boolean;
  showPrevButton?: boolean;
  hideTitle?: boolean;
  hideCopyright?: boolean;
  hideAd?: boolean;
  showOutline?: boolean;
  thankText?: string;
  redirectEnabled?: boolean;
  redirectUrl?: string;
  allowEdit?: boolean;
}

/**
 * 表单题目。不同题型字段不同，除常用字段外可携带任意扩展属性。
 *
 * type 常用取值：input / textarea / radio / checkbox / select / number / date / rate 等。
 */
export interface FormItem {
  id?: string;
  type?: string;
  alias?: string;
  label?: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options?: unknown[];
  rows?: unknown[];
  columns?: unknown[];
  allowOther?: boolean;
  [key: string]: unknown;
}

/** 表单列表项 / 创建、复制结果（不含题目明细）。 */
export interface FormListItem {
  id?: number;
  formCode?: string;
  fillUrl?: string;
  title?: string;
  description?: string;
  status?: number;
  responseCount?: number;
  publishTime?: string;
  createTime?: string;
  updateTime?: string;
}

/** 保存表单设计请求。 */
export interface FormSaveRequest {
  id: number;
  title: string;
  description?: string;
  items?: FormItem[];
  theme?: FormTheme;
  settings?: FormSettings;
}

/** 表单详情（含草稿题目、主题、设置）。 */
export interface FormDetail extends FormListItem {
  items?: FormItem[];
  theme?: FormTheme;
  settings?: FormSettings;
  publishDirty?: boolean;
}

/** 草稿题目与发布快照差异。 */
export interface FormPublishDiff {
  dirty?: boolean;
  breaking?: boolean;
  responseCount?: number;
  added?: string[];
  removed?: string[];
  typeChanged?: string[];
  optionChanged?: string[];
}

/** 发布表单结果。 */
export interface FormPublishResult {
  id?: number;
  formCode?: string;
  fillUrl?: string;
  title?: string;
  status?: number;
  previousStatus?: number;
  publishDirty?: boolean;
  publishTime?: string;
}

/* ============================== 开放接口 - doc / excel 共用查询 ============================== */

/** 文档 / 表格分页查询。官方结构为 `{current, pageSize, params:{keyword, shareEnabled}}`。 */
export interface DocListQuery {
  /** 当前所在分页数，默认 1。 */
  current?: number;
  /** 每页大小，默认 20，最大 50。 */
  pageSize?: number;
  params?: {
    keyword?: string;
    /** true 时仅返回已开启分享的记录。 */
    shareEnabled?: boolean;
    [key: string]: unknown;
  };
}

/** 文档 / 表格列表项。 */
export interface DocListItem {
  docCode?: string;
  shareUrl?: string;
  title?: string;
  sharePerm?: number;
  shareLogin?: number;
  perm?: number;
  published?: boolean;
  publishTime?: string;
  createTime?: string;
  updateTime?: string;
}

/** 文档信息（不含正文）。 */
export interface DocVo extends DocListItem {
  publishDirty?: boolean;
}

/** 文档内容（HTML 草稿）。 */
export interface DocContent extends DocVo {
  content?: string;
}

/** 表格信息（不含正文）。与文档结构相同，独立类型便于区分。 */
export interface ExcelVo extends DocListItem {
  publishDirty?: boolean;
}

/** 表格内容（整表 JSON 字符串草稿）。 */
export interface ExcelContent extends ExcelVo {
  /** 整表草稿 JSON 字符串。 */
  content?: string;
}

/** 按区域写入单元格请求。 */
export interface ExcelWriteCellsRequest {
  docCode: string;
  /** 工作表名称；不传则写入活动表 / 第一张表。 */
  sheetName?: string;
  /** 起始单元格，如 A1。 */
  range: string;
  /** 二维数组，外层为行、内层为列。 */
  values: unknown[][];
}
