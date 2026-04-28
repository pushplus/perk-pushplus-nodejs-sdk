/**
 * Express 接收 PushPlus 回调示例。
 *
 *   npm i express
 *   node examples/express-callback.mjs
 *
 * 然后在 PushPlus 后台「功能设置 -> 回调地址」里填上 https://your.host/pushplus/callback
 */
import express from 'express';
import { CallbackEvent, parseCallback } from '../dist/index.js';

const app = express();
app.use(express.text({ type: '*/*' })); // 收到原始 JSON 字符串，更稳

app.post('/pushplus/callback', (req, res) => {
  try {
    const payload = parseCallback(req.body);
    switch (payload.event) {
      case CallbackEvent.MESSAGE_COMPLETE:
        console.log('消息发送完成', payload.messageInfo);
        break;
      case CallbackEvent.ADD_TOPIC_USER:
        console.log('群组新增用户', payload.topicUserInfo);
        break;
      case CallbackEvent.ADD_FRIEND:
        console.log('新增好友', payload.friendInfo, 'qrCode=', payload.qrCode);
        break;
      default:
        console.log('未知事件', payload);
    }
    res.send('ok');
  } catch (e) {
    console.error('回调解析失败', e);
    res.status(400).send('bad request');
  }
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`PushPlus callback listening on http://localhost:${port}/pushplus/callback`);
});
