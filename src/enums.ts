/**
 * PushPlus 发送渠道枚举。
 *
 * 对应官方文档「发送渠道（channel）枚举」。
 */
export enum Channel {
  /** 微信公众号（默认）。 */
  WECHAT = 'wechat',
  /** 第三方 webhook（企业微信/钉钉/飞书/bark/Gotify/Server酱/IFTTT/WxPusher 等）。 */
  WEBHOOK = 'webhook',
  /** 企业微信应用。 */
  CP = 'cp',
  /** 邮箱。 */
  MAIL = 'mail',
  /** 短信（收费）。 */
  SMS = 'sms',
  /** 语音（收费）。 */
  VOICE = 'voice',
  /** 浏览器扩展插件 / 桌面应用程序。 */
  EXTENSION = 'extension',
  /** App 渠道（安卓/鸿蒙/iOS）。 */
  APP = 'app',
  /** 微信 ClawBot。 */
  CLAWBOT = 'clawbot',
  /** QQ 机器人；不带 option 发给自己，option 填配置编码则发到对应 QQ 群。 */
  QQ = 'qq',
}

/**
 * PushPlus 消息模板枚举。
 */
export enum Template {
  /** 默认模板，支持 HTML 文本。 */
  HTML = 'html',
  /** 纯文本，不转义 HTML。 */
  TXT = 'txt',
  /** 基于 JSON 格式展示。 */
  JSON = 'json',
  /** Markdown 格式。 */
  MARKDOWN = 'markdown',
  /** 阿里云监控报警定制模板。 */
  CLOUD_MONITOR = 'cloudMonitor',
  /** Jenkins 插件定制模板。 */
  JENKINS = 'jenkins',
  /** 路由器插件定制模板。 */
  ROUTE = 'route',
  /** 支付成功通知模板。 */
  PAY = 'pay',
  /** 表单格式模板；发送时需传 pushId（表单编码）。 */
  FORM = 'form',
  /** 文档格式模板（push 文档）；发送时需传 pushId。 */
  DOC = 'doc',
  /** 表格格式模板（push 表格）；发送时需传 pushId。 */
  EXCEL = 'excel',
}

/**
 * 消息投递状态。
 *
 * 0-未发送/未投递，1-发送中，2-发送成功，3-发送失败。
 */
export enum SendStatus {
  NOT_SENT = 0,
  SENDING = 1,
  SUCCESS = 2,
  FAILED = 3,
}

export const SendStatusDescription: Record<SendStatus, string> = {
  [SendStatus.NOT_SENT]: '未发送',
  [SendStatus.SENDING]: '发送中',
  [SendStatus.SUCCESS]: '发送成功',
  [SendStatus.FAILED]: '发送失败',
};

/**
 * 回调事件类型。
 */
export enum CallbackEvent {
  /** 消息发送完成。 */
  MESSAGE_COMPLETE = 'message_complate',
  /** 群组新增用户。 */
  ADD_TOPIC_USER = 'add_topic_user',
  /** 新增好友。 */
  ADD_FRIEND = 'add_friend',
}

/**
 * Webhook 渠道类型。
 *
 * 对应开放接口文档「webhook 列表」中的 webhookType 枚举值。
 */
export enum WebhookType {
  WORK_WECHAT_BOT = 1,
  DING_TALK_BOT = 2,
  FEISHU_BOT = 3,
  SERVER_CHAN = 4,
  BARK = 50,
  WORK_WECHAT_APP = 6,
  TENCENT_LIGHT_LINK = 7,
  IFTTT = 8,
  JI_JIAN_YUN = 9,
  GOTIFY = 10,
  WX_PUSHER = 11,
  CUSTOM = 12,
}

export const WebhookTypeDescription: Record<number, string> = {
  [WebhookType.WORK_WECHAT_BOT]: '企业微信机器人',
  [WebhookType.DING_TALK_BOT]: '钉钉机器人',
  [WebhookType.FEISHU_BOT]: '飞书机器人',
  [WebhookType.SERVER_CHAN]: 'Server酱',
  [WebhookType.BARK]: 'bark',
  [WebhookType.WORK_WECHAT_APP]: '企业微信应用',
  [WebhookType.TENCENT_LIGHT_LINK]: '腾讯轻联',
  [WebhookType.IFTTT]: 'IFTTT',
  [WebhookType.JI_JIAN_YUN]: '集简云',
  [WebhookType.GOTIFY]: 'Gotify',
  [WebhookType.WX_PUSHER]: 'WxPusher',
  [WebhookType.CUSTOM]: '自定义',
};

/**
 * push 表单状态。
 *
 * 0-草稿，1-收集中，2-已停止。
 */
export enum FormStatus {
  DRAFT = 0,
  COLLECTING = 1,
  STOPPED = 2,
}

export const FormStatusDescription: Record<FormStatus, string> = {
  [FormStatus.DRAFT]: '草稿',
  [FormStatus.COLLECTING]: '收集中',
  [FormStatus.STOPPED]: '已停止',
};

/**
 * push 文档 / 表格分享权限。
 *
 * 0-关闭分享，1-开启分享（仅可查看）。
 */
export enum SharePerm {
  CLOSED = 0,
  VIEW = 1,
}

/**
 * push 文档 / 表格打开分享页是否需要登录。
 *
 * 0-免登录，1-需登录。
 */
export enum ShareLogin {
  ANONYMOUS = 0,
  REQUIRED = 1,
};

/**
 * 消息规则总开关模式。
 *
 * 0-关闭（推送与原来一致），1-开启且未命中时仍按默认方式推送，2-开启且未命中时不推送。
 */
export enum ForwardMode {
  OFF = 0,
  ON_FALLBACK = 1,
  ON_STRICT = 2,
}

export const ForwardModeDescription: Record<ForwardMode, string> = {
  [ForwardMode.OFF]: '关闭（推送与原来一致）',
  [ForwardMode.ON_FALLBACK]: '开启，未命中时仍按默认方式推送',
  [ForwardMode.ON_STRICT]: '开启，未命中时不推送',
};

/**
 * 消息规则触发来源。
 *
 * 0-全部，1-消息接口，2-邮件。
 */
export enum ForwardSourceType {
  ALL = 0,
  API = 1,
  MAIL = 2,
}

export const ForwardSourceTypeDescription: Record<ForwardSourceType, string> = {
  [ForwardSourceType.ALL]: '全部',
  [ForwardSourceType.API]: '消息接口',
  [ForwardSourceType.MAIL]: '邮件',
};

/**
 * 模板变量来源。
 *
 * 1-请求头，2-Query参数，3-请求体，4-URL路径，5-主题（邮件）。
 */
export enum ForwardVarSourceType {
  HEADER = 1,
  QUERY = 2,
  BODY = 3,
  PATH = 4,
  SUBJECT = 5,
}

export const ForwardVarSourceTypeDescription: Record<ForwardVarSourceType, string> = {
  [ForwardVarSourceType.HEADER]: '请求头',
  [ForwardVarSourceType.QUERY]: 'Query参数',
  [ForwardVarSourceType.BODY]: '请求体',
  [ForwardVarSourceType.PATH]: 'URL路径',
  [ForwardVarSourceType.SUBJECT]: '主题（邮件）',
};

/**
 * 模板变量提取方式。
 *
 * 1-序列化数据，2-正则表达式，3-JSONPath，4-原始全文。
 */
export enum ForwardExtractType {
  SERIALIZED = 1,
  REGEX = 2,
  JSON_PATH = 3,
  RAW = 4,
}

export const ForwardExtractTypeDescription: Record<ForwardExtractType, string> = {
  [ForwardExtractType.SERIALIZED]: '序列化数据',
  [ForwardExtractType.REGEX]: '正则表达式',
  [ForwardExtractType.JSON_PATH]: 'JSONPath',
  [ForwardExtractType.RAW]: '原始全文',
};

/**
 * 消息规则触发记录匹配结果。
 *
 * 0-条件不满足，1-已转发，2-频率限制，3-不在触发时间段，4-执行异常。
 */
export enum ForwardMatchResult {
  NOT_MATCHED = 0,
  FORWARDED = 1,
  RATE_LIMITED = 2,
  OUT_OF_TIME = 3,
  ERROR = 4,
}

export const ForwardMatchResultDescription: Record<ForwardMatchResult, string> = {
  [ForwardMatchResult.NOT_MATCHED]: '条件不满足',
  [ForwardMatchResult.FORWARDED]: '已转发',
  [ForwardMatchResult.RATE_LIMITED]: '频率限制',
  [ForwardMatchResult.OUT_OF_TIME]: '不在触发时间段',
  [ForwardMatchResult.ERROR]: '执行异常',
};

/**
 * 图形化触发条件运算符。
 */
export enum ForwardConditionOperator {
  EQ = 'eq',
  NE = 'ne',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  REGEX = 'regex',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  IN = 'in',
  NOT_IN = 'notIn',
  EMPTY = 'empty',
  NOT_EMPTY = 'notEmpty',
}

/**
 * 消息规则发送目标的消息类型。
 *
 * 也支持写成 `{{变量名}}`。
 */
export enum ForwardMessageType {
  ONE = 'one',
  TOPIC = 'topic',
  FRIEND = 'friend',
}

/**
 * PushPlus 接口业务返回码语义。
 *
 * 对应官方文档「接口返回码说明」：https://www.pushplus.plus/doc/guide/code.html
 */
export enum ErrorCode {
  /** 200 执行成功。 */
  OK = 200,
  /** 302 未登录。 */
  NOT_LOGIN = 302,
  /** 401 请求未授权（开放接口未启用）。 */
  UNAUTHORIZED = 401,
  /** 403 请求 IP 未授权（白名单未配置）。 */
  IP_FORBIDDEN = 403,
  /** 500 系统异常，请稍后再试。 */
  SERVER_ERROR = 500,
  /** 600 数据异常，操作失败。 */
  DATA_ERROR = 600,
  /** 805 无权查看。 */
  FORBIDDEN_VIEW = 805,
  /** 888 积分不足，需要充值。 */
  INSUFFICIENT_POINTS = 888,
  /** 900 用户账号使用受限（请求次数过多）。 */
  RATE_LIMITED = 900,
  /** 905 账户未进行实名认证。 */
  NOT_VERIFIED = 905,
  /** 903 无效的用户令牌。 */
  INVALID_TOKEN = 903,
  /** 999 服务端验证错误。 */
  VALIDATION_ERROR = 999,
  /** 其它未在文档中列出的 code。 */
  UNKNOWN = -1,
}

export function errorCodeFromValue(code: number | null | undefined): ErrorCode {
  if (code == null) return ErrorCode.UNKNOWN;
  const known = [
    ErrorCode.OK,
    ErrorCode.NOT_LOGIN,
    ErrorCode.UNAUTHORIZED,
    ErrorCode.IP_FORBIDDEN,
    ErrorCode.SERVER_ERROR,
    ErrorCode.DATA_ERROR,
    ErrorCode.FORBIDDEN_VIEW,
    ErrorCode.INSUFFICIENT_POINTS,
    ErrorCode.RATE_LIMITED,
    ErrorCode.NOT_VERIFIED,
    ErrorCode.INVALID_TOKEN,
    ErrorCode.VALIDATION_ERROR,
  ];
  return known.includes(code as ErrorCode) ? (code as ErrorCode) : ErrorCode.UNKNOWN;
}

export function isRateLimitedCode(code: number | null | undefined): boolean {
  return code != null && code === ErrorCode.RATE_LIMITED;
}
