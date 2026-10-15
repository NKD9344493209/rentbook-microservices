const axios = require('axios');

/* ---------------------------------------------------------------
   Thin wrapper over the Telegram Bot API.
   Console mode: when TELEGRAM_BOT_TOKEN is empty, nothing is sent;
   messages are printed to the terminal so the whole flow can be
   developed and demoed without a bot. Everything still lands in the
   in-app feed.
   --------------------------------------------------------------- */
const token = () => process.env.TELEGRAM_BOT_TOKEN;
const enabled = () => Boolean(token());
let consoleCounter = 0; // fake message ids in console mode
const api = () => axios.create({ baseURL: `https://api.telegram.org/bot${token()}`, timeout: 15000 });

async function sendMessage(chatId, text, extra = {}) {
  if (!enabled()) {
    console.log(`  [telegram:console] -> ${chatId}: ${text.replace(/\n/g, ' | ')}`);
    consoleCounter += 1;
    return { ok: true, console: true, message_id: consoleCounter };
  }
  const res = await api().post('/sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
  return res.data.result;
}

async function getUpdates(offset) {
  const res = await api().get('/getUpdates', { params: { offset, timeout: 25, allowed_updates: ['message'] }, timeout: 35000 });
  return res.data.result;
}

async function setWebhook(url) {
  const res = await api().post('/setWebhook', { url, allowed_updates: ['message'], drop_pending_updates: true });
  return res.data;
}

async function deleteWebhook() {
  if (!enabled()) return;
  await api().post('/deleteWebhook', { drop_pending_updates: false }).catch(() => {});
}

async function getMe() {
  if (!enabled()) return null;
  const res = await api().get('/getMe');
  return res.data.result;
}

module.exports = { enabled, sendMessage, getUpdates, setWebhook, deleteWebhook, getMe };
