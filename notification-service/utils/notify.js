const Notification = require('../models/Notification');
const TelegramLink = require('../models/TelegramLink');
const telegram = require('../telegram/telegram');

/* Deliver one notification to one user: always store it for the in-app
   feed, and push it to Telegram if the user has linked a chat. */
async function notifyUser({ user, type, title, message, link = '', meta = {} }) {
  const doc = await Notification.create({ user, type, title, message, link, meta });

  const tg = await TelegramLink.findOne({ user });
  if (!tg) return doc;

  try {
    const res = await telegram.sendMessage(tg.chatId, `<b>${escape(title)}</b>\n${escape(message)}`);
    doc.channel = 'telegram';
    doc.telegramStatus = res.console ? 'console' : 'sent';
  } catch (error) {
    doc.telegramStatus = 'failed';
    console.warn(`  telegram send failed for ${tg.chatId}: ${error.response?.data?.description || error.message}`);
  }
  await doc.save();
  return doc;
}

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

module.exports = { notifyUser, escape };
