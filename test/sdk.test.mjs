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

test('SendRequestBuilder 支持 form 模板与 pushId', () => {
  const req = sendRequest()
    .title('表单通知')
    .content('您有新的表单待填写')
    .template(Template.FORM)
    .pushId('ES6kgrgG')
    .build();
  assert.equal(Template.FORM, 'form');
  assert.deepEqual(req, {
    title: '表单通知',
    content: '您有新的表单待填写',
    template: 'form',
    pushId: 'ES6kgrgG',
  });
});

test('BatchSendRequestBuilder 支持 form 模板与 pushId', () => {
  const req = batchSendRequest()
    .title('t')
    .content('c')
    .template(Template.FORM)
    .pushId('ES6kgrgG')
    .channel(Channel.WECHAT).option('')
    .build();
  assert.equal(req.template, 'form');
  assert.equal(req.pushId, 'ES6kgrgG');
  assert.equal(req.channel, 'wechat');
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

test('ImageApi.getUploadToken 携带 access-key 并返回七牛云信息', async () => {
  const calls = [];
  const fakeHttp = {
    async execute({ method, url, headers, body }) {
      calls.push({ method, url, headers: { ...headers }, body });
      if (url.endsWith('/api/common/openApi/getAccessKey')) {
        return {
          statusCode: 200,
          body: JSON.stringify({ code: 200, data: { accessKey: 'AK-1', expiresIn: 7200 } }),
        };
      }
      if (url.endsWith('/api/open/userImage/uploadToken')) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            code: 200,
            msg: 'ok',
            data: {
              uploadToken: 'qiniu-token',
              uploadHost: 'https://upload.qiniup.com',
              uploadUrl: 'https://upload.qiniup.com/',
              bucket: 'pushplus-img',
              expiresIn: 600,
            },
          }),
        };
      }
      throw new Error('unexpected url: ' + url);
    },
  };
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  const token = await client.image.getUploadToken();
  assert.equal(token.uploadToken, 'qiniu-token');
  assert.equal(token.uploadUrl, 'https://upload.qiniup.com/');
  assert.equal(token.bucket, 'pushplus-img');
  assert.equal(token.expiresIn, 600);

  const tokenCall = calls.find((c) => c.url.includes('/userImage/uploadToken'));
  assert.equal(tokenCall.headers['access-key'], 'AK-1');
});

test('ImageApi.uploadBytes 走 multipart 上传到七牛云，不带 access-key', async () => {
  const calls = [];
  const fakeHttp = {
    async execute({ method, url, headers, body }) {
      calls.push({ channel: 'execute', method, url, headers: { ...headers }, body });
      if (url.endsWith('/api/common/openApi/getAccessKey')) {
        return {
          statusCode: 200,
          body: JSON.stringify({ code: 200, data: { accessKey: 'AK', expiresIn: 7200 } }),
        };
      }
      if (url.endsWith('/api/open/userImage/uploadToken')) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            code: 200,
            data: { uploadToken: 'qiniu-token', uploadUrl: 'https://upload.qiniup.com/' },
          }),
        };
      }
      throw new Error('unexpected url: ' + url);
    },
    async executeRaw({ method, url, headers, body }) {
      calls.push({ channel: 'raw', method, url, headers: { ...headers }, body });
      return {
        statusCode: 200,
        body: JSON.stringify({
          errno: 0,
          ext: '.png',
          fname: 'a.png',
          fsize: 3,
          hash: 'H',
          key: '1/H.png',
          mimeType: 'image/png',
          msg: 'ok',
          thumbnail: 'https://pic.pushplus.plus/1/H.png@s',
          url: 'https://pic.pushplus.plus/1/H.png@p',
        }),
      };
    },
  };

  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  const result = await client.image.uploadBytes(new Uint8Array([1, 2, 3]), { fileName: 'a.png' });

  assert.equal(result.errno, 0);
  assert.equal(result.url, 'https://pic.pushplus.plus/1/H.png@p');

  const uploadCall = calls.find((c) => c.channel === 'raw');
  assert.ok(uploadCall, '上传应走 executeRaw 通道');
  assert.equal(uploadCall.method, 'POST');
  assert.ok(uploadCall.url.includes('upload.qiniup.com'));
  assert.equal(uploadCall.headers['access-key'], undefined, '七牛云请求不应携带 access-key');
  assert.ok(
    uploadCall.headers['Content-Type'].startsWith('multipart/form-data; boundary='),
    'Content-Type 应是 multipart/form-data',
  );
  assert.ok(uploadCall.body instanceof Uint8Array, 'body 应是 Uint8Array');
  const decoded = new TextDecoder('utf-8').decode(uploadCall.body);
  assert.ok(decoded.includes('name="token"'));
  assert.ok(decoded.includes('qiniu-token'));
  assert.ok(decoded.includes('filename="a.png"'));
});

test('ImageApi.upload 在七牛云返回 errno!=0 时抛 PushPlusError', async () => {
  const fakeHttp = {
    async execute({ url }) {
      if (url.endsWith('/api/common/openApi/getAccessKey')) {
        return { statusCode: 200, body: JSON.stringify({ code: 200, data: { accessKey: 'AK', expiresIn: 7200 } }) };
      }
      if (url.endsWith('/api/open/userImage/uploadToken')) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            code: 200,
            data: { uploadToken: 'qiniu-token', uploadUrl: 'https://upload.qiniup.com/' },
          }),
        };
      }
      throw new Error('unexpected ' + url);
    },
    async executeRaw() {
      return { statusCode: 200, body: JSON.stringify({ errno: 401, msg: 'bad token' }) };
    },
  };
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  await assert.rejects(
    client.image.uploadBytes(new Uint8Array([1]), { fileName: 'a.png' }),
    (e) => e instanceof PushPlusError && e.code === 401 && /bad token/.test(e.message),
  );
});

test('ImageApi.list / delete 走开放接口并携带 access-key', async () => {
  const calls = [];
  const fakeHttp = {
    async execute({ method, url, headers }) {
      calls.push({ method, url, headers: { ...headers } });
      if (url.endsWith('/api/common/openApi/getAccessKey')) {
        return { statusCode: 200, body: JSON.stringify({ code: 200, data: { accessKey: 'AK', expiresIn: 7200 } }) };
      }
      if (url.includes('/api/open/userImage/list')) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            code: 200,
            data: {
              pageNum: 1, pageSize: 10, total: 1, pages: 1,
              list: [{ id: 1, imgUrl: 'u', thumbnail: 't', createTime: '2026-05-09' }],
            },
          }),
        };
      }
      if (url.includes('/api/open/userImage/delete')) {
        return { statusCode: 200, body: JSON.stringify({ code: 200, msg: 'ok' }) };
      }
      throw new Error('unexpected: ' + url);
    },
  };
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  const page = await client.image.list({ current: 1, pageSize: 10 });
  assert.equal(page.total, 1);
  assert.equal(page.list[0].id, 1);

  await client.image.delete(1);
  const deleteCall = calls.find((c) => c.url.includes('/userImage/delete'));
  assert.equal(deleteCall.method, 'DELETE');
  assert.ok(deleteCall.url.includes('id=1'), 'delete 应通过 url 传 id');
  assert.equal(deleteCall.headers['access-key'], 'AK');
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
