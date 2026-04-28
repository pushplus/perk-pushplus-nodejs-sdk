/**
 * Node.js 发送消息示例。
 *
 * 运行：
 *   PUSHPLUS_TOKEN=xxx node examples/send.mjs
 */
import {
  PushPlusClient,
  Channel,
  Template,
  sendRequest,
  batchSendRequest,
  PushPlusError,
  ErrorCode,
} from '../dist/index.js';

const token = process.env.PUSHPLUS_TOKEN;
if (!token) {
  console.error('请先设置 PUSHPLUS_TOKEN 环境变量');
  process.exit(1);
}

const client = PushPlusClient.builder()
  .token(token)
  .secretKey(process.env.PUSHPLUS_SECRET_KEY ?? '')
  .logRequest(true)
  .build();

try {
  // 最简：发送一条消息
  const code1 = await client.sendSimple('Hello', 'from perk-pushplus-sdk (js)');
  console.log('sendSimple shortCode =', code1);

  // 使用 Builder 发送 markdown 消息
  const code2 = await client.send(
    sendRequest()
      .title('部署完成')
      .content('# v1.0.0\n- env: prod')
      .template(Template.MARKDOWN)
      .channel(Channel.WECHAT)
      .build(),
  );
  console.log('send shortCode =', code2);

  // 多渠道
  const results = await client.batchSend(
    batchSendRequest()
      .title('多渠道告警')
      .content('CPU > 90%')
      .channel(Channel.WECHAT).option('')
      .channel(Channel.EXTENSION).option('')
      .build(),
  );
  console.log('batchSend results =', JSON.stringify(results, null, 2));
} catch (e) {
  if (e instanceof PushPlusError) {
    if (e.isRateLimited()) {
      console.warn('命中 code=900：', e.message);
    } else {
      console.error(`code=${e.code} errorCode=${ErrorCode[e.errorCode]} msg=${e.message}`);
    }
  } else {
    throw e;
  }
}
