# @perk-net/perk-pushplus-sdk

[pushplus(推送加)](https://www.pushplus.plus) 官方接口的 **JavaScript / TypeScript SDK**，覆盖 **消息接口** 与 **全部开放接口**。

- **同时支持 Node.js 与浏览器**：Node.js 18+ 使用内置 `fetch`，浏览器使用原生 `fetch`，无运行时依赖。
- **三种产物**：CommonJS (`.cjs`) + ESModule (`.js`) + 浏览器 IIFE (`.global.js`)，可通过 npm / `<script>` 直接加载。
- **完整 TypeScript 类型**：所有请求 / 响应 / 枚举 / 回调全部带类型声明。
- **全部开放接口**：用户、消息、消息 token、群组、群组用户、好友、webhook、渠道、ClawBot、QQ 机器人、功能设置、预处理、图片服务（含一键上传到 PushPlus 图床）、push 表单、push 文档、push 表格、消息规则。
- **AccessKey 自动管理**：缓存 + 过期前自动刷新；`code=401` 自动刷新并重试一次。
- **本地限流守卫**：命中 `code=900` 后按 token 短路同 token 后续发送，避免被服务端长期封禁。
- **Builder 链式 API**：与 Java/Python SDK 风格保持一致。
- **回调解析**：`message_complate` / `add_topic_user` / `add_friend` 三类回调统一类型化解析。

> 接口文档：
> - 消息接口：<https://www.pushplus.plus/doc/guide/api.html>
> - 开放接口：<https://www.pushplus.plus/doc/guide/openApi.html>
> - push 表单：<https://www.pushplus.plus/doc/ecosystem/form/>
> - push 文档：<https://www.pushplus.plus/doc/ecosystem/doc/>
> - push 表格：<https://www.pushplus.plus/doc/ecosystem/sheet/>

## 安装

```bash
npm install @perk-net/perk-pushplus-sdk
# 或
pnpm add @perk-net/perk-pushplus-sdk
# 或
yarn add @perk-net/perk-pushplus-sdk
```

浏览器直接通过 CDN 引入：

```html
<script src="https://unpkg.com/@perk-net/perk-pushplus-sdk/dist/index.global.js"></script>
<script>
  // 全局变量名 PerkPushPlus
  const client = new PerkPushPlus.PushPlusClient({ token: 'your_user_token' });
  client.sendSimple('标题', 'Hello PushPlus').then(console.log);
</script>
```

> **作用域包**：本包在 npm 上为组织 **`@perk-net`** 下的公开包。安装与导入时请始终带上作用域前缀（见上文命令）。  
> **维护者发布**：请使用具备 **`@perk-net` 组织发布权限** 的账号，并满足 npm 要求（如已开启账号 **2FA**，或使用可绕过写入 2FA 的 **Granular Access Token**）。仓库内已设置 `publishConfig.access: "public"`，首次发布通常无需再手动加 `--access public`。

## 快速开始

### 1. 构建客户端

```ts
import { PushPlusClient } from '@perk-net/perk-pushplus-sdk';

const client = new PushPlusClient({
  token: 'your_user_token',     // 个人中心 -> 一对一推送
  secretKey: 'your_secret_key', // 个人中心 -> 开发设置（开放接口必填）
});

// 也支持 Builder 风格
const client2 = PushPlusClient.builder()
  .token('your_user_token')
  .secretKey('your_secret_key')
  .build();
```

> `PushPlusClient` 无状态，建议作为单例长期持有。

### 2. 发送消息

```ts
import { Channel, Template, sendRequest } from '@perk-net/perk-pushplus-sdk';

// 最简：默认 wechat / html
const shortCode = await client.sendSimple('标题', '<b>内容</b>');

// 完整：使用 Builder
const code = await client.send(
  sendRequest()
    .title('CPU 告警')
    .content('# CPU > 90%\n请尽快处理')
    .template(Template.MARKDOWN)
    .channel(Channel.WECHAT)
    .topic('ops')
    .callbackUrl('https://your.host/pushplus/callback')
    .build(),
);

// 也可以直接传普通对象
await client.send({
  title: '部署完成',
  content: 'v1.0.0',
  template: Template.MARKDOWN,
});

// push 表单 / 文档 / 表格：template 为 form/doc/excel 时需传 pushId（对应编码）
await client.send(
  sendRequest()
    .title('表单通知')
    .content('您有新的表单待填写')
    .template(Template.FORM)
    .pushId('表单编码')
    .build(),
);
await client.send(
  sendRequest()
    .title('本周工作同步')
    .content('请查收')
    .template(Template.DOC)
    .pushId('文档编码')
    .build(),
);
await client.send(
  sendRequest()
    .title('销售日报')
    .content('请查收')
    .template(Template.EXCEL)
    .pushId('表格编码')
    .build(),
);
```

### 3. 多渠道发送

```ts
import { Channel, batchSendRequest } from '@perk-net/perk-pushplus-sdk';

const results = await client.batchSend(
  batchSendRequest()
    .title('多渠道告警')
    .content('CPU > 90%')
    .channel(Channel.WECHAT).option('')
    .channel(Channel.WEBHOOK).option('bark')
    .channel(Channel.EXTENSION).option('')
    .build(),
);

for (const r of results) {
  console.log(r.channel, r.shortCode, r.code, r.message);
}
```

`channel(...)` 与 `option(...)` 可累计调用，SDK 自动用逗号拼接，与官方文档示例语义一致。

### 4. 开放接口（全量）

> 需要在 PushPlus 后台「开发设置」中：开启开放接口、配置 `secretKey`、把调用方所在公网 IP 加入安全 IP 列表。
> AccessKey 完全自动管理 —— 直接调用就好。

```ts
// 用户
const me = await client.user.myInfo();
const limit = await client.user.getLimitTime();
const count = await client.user.getSendCount();

// 消息
const page = await client.openMessage.list({ current: 1, pageSize: 20 });
const result = await client.openMessage.queryResult('short-code');
const url = client.openMessage.detailUrl('short-code');

// 消息 token
const newToken = await client.messageToken.add({ name: 'for-jenkins' });

// 群组
const topics = await client.topic.list({
  current: 1, pageSize: 20, params: { topicType: 0 },
});
const detail = await client.topic.detail(123);
const qr = await client.topic.qrCode(123, 86400, -1);

// 群组用户
await client.topicUser.editRemark(456, '老张');
await client.topicUser.addBlacklist(10);
const topicBlacklist = await client.topicUser.blacklistList({
  current: 1,
  pageSize: 20,
  params: { topicId: 1 },
});

// 好友
const myQr = await client.friend.getQrCode({ content: 'welcome' });
const friends = await client.friend.list({ current: 1, pageSize: 20 });
await client.friend.addBlacklist(friends.list[0].friendId);
const friendBlacklist = await client.friend.blacklistList({ current: 1, pageSize: 20 });

// webhook 渠道
import { WebhookType } from '@perk-net/perk-pushplus-sdk';
await client.webhook.add({
  webhookCode: 'bark',
  webhookName: '我的 Bark',
  webhookType: WebhookType.BARK,
  webhookUrl: 'https://api.day.app/xxxx',
});

// 渠道（公众号 / 企业微信 / 邮箱）
const mps = await client.channel.mpList();

// ClawBot
const botQr = await client.clawBot.getBotQrcode();

// QQ 机器人：绑定 -> 认领群 -> 建配置 -> 发到群
const link = await client.qqBot.getBindLink();   // link.url 生成二维码，或私聊发送 link.bindCode
const bind = await client.qqBot.botInfo();       // bind.isBind === 1 表示已绑定
const qqGroups = await client.qqBot.groupList();
await client.qqBot.add({ qqName: '运维告警群', qqCode: 'ops-group', qqGroupId: qqGroups[0].id });
await client.send({
  title: '服务告警',
  content: '订单服务响应超时',
  channel: Channel.QQ,
  option: 'ops-group', // 不传 option 则发给自己
  template: Template.TXT,
});

// 设置
await client.setting.changeIsSend(1); // 启用发送
await client.setting.changeOpenMessageType(0);

// 预处理（仅会员）
const out = await client.pre.test({ content: '...', message: 'hi' });

// 消息规则（仅会员）
await client.forwardRule.saveSetting(1); // 开启，未命中时仍按默认方式推送
await client.forwardRule.add({
  ruleName: '阿里云监控多渠道',
  tokenId: -1,
  sourceType: 1,
  condition: { logic: 'and', items: [{ varName: 'alertState', operator: 'eq', value: 'ALERT' }] },
  titleTemplate: '{{alertName}}',
  variables: [{ varName: 'alertName', sourceType: 3, extractType: 1, extractKey: 'alertName' }],
  targets: [{ channel: 'wechat', messageType: 'one' }],
});
const rules = await client.forwardRule.list({ current: 1, pageSize: 20 });
const logs = await client.forwardLog.list({ current: 1, pageSize: 20, params: { matchResult: 1 } });

// 图片服务（一行上传到 PushPlus 图床，30 天有效）
import { readFile } from 'node:fs/promises';
const bytes = await readFile('/tmp/logo.png');
const uploaded = await client.image.uploadBytes(bytes, { fileName: 'logo.png' });
console.log(uploaded.url);                       // 直接拿到可访问的图片 URL
const imgs = await client.image.list({ current: 1, pageSize: 10 });
await client.image.delete(imgs.list[0].id);

// push 表单
const form = await client.form.create('用户满意度调查');
await client.form.save({
  id: form.id!,
  title: '用户满意度调查',
  items: [{ id: 'q_name', type: 'input', label: '您的姓名', required: true }],
});
const published = await client.form.publish(form.id!);
console.log(published.fillUrl);
await client.send({
  title: published.title,
  content: '请花1分钟完成填写',
  template: Template.FORM,
  pushId: published.formCode,
});

// push 文档
import { readFile } from 'node:fs/promises';
const doc = await client.doc.importWord(await readFile('本周工作同步.docx'), '本周工作同步.docx');
await client.doc.updateShare(doc.docCode!, 1, 0);
await client.doc.publish(doc.docCode!);
await client.send({
  title: doc.title,
  content: '请查收',
  template: Template.DOC,
  pushId: doc.docCode,
});

// push 表格
const sheet = await client.excel.importExcel(await readFile('销售日报.xlsx'), '销售日报.xlsx');
await client.excel.writeCells(sheet.docCode!, 'A1', [
  ['日期', '销售额'],
  ['2026-08-13', 12800],
], 'Sheet1');
await client.excel.publish(sheet.docCode!);
await client.send({
  title: sheet.title,
  content: '请查收',
  template: Template.EXCEL,
  pushId: sheet.docCode,
});
```

### 图片服务

PushPlus 基于七牛云提供图片图床（30 天有效，可主动删除）。SDK 把「获取上传凭证 → multipart 表单上传 → 解析 URL」封装成一步：

```ts
// Node.js：从文件读取
import { readFile } from 'node:fs/promises';
const bytes = await readFile('/tmp/a.png');
const r = await client.image.uploadBytes(bytes, { fileName: 'a.png' });
console.log(r.url);

// 浏览器：input[type=file]
const file = (document.querySelector('input[type=file]') as HTMLInputElement).files![0];
await client.image.uploadBytes(file, { fileName: file.name, contentType: file.type });

// 已上传图片列表
const page = await client.image.list({ current: 1, pageSize: 10 });

// 主动删除（未删除的图片默认 30 天后由系统自动清理）
await client.image.delete(page.list![0].id!);
```

需要自己控制凭证的获取与上传过程时（如缓存 token、分布式上传），可拆开调用：

```ts
const token = await client.image.getUploadToken();
const r = await client.image.upload(token, bytes, { fileName: 'a.png', contentType: 'image/png' });
```

> 上传图片的真正请求会按七牛云规范以 `multipart/form-data` 提交到 `uploadUrl`，**不会**携带 PushPlus 的 `access-key`；其余三个接口（获取凭证 / 列表 / 删除）走 PushPlus 开放接口，自动带上 `access-key`。
>
> 接受的二进制形态：`Uint8Array`（Node 中 `Buffer` 是其子类，可直接传）、`ArrayBuffer`、`Blob`/`File`（浏览器 + Node 18+）。

### 5. 回调解析

PushPlus 在消息发送完成、群组新增用户、新增好友时会回调你预置的 URL。SDK 提供类型安全的解析：

```ts
import { CallbackEvent, parseCallback } from '@perk-net/perk-pushplus-sdk';

// Express
app.post('/pushplus/callback', express.json(), (req, res) => {
  const payload = parseCallback(req.body);
  switch (payload.event) {
    case CallbackEvent.MESSAGE_COMPLETE:
      console.log('发送结果', payload.messageInfo?.shortCode, payload.messageInfo?.sendStatus);
      break;
    case CallbackEvent.ADD_TOPIC_USER:
      console.log('新订阅', payload.topicUserInfo?.openId);
      break;
    case CallbackEvent.ADD_FRIEND:
      console.log('新好友', payload.friendInfo?.token, payload.qrCode);
      break;
  }
  res.send('ok');
});
```

`parseCallback` 接受字符串或已经解析过的对象，返回带类型的 `CallbackPayload`。

## 配置

```ts
new PushPlusClient({
  token: 'xxx',
  secretKey: 'xxx',
  baseUrl: 'https://www.pushplus.plus',
  connectTimeoutMs: 10_000,
  readTimeoutMs: 30_000,
  accessKeyRefreshAheadSeconds: 300,
  logRequest: false,
  rateLimitGuardEnabled: true,
  rateLimitCooldownMs: 0,             // 0 表示「次日 0 点」自动解禁
  userAgent: 'my-app/1.0',
  httpRequester: undefined,           // 自定义 HTTP 客户端（可选）
});
```

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `token` | – | 用户 token / 消息 token，发送消息使用 |
| `secretKey` | – | 用户 secretKey，调用开放接口使用 |
| `baseUrl` | `https://www.pushplus.plus` | 服务地址 |
| `connectTimeoutMs` | `10000` | 连接超时（毫秒） |
| `readTimeoutMs` | `30000` | 请求/读超时（毫秒） |
| `accessKeyRefreshAheadSeconds` | `300` | AccessKey 提前刷新秒数 |
| `logRequest` | `false` | 开启 DEBUG 级请求/响应日志（写到 `console.debug`） |
| `rateLimitGuardEnabled` | `true` | 是否启用本地限流守卫 |
| `rateLimitCooldownMs` | `0` | 命中 `code=900` 后的本地禁推时长（毫秒）；`0` 表示到「次日 0 点」 |
| `userAgent` | `@perk-net/perk-pushplus-sdk/<v>` | UA 头（仅 Node.js 生效，浏览器禁止设置） |
| `httpRequester` | 内置 fetch 实现 | 自定义 HTTP 客户端 |

## 错误处理

所有错误都会包装成 `PushPlusError`：

```ts
import { ErrorCode, PushPlusError } from '@perk-net/perk-pushplus-sdk';

try {
  await client.sendSimple('t', 'c');
} catch (e) {
  if (e instanceof PushPlusError) {
    if (e.isRateLimited()) {
      console.warn('PushPlus 限流，今天暂停推送：', e.message);
      return;
    }
    switch (e.errorCode) {
      case ErrorCode.INVALID_TOKEN:
        console.error('token 错误，立即排查配置'); break;
      case ErrorCode.NOT_VERIFIED:
        console.error('账号未实名认证'); break;
      case ErrorCode.INSUFFICIENT_POINTS:
        console.warn('积分不足'); break;
      default:
        console.warn(`PushPlus 失败: code=${e.code}, msg=${e.message}`);
    }
  }
}
```

`ErrorCode` 已经把官方文档的全部业务码语义化（`OK / NOT_LOGIN / UNAUTHORIZED / IP_FORBIDDEN / SERVER_ERROR / DATA_ERROR / FORBIDDEN_VIEW / INSUFFICIENT_POINTS / RATE_LIMITED / INVALID_TOKEN / NOT_VERIFIED / VALIDATION_ERROR`）。

参考：[PushPlus 接口返回码说明](https://www.pushplus.plus/doc/guide/code.html)。

## 限流守卫（code=900 自动短路）

PushPlus 在请求次数过多时会返回 `code=900`，官方文档明确建议「根据返回值判断当天是否让程序继续调用发送消息接口，否则会让账号进一步受限」。SDK 默认替你做这件事：

- 任意一次 `client.send(...)` / `client.batchSend(...)` 命中 `code=900` 后，SDK 会按 token 维度记下「禁推至 X 时刻」。
- 同 token 后续发送调用不再发起 HTTP，直接抛 `PushPlusError(code=900)`。
- 默认禁推到**系统时区的次日 0 点**；通过 `rateLimitCooldownMs` 可改为固定时长（例如文档示例的 2 天）。
- 仅作用于发送接口，开放接口不受影响。
- 进程内单例，**不跨进程共享**——多实例部署时每个进程最多被命中一次。

可观察 / 可干预：

```ts
const guard = client.rateLimitGuard;

const until = guard.blockedUntilAt('user_token');  // null 表示未被限流；否则为本地解禁时间戳（毫秒）
guard.clear('user_token');                         // 例如：人工确认服务端已解禁后立即放行
```

完全关闭这个行为（不推荐）：

```ts
new PushPlusClient({ token: 'xxx', rateLimitGuardEnabled: false });
```

## 自定义 HTTP 客户端

`fetch` 不满足需求（如想用 axios / undici / got / 浏览器代理）时，实现 `HttpRequester` 接口即可：

```ts
import { HttpRequester, HttpResponse, PushPlusClient } from '@perk-net/perk-pushplus-sdk';
import axios from 'axios';

class AxiosHttpRequester implements HttpRequester {
  async execute({ method, url, headers, body }): Promise<HttpResponse> {
    const resp = await axios.request({
      method,
      url,
      headers,
      data: body,
      validateStatus: () => true,        // 自行处理状态码
      transformResponse: r => r,         // 直接拿到字符串
    });
    return { statusCode: resp.status, body: resp.data };
  }
}

const client = PushPlusClient.builder()
  .token('xxx')
  .httpRequester(new AxiosHttpRequester())
  .build();
```

## 兼容性

| 环境 | 要求 | 备注 |
| --- | --- | --- |
| Node.js | `>=18`（推荐） | 18+ 内置全局 `fetch` |
| Node.js | `>=14` | 需自行注入 `HttpRequester` 或 `fetch` polyfill（如 `undici`） |
| 浏览器 | 现代浏览器 | 使用原生 `fetch` + `AbortController`，注意 PushPlus 服务端 CORS 策略 |
| TypeScript | `>=4.5` | 完整类型 |

> ⚠️ **浏览器使用注意**：PushPlus 接口是否允许跨域取决于服务端响应头。如果生产环境无法直接从浏览器调用，请通过你自己的后端代理后再使用本 SDK。

## 示例

更多示例见 [`examples/`](./examples) 目录：

- [`examples/send.mjs`](./examples/send.mjs) — Node.js 发送消息
- [`examples/express-callback.mjs`](./examples/express-callback.mjs) — Express 接收回调
- [`examples/browser.html`](./examples/browser.html) — 浏览器中通过 `<script>` 直接使用

## License

Apache License 2.0
