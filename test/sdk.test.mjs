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
  assert.equal(Template.DOC, 'doc');
  assert.equal(Template.EXCEL, 'excel');
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

function openHttp(handlers) {
  const calls = [];
  const fakeHttp = {
    async execute({ method, url, headers, body }) {
      calls.push({ channel: 'execute', method, url, headers: { ...headers }, body });
      return respond(url);
    },
    async executeRaw({ method, url, headers, body }) {
      calls.push({ channel: 'raw', method, url, headers: { ...headers }, body });
      return respond(url);
    },
  };
  function respond(url) {
    if (url.endsWith('/api/common/openApi/getAccessKey')) {
      return { statusCode: 200, body: JSON.stringify({ code: 200, data: { accessKey: 'AK', expiresIn: 7200 } }) };
    }
    for (const h of handlers) {
      if (url.includes(h.match)) {
        return { statusCode: 200, body: JSON.stringify({ code: 200, msg: 'ok', data: h.data ?? {} }) };
      }
    }
    throw new Error('unexpected url: ' + url);
  }
  return { calls, fakeHttp };
}

test('FormApi 创建、保存、发布走 /push/api/open/form', async () => {
  const { calls, fakeHttp } = openHttp([
    { match: '/push/api/open/form/create', data: { id: 10001, title: '用户满意度调查', status: 0 } },
    { match: '/push/api/open/form/save', data: null },
    { match: '/push/api/open/form/publish', data: { id: 10001, formCode: 'a1b2c3d4', fillUrl: 'https://www.pushplus.plus/push/form/a1b2c3d4', status: 1 } },
  ]);
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  const created = await client.form.create('用户满意度调查');
  assert.equal(created.id, 10001);
  await client.form.save({ id: 10001, title: '用户满意度调查', items: [{ id: 'q1', type: 'input', label: '姓名' }] });
  const published = await client.form.publish(10001);
  assert.equal(published.formCode, 'a1b2c3d4');

  assert.ok(calls.some((c) => c.url.includes('/push/api/open/form/create')));
  const saveCall = calls.find((c) => c.url.includes('/push/api/open/form/save'));
  assert.equal(saveCall.headers['access-key'], 'AK');
  assert.ok(JSON.parse(saveCall.body).items[0].id === 'q1');
  const publishCall = calls.find((c) => c.url.includes('/push/api/open/form/publish'));
  assert.ok(publishCall.url.includes('id=10001'));
  assert.equal(publishCall.method, 'POST');
});

test('DocApi 保存内容并发布', async () => {
  const { calls, fakeHttp } = openHttp([
    { match: '/push/api/open/doc/create', data: { docCode: 'Ab3xY7kP', title: '本周工作同步', sharePerm: 0 } },
    { match: '/push/api/open/doc/saveContent', data: { docCode: 'Ab3xY7kP', publishDirty: true } },
    { match: '/push/api/open/doc/publish', data: { docCode: 'Ab3xY7kP', published: true, publishDirty: false } },
  ]);
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  const doc = await client.doc.create('本周工作同步');
  assert.equal(doc.docCode, 'Ab3xY7kP');
  await client.doc.saveContent(doc.docCode, '<p>hello</p>');
  const published = await client.doc.publish(doc.docCode);
  assert.equal(published.published, true);

  const saveCall = calls.find((c) => c.url.includes('/push/api/open/doc/saveContent'));
  assert.equal(JSON.parse(saveCall.body).content, '<p>hello</p>');
  const publishCall = calls.find((c) => c.url.includes('/push/api/open/doc/publish'));
  assert.ok(publishCall.url.includes('docCode=Ab3xY7kP'));
});

test('ExcelApi writeCells 与 saveContent 对象序列化', async () => {
  const { calls, fakeHttp } = openHttp([
    { match: '/push/api/open/excel/create', data: { docCode: 'Sh3xY7kP', title: '销售日报' } },
    { match: '/push/api/open/excel/writeCells', data: { docCode: 'Sh3xY7kP', publishDirty: true } },
    { match: '/push/api/open/excel/saveContent', data: { docCode: 'Sh3xY7kP', publishDirty: true } },
  ]);
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  const sheet = await client.excel.create('销售日报');
  await client.excel.writeCells(sheet.docCode, 'A2', [['2026-08-13', 12800]], 'Sheet1');
  await client.excel.saveContent(sheet.docCode, { sheetOrder: ['sheet-1'], sheets: {} });

  const writeCall = calls.find((c) => c.url.includes('/push/api/open/excel/writeCells'));
  const writeBody = JSON.parse(writeCall.body);
  assert.equal(writeBody.range, 'A2');
  assert.equal(writeBody.sheetName, 'Sheet1');
  assert.deepEqual(writeBody.values, [['2026-08-13', 12800]]);

  const saveCall = calls.find((c) => c.url.includes('/push/api/open/excel/saveContent'));
  const saved = JSON.parse(saveCall.body);
  assert.equal(typeof saved.content, 'string');
  assert.ok(saved.content.startsWith('{'));
  assert.ok(JSON.parse(saved.content).sheetOrder.includes('sheet-1'));
});

test('好友与群组订阅人黑名单接口', async () => {
  const { calls, fakeHttp } = openHttp([
    { match: '/api/open/friend/addBlacklist', data: null },
    { match: '/api/open/friend/blacklistList', data: { pageNum: 1, pageSize: 20, total: 1, pages: 1, list: [{ id: 4, friendId: 1322, nickName: '昵称' }] } },
    { match: '/api/open/friend/removeBlacklist', data: null },
    { match: '/api/open/topicUser/addBlacklist', data: null },
    { match: '/api/open/topicUser/blacklistList', data: { pageNum: 1, list: [{ id: 1, userId: 1322 }] } },
    { match: '/api/open/topicUser/removeBlacklist', data: null },
  ]);
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  await client.friend.addBlacklist(1322);
  const friends = await client.friend.blacklistList({ current: 1, pageSize: 20 });
  assert.equal(friends.list[0].friendId, 1322);
  await client.friend.removeBlacklist(4);
  await client.topicUser.addBlacklist(10);
  const users = await client.topicUser.blacklistList({ current: 1, pageSize: 20, params: { topicId: 100 } });
  assert.equal(users.list[0].id, 1);
  await client.topicUser.removeBlacklist(1);

  assert.ok(calls.some((c) => c.url.includes('/api/open/friend/addBlacklist') && c.url.includes('friendId=1322')));
  const topicList = calls.find((c) => c.url.includes('/api/open/topicUser/blacklistList'));
  assert.equal(JSON.parse(topicList.body).params.topicId, 100);
});

test('表单列表使用 current / params', async () => {
  const { calls, fakeHttp } = openHttp([
    { match: '/push/api/open/form/list', data: { pageNum: 1, pageSize: 20, total: 0, pages: 0, list: [] } },
  ]);
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  await client.form.list({ current: 1, pageSize: 20, params: { keyword: '满意度', status: 1 } });
  const listCall = calls.find((c) => c.url.includes('/push/api/open/form/list'));
  const body = JSON.parse(listCall.body);
  assert.equal(body.current, 1);
  assert.equal(body.params.keyword, '满意度');
  assert.equal(body.params.status, 1);
});

test('DocApi 导入 Word', async () => {
  const { calls, fakeHttp } = openHttp([
    { match: '/push/api/open/doc/import', data: { docCode: 'Ab3xY7kP', title: '本周工作同步' } },
  ]);
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  const imported = await client.doc.importWord(new Uint8Array([1, 2, 3]), '本周工作同步.docx');
  assert.equal(imported.docCode, 'Ab3xY7kP');

  const importCall = calls.find((c) => c.url.includes('/push/api/open/doc/import'));
  assert.equal(importCall.channel, 'raw');
  assert.ok(importCall.headers['Content-Type'].startsWith('multipart/form-data; boundary='));
});

test('ExcelApi 导入', async () => {
  const { calls, fakeHttp } = openHttp([
    { match: '/push/api/open/excel/import', data: { docCode: 'Sh3xY7kP', title: '销售日报' } },
  ]);
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });
  const imported = await client.excel.importExcel(new Uint8Array([9, 8, 7]), '销售日报.xlsx');
  assert.equal(imported.docCode, 'Sh3xY7kP');
  assert.ok(calls.some((c) => c.channel === 'raw' && c.url.includes('/push/api/open/excel/import')));
});

test('QqBotApi 绑定、查群与渠道配置', async () => {
  const { calls, fakeHttp } = openHttp([
    { match: '/api/open/qqBot/getBindLink', data: { url: 'https://qun.qq.com/qunpro/robot/share?robot_appid=1', bindCode: 'A1B2C3', expireSeconds: 300 } },
    { match: '/api/open/qqBot/botInfo', data: { isBind: 1, receiveStatus: 1, botInfo: { appId: '1', username: 'pushplus' } } },
    { match: '/api/open/qqBot/groupList', data: [{ id: 9, groupOpenId: 'OPEN-1', status: 1, groupName: '运维告警群' }] },
    { match: '/api/open/qqBot/add', data: null },
    { match: '/api/open/qqBot/list', data: { pageNum: 1, pageSize: 20, total: 1, pages: 1, list: [{ id: 3, qqName: '运维告警群', qqCode: 'ops-group', sendType: 2, qqGroupId: 9 }] } },
    { match: '/api/open/qqBot/delete', data: null },
  ]);
  const client = new PushPlusClient({ token: 't', secretKey: 's', httpRequester: fakeHttp });

  const link = await client.qqBot.getBindLink(true);
  assert.equal(link.bindCode, 'A1B2C3');
  assert.ok(calls.find((c) => c.url.includes('/api/open/qqBot/getBindLink')).url.includes('refresh=true'));

  const bind = await client.qqBot.botInfo();
  assert.equal(bind.isBind, 1);
  assert.equal(bind.botInfo.username, 'pushplus');

  const groups = await client.qqBot.groupList();
  assert.equal(groups[0].id, 9);

  await client.qqBot.add({ qqName: '运维告警群', qqCode: 'ops-group', qqGroupId: 9 });
  const addCall = calls.find((c) => c.url.includes('/api/open/qqBot/add'));
  assert.equal(addCall.headers['access-key'], 'AK');
  assert.equal(JSON.parse(addCall.body).sendType, 2);

  const page = await client.qqBot.list({ current: 1, pageSize: 20 });
  assert.equal(page.list[0].qqCode, 'ops-group');

  await client.qqBot.delete(3);
  const delCall = calls.find((c) => c.url.includes('/api/open/qqBot/delete'));
  assert.equal(delCall.method, 'DELETE');
  assert.ok(delCall.url.includes('id=3'));
});

