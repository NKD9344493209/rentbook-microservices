const crypto = require('crypto');
const TelegramLink = require('../models/TelegramLink');
const LinkCode = require('../models/LinkCode');
const telegram = require('../telegram/telegram');
const { handleUpdate, webhookSecret } = require('../telegram/bot');
const clients = require('../utils/clients');
const { notifyUser } = require('../utils/notify');

const botUsername = () => process.env.TELEGRAM_BOT_USERNAME || '';

// GET /api/telegram/status
const status = async (req, res) => {
  const link = await TelegramLink.findOne({ user: req.user._id });
  res.json({
    enabled: telegram.enabled(),
    botUsername: botUsername(),
    botLink: botUsername() ? `https://t.me/${botUsername()}` : '',
    linked: Boolean(link),
    telegramName: link?.telegramName || '',
    linkedAt: link?.createdAt || null,
  });
};

// POST /api/telegram/link-code  -> { code, expiresAt, botLink }
const linkCode = async (req, res) => {
  const me = await clients.getUser(req.user._id, req.id); // INTER-SERVICE: name for the greeting
  const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. 9F3A1C
  await LinkCode.deleteMany({ user: req.user._id });
  const doc = await LinkCode.create({
    code,
    user: req.user._id,
    role: req.user.role,
    name: me?.name || 'RentBook user',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  res.status(201).json({ code: doc.code, expiresAt: doc.expiresAt, botUsername: botUsername(), botLink: botUsername() ? `https://t.me/${botUsername()}` : '', command: `/link ${doc.code}` });
};

// DELETE /api/telegram/link
const unlink = async (req, res) => {
  const r = await TelegramLink.deleteOne({ user: req.user._id });
  res.json({ unlinked: r.deletedCount > 0 });
};

// POST /api/telegram/test  -> sends a test alert to the caller
const test = async (req, res) => {
  const n = await notifyUser({ user: req.user._id, type: 'test', title: 'RentBook test alert', message: 'Notifications are working. You will receive bills, reminders and repair updates here.', link: '/' });
  res.json({ delivered: n.channel === 'telegram', telegramStatus: n.telegramStatus });
};

// POST /telegram/webhook/:secret  (called by Telegram's servers)
const webhook = async (req, res) => {
  if (req.params.secret !== webhookSecret()) return res.status(403).json({ message: 'Forbidden' });
  res.json({ ok: true }); // answer Telegram immediately, then process
  handleUpdate(req.body).catch((e) => console.warn('[telegram] webhook update failed:', e.message));
};

// POST /internal/telegram/simulate  { chatId, text, replyToMessageId? }  (console-mode testing)
const simulate = async (req, res) => {
  const { chatId, text, replyToMessageId, from } = req.body || {};
  await handleUpdate({ message: { chat: { id: chatId }, text, from: { first_name: from || 'Demo' }, ...(replyToMessageId ? { reply_to_message: { message_id: replyToMessageId } } : {}) } });
  res.json({ ok: true });
};

module.exports = { status, linkCode, unlink, test, webhook, simulate };
