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
