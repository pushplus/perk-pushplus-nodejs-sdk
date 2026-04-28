/**
 * 基础单元测试，使用 Node.js 内置 node:test。
 * 运行：node --test ./test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PushPlusClient,
  PushPlusError,
  Channel,
  Template,
  ErrorCode,
  CallbackEvent,
  RateLimitGuard,
  resolveConfig,
  parseCallback,
  sendRequest,
  batchSendRequest,
} from '../dist/index.js';

test('resolveConfig 应用默认值', () => {
  const c = resolveConfig({});
  assert.equal(c.baseUrl, 'https://www.pushplus.plus');
  assert.equal(c.connectTimeoutMs, 10000);
  assert.equal(c.readTimeoutMs, 30000);
  assert.equal(c.rateLimitGuardEnabled, true);
});

test('resolveConfig 去除 baseUrl 末尾斜杠', () => {
  assert.equal(resolveConfig({ baseUrl: 'https://x.com/' }).baseUrl, 'https://x.com');
  assert.equal(resolveConfig({ baseUrl: 'https://x.com//' }).baseUrl, 'https://x.com');
});

test('PushPlusClient.builder 链式构建', () => {
  const c = PushPlusClient.builder()
    .token('t1').secretKey('s1').baseUrl('https://example.com').build();
  assert.equal(c.config.token, 't1');
  assert.equal(c.config.secretKey, 's1');
  assert.equal(c.config.baseUrl, 'https://example.com');
});

test('SendRequestBuilder 产出可选字段', () => {
  const req = sendRequest()
    .title('t').content('c').channel(Channel.WEBHOOK).option('bark')
    .template(Template.MARKDOWN).build();
  assert.deepEqual(req, {
    title: 't', content: 'c', channel: 'webhook', option: 'bark', template: 'markdown',
  });
});

test('BatchSendRequestBuilder 累积式 channel/option', () => {
  const req = batchSendRequest()
    .title('t').content('c')
    .channel(Channel.WECHAT).option('')
    .channel(Channel.WEBHOOK).option('bark')
    .channel(Channel.EXTENSION).option('')
    .build();
  assert.equal(req.channel, 'wechat,webhook,extension');
  assert.equal(req.option, ',bark,');
});

test('parseCallback 解析消息完成回调', () => {
  const body = JSON.stringify({
    event: 'message_complate',
    messageInfo: { shortCode: 'abc', sendStatus: 2 },
  });
  const p = parseCallback(body);
  assert.equal(p.event, CallbackEvent.MESSAGE_COMPLETE);
  assert.equal(p.messageInfo?.shortCode, 'abc');
  assert.equal(p.messageInfo?.sendStatus, 2);
});

test('parseCallback 解析新增好友回调', () => {
  const p = parseCallback({
    event: 'add_friend',
    qrCode: 'mycode',
    friendInfo: { token: 'ft', friendId: 1 },
  });
  assert.equal(p.event, CallbackEvent.ADD_FRIEND);
  assert.equal(p.qrCode, 'mycode');
  assert.equal(p.friendInfo?.token, 'ft');
});

test('PushPlusError 字段', () => {
  const e = new PushPlusError('rate', 900);
  assert.equal(e.code, 900);
  assert.equal(e.errorCode, ErrorCode.RATE_LIMITED);
  assert.equal(e.isRateLimited(), true);
  assert.ok(e instanceof Error);
  assert.ok(e instanceof PushPlusError);
});

test('RateLimitGuard 命中后短路', () => {
  const cfg = resolveConfig({ rateLimitGuardEnabled: true });
  const g = new RateLimitGuard(cfg);
  g.markBlocked('tk');
  assert.throws(() => g.check('tk'), (e) => e instanceof PushPlusError && e.isRateLimited());
  assert.equal(typeof g.blockedUntilAt('tk'), 'number');
  g.clear('tk');
  // 不应该抛
  g.check('tk');
});

test('RateLimitGuard 关闭时不短路', () => {
  const cfg = resolveConfig({ rateLimitGuardEnabled: false });
  const g = new RateLimitGuard(cfg);
  g.markBlocked('tk');
  g.check('tk');
  assert.equal(g.blockedUntilAt('tk'), null);
});

test('MessageApi.send 注入默认 token 并校验 content', async () => {
  // 自定义 HttpRequester 抓住请求，断言 token 已注入
  const calls = [];
  const fakeHttp = {
    async execute({ method, url, body }) {
      calls.push({ method, url, body });
      return { statusCode: 200, body: JSON.stringify({ code: 200, msg: 'ok', data: 'short-1' }) };
    },
  };
  const client = new PushPlusClient({ token: 'tk-default', httpRequester: fakeHttp });
  const code = await client.send({ title: 't', content: 'c' });
  assert.equal(code, 'short-1');
  assert.equal(calls.length, 1);
  const sent = JSON.parse(calls[0].body);
  assert.equal(sent.token, 'tk-default');
  assert.equal(sent.title, 't');

  // content 校验
  await assert.rejects(client.send({ title: 'x', content: '' }), PushPlusError);
});

test('MessageApi.send code=900 触发本地限流登记', async () => {
  let count = 0;
  const fakeHttp = {
    async execute() {
      count++;
      return {
        statusCode: 200,
        body: JSON.stringify({ code: 900, msg: '请求次数过多' }),
      };
    },
  };
  const client = new PushPlusClient({ token: 'tk-rl', httpRequester: fakeHttp });
  await assert.rejects(client.sendSimple('t', 'c'), (e) => e instanceof PushPlusError && e.isRateLimited());
  assert.equal(count, 1);
  // 第二次：应该被本地短路，不再发起 HTTP
  await assert.rejects(client.sendSimple('t', 'c'), (e) => e instanceof PushPlusError && e.isRateLimited());
  assert.equal(count, 1, '第二次应被本地守卫短路，不应再触达 HTTP');
});

test('OpenApi 自动注入 access-key 并在 401 后刷新重试', async () => {
  const calls = [];
  let accessIssued = 0;
  const fakeHttp = {
    async execute({ url, headers }) {
      calls.push({ url, headers: { ...headers } });
      if (url.endsWith('/api/common/openApi/getAccessKey')) {
        accessIssued++;
        return {
          statusCode: 200,
          body: JSON.stringify({ code: 200, msg: 'ok', data: { accessKey: 'AK-' + accessIssued, expiresIn: 7200 } }),
        };
      }
      // 第一次 myInfo 返回 401，第二次成功
      const myInfoCount = calls.filter(c => c.url.includes('/api/open/user/myInfo')).length;
      if (myInfoCount === 1) {
        return { statusCode: 200, body: JSON.stringify({ code: 401, msg: 'access-key invalid' }) };
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ code: 200, msg: 'ok', data: { openId: 'oid', nickName: 'me' } }),
      };
    },
  };
  const client = new PushPlusClient({
    token: 'tk-open', secretKey: 'sk', httpRequester: fakeHttp,
  });
  const me = await client.user.myInfo();
  assert.equal(me.openId, 'oid');
  assert.equal(accessIssued, 2, '401 后应刷新一次 AccessKey');
  // 第一次和第三次的 access-key 应不同
  const myInfoCalls = calls.filter(c => c.url.includes('/api/open/user/myInfo'));
  assert.equal(myInfoCalls.length, 2);
  assert.notEqual(myInfoCalls[0].headers['access-key'], myInfoCalls[1].headers['access-key']);
});

test('OpenMessageApi.detailUrl 拼接 base URL', () => {
  const client = new PushPlusClient({ token: 't', baseUrl: 'https://x.test' });
  assert.equal(client.openMessage.detailUrl('abc'), 'https://x.test/shortMessage/abc');
});

test('AbstractApi.appendQuery 正确拼接 query', async () => {
  // 通过 webhook detail 接口验证
  const calls = [];
  const fakeHttp = {
    async execute({ url }) {
      calls.push(url);
      if (url.endsWith('/api/common/openApi/getAccessKey')) {
        return { statusCode: 200, body: JSON.stringify({ code: 200, data: { accessKey: 'AK', expiresIn: 7200 } }) };
      }
      return { statusCode: 200, body: JSON.stringify({ code: 200, data: { id: 1 } }) };
    },
  };
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  await client.webhook.detail(123);
  const detailCall = calls.find((u) => u.includes('/api/open/webhook/detail'));
  assert.ok(detailCall);
  assert.ok(detailCall.includes('webhookId=123'));
});
