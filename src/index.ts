/**
 * PushPlus(推送加) JavaScript/TypeScript SDK
 *
 * - Node.js 18+：使用内置 fetch；< 18 请自定义 HttpRequester。
 * - 浏览器：原生 fetch。
 * - TypeScript：完整类型定义。
 */

export {
  PushPlusClient,
  PushPlusClientBuilder,
  type PushPlusClientOptions,
} from './client';
export {
  type PushPlusConfig,
  type ResolvedPushPlusConfig,
  DEFAULT_BASE_URL,
  resolveConfig,
} from './config';
export {
  Channel,
  Template,
  SendStatus,
  SendStatusDescription,
  CallbackEvent,
  WebhookType,
  WebhookTypeDescription,
  FormStatus,
  FormStatusDescription,
  SharePerm,
  ShareLogin,
  ForwardMode,
  ForwardModeDescription,
  ForwardSourceType,
  ForwardSourceTypeDescription,
  ForwardVarSourceType,
  ForwardVarSourceTypeDescription,
  ForwardExtractType,
  ForwardExtractTypeDescription,
  ForwardMatchResult,
  ForwardMatchResultDescription,
  ForwardConditionOperator,
  ForwardMessageType,
  ErrorCode,
  errorCodeFromValue,
  isRateLimitedCode,
} from './enums';
export { PushPlusError, PushPlusException } from './exception';
export {
  type HttpRequester,
  type HttpRequestOptions,
  type HttpRawBody,
  type HttpRawRequestOptions,
  type HttpResponse,
  FetchHttpRequester,
  isSuccessfulHttpStatus,
  callExecuteRaw,
} from './http';
export { RateLimitGuard } from './rate-limit';
export { AccessKeyManager } from './access-key-manager';
export { parseCallback, CallbackParser } from './callback';

/* models */
export type {
  ApiResponse,
  PageQuery,
  PageResult,
  SendRequest,
  BatchSendRequest,
  BatchSendResult,
  CallbackPayload,
  MessageCompleteInfo,
  TopicUserInfo,
  FriendInfo,
  AccessKeyResult,
  UserInfo,
  VipInfo,
  SendCount,
  UserLimitTime,
  MessageItem,
  SendMessageResult,
  MessageTokenAddRequest,
  MessageTokenEditRequest,
  MessageTokenItem,
  MessageTokenOption,
  TopicListQuery,
  TopicQrCode,
  TopicAddRequest,
  TopicEditRequest,
  TopicDetail,
  TopicItem,
  TopicUserItem,
  TopicUserListQuery,
  TopicUserBlacklistItem,
  WebhookItem,
  WebhookSaveRequest,
  FriendItem,
  FriendQrCode,
  FriendBlacklistItem,
  ClawBotInfo,
  ClawBotMessage,
  ClawBotQrCode,
  CmccBindRequest,
  CmccInfo,
  QqBotBindLink,
  QqBotBindInfo,
  QqBotInfo,
  QqBotItem,
  QqBotSaveRequest,
  QqGroupItem,
  MpItem,
  CpItem,
  MailItem,
  MailDetail,
  UserDefaultDetail,
  UserDefaultItem,
  UserDefaultSaveRequest,
  PreItem,
  PreDetail,
  PreSaveRequest,
  PreTestRequest,
  ImageUploadToken,
  ImageUploadResult,
  ImageItem,
  FormListQuery,
  FormCover,
  FormTheme,
  FormSettings,
  FormItem,
  FormListItem,
  FormSaveRequest,
  FormDetail,
  FormPublishDiff,
  FormPublishResult,
  DocListQuery,
  DocListItem,
  DocVo,
  DocContent,
  ExcelVo,
  ExcelContent,
  ExcelWriteCellsRequest,
  ForwardConditionItem,
  ForwardCondition,
  ForwardVariable,
  ForwardTarget,
  ForwardRuleItem,
  ForwardRuleDetail,
  ForwardRuleSaveRequest,
  ForwardRuleTestRequest,
  ForwardRuleTestResult,
  ForwardRuleSetting,
  ForwardLogListQuery,
  ForwardLogItem,
  ForwardLogDetail,
} from './models';

export {
  SendRequestBuilder,
  BatchSendRequestBuilder,
  sendRequest,
  batchSendRequest,
} from './models';

/* APIs（一般通过 client.xxx 访问，但也允许单独导入便于扩展） */
export { AbstractApi } from './api/base';
export { OpenAbstractApi } from './api/open-base';
export { AccessKeyApi } from './api/access-key-api';
export { MessageApi } from './api/message-api';
export { OpenMessageApi } from './api/open-message-api';
export { UserApi } from './api/user-api';
export { MessageTokenApi } from './api/message-token-api';
export { TopicApi } from './api/topic-api';
export { TopicUserApi } from './api/topic-user-api';
export { FriendApi } from './api/friend-api';
export { WebhookApi } from './api/webhook-api';
export { ChannelApi } from './api/channel-api';
export { ClawBotApi } from './api/clawbot-api';
export { CmccApi } from './api/cmcc-api';
export { QqBotApi } from './api/qqbot-api';
export { SettingApi } from './api/setting-api';
export { PreApi } from './api/pre-api';
export {
  ImageApi,
  type ImageFileInput,
  type ImageUploadOptions,
} from './api/image-api';
export { FormApi } from './api/form-api';
export { DocApi } from './api/doc-api';
export { ExcelApi } from './api/excel-api';
export { ForwardRuleApi } from './api/forward-rule-api';
export { ForwardLogApi } from './api/forward-log-api';
export { type FileInput } from './multipart';
