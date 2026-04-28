import { PushPlusError } from './exception';
import { CallbackPayload } from './models';

/**
 * PushPlus 回调请求体解析工具。
 *
 * 用法：在你的回调接口中拿到原始 JSON body，直接传入 `parseCallback(body)` 即可。
 *
 * @example
 * ```ts
 * import { parseCallback, CallbackEvent } from '@perk-net/perk-pushplus-sdk';
 *
 * function onPushPlusCallback(rawBody: string) {
 *   const payload = parseCallback(rawBody);
 *   switch (payload.event) {
 *     case CallbackEvent.MESSAGE_COMPLETE:
 *       // payload.messageInfo
 *       break;
 *     case CallbackEvent.ADD_TOPIC_USER:
 *       // payload.topicUserInfo
 *       break;
 *     case CallbackEvent.ADD_FRIEND:
 *       // payload.friendInfo, payload.qrCode
 *       break;
 *   }
 *   return 'ok';
 * }
 * ```
 */
export function parseCallback(json: string | object): CallbackPayload {
  if (json == null) {
    throw new PushPlusError('回调请求体不能为空');
  }
  if (typeof json === 'string') {
    try {
      return JSON.parse(json) as CallbackPayload;
    } catch (e) {
      throw new PushPlusError(`解析 PushPlus 回调失败: ${(e as Error).message}`, -1, { cause: e });
    }
  }
  return json as CallbackPayload;
}

export const CallbackParser = {
  parse: parseCallback,
};
