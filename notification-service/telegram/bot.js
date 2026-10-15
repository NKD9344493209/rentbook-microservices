const telegram = require('./telegram');
const TelegramLink = require('../models/TelegramLink');
const LinkCode = require('../models/LinkCode');
const Relay = require('../models/Relay');
const Notification = require('../models/Notification');
const { escape } = require('../utils/notify');

/* ---------------------------------------------------------------
   Handles messages people send TO the bot.
     /start, /help        -> instructions
     /link ABC123         -> connect this chat to a RentBook account
     /unlink              -> disconnect
     /status              -> who am I linked as
     any other text from a tenant  -> forwarded to their owner
     owner "replies" to a forwarded message -> sent back to the tenant
   Works the same whether updates arrive by polling or by webhook.
   --------------------------------------------------------------- */

const HELP = [
  '<b>RentBook alerts</b>',
  'Link this chat to your RentBook account:',
  '1. In the RentBook app open <b>Notifications</b> and press <b>Connect Telegram</b>.',
  '2. Send the code shown there as:  <code>/link ABC123</code>',
  '',
  'Tenants: any message you type here is forwarded to your owner.',
  'Owners: use Telegram’s <i>Reply</i> on a forwarded message to answer the tenant.',
  '',
  '/status to see your link, /unlink to disconnect.',
].join('\n');

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const from = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || msg.from?.username || 'Telegram user';

  if (/^\/(start|help)\b/.test(text)) return telegram.sendMessage(chatId, HELP);

  if (/^\/link\b/.test(text)) {
    const code = text.split(/\s+/)[1]?.toUpperCase();
    if (!code) return telegram.sendMessage(chatId, 'Send the code like this:  <code>/link ABC123</code>');
    const pending = await LinkCode.findOne({ code, expiresAt: { $gt: new Date() } });
    if (!pending) return telegram.sendMessage(chatId, 'That code is invalid or has expired. Generate a new one in the RentBook app.');

    await TelegramLink.findOneAndUpdate(
      { user: pending.user },
      { user: pending.user, role: pending.role, name: pending.name, chatId, telegramName: from },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    // One chat can only belong to one account: drop any other account that used this chat.
    await TelegramLink.deleteMany({ chatId, user: { $ne: pending.user } });
    await LinkCode.deleteOne({ _id: pending._id });
    return telegram.sendMessage(chatId, `Linked as <b>${escape(pending.name)}</b> (${pending.role}). You will now receive RentBook alerts here.`);
  }

  if (/^\/unlink\b/.test(text)) {
    const r = await TelegramLink.deleteOne({ chatId });
    return telegram.sendMessage(chatId, r.deletedCount ? 'Disconnected. You will no longer receive alerts here.' : 'This chat is not linked to any account.');
  }

  const link = await TelegramLink.findOne({ chatId });

  if (/^\/status\b/.test(text)) {
    return telegram.sendMessage(chatId, link ? `Linked as <b>${escape(link.name)}</b> (${link.role}).` : 'Not linked. Send /help for instructions.');
  }

  if (!link) return telegram.sendMessage(chatId, 'This chat is not linked yet.\n\n' + HELP);

  // Owner replying to a forwarded tenant message -> route back to the tenant.
  if (link.role === 'owner' && msg.reply_to_message) {
    const relay = await Relay.findOne({ ownerMessageId: msg.reply_to_message.message_id, ownerChatId: chatId });
    if (!relay) return telegram.sendMessage(chatId, 'I could not find which tenant that message came from. Reply directly to a forwarded tenant message.');
    relay.reply = text;
    await relay.save();
    await telegram.sendMessage(relay.tenantChatId, `<b>Reply from your owner</b>\n${escape(text)}`);
    await Notification.create({ user: relay.tenant, type: 'message.reply', title: 'Reply from your owner', message: text, link: '/complaints', channel: 'telegram', telegramStatus: 'sent' });
    return telegram.sendMessage(chatId, 'Sent to the tenant.');
  }

  // Tenant free-text -> forward to their owner.
  if (link.role === 'tenant') {
    const ownerId = await findOwnerForTenant(link.user);
    if (!ownerId) return telegram.sendMessage(chatId, 'You are not linked to an owner yet. Your owner connects you when they issue your first bill.');
    const ownerLink = await TelegramLink.findOne({ user: ownerId });

    await Notification.create({ user: ownerId, type: 'message.tenant', title: `Message from ${link.name}`, message: text, link: '/owner/complaints', channel: ownerLink ? 'telegram' : 'in-app', telegramStatus: ownerLink ? 'sent' : 'not-linked' });

    if (!ownerLink) return telegram.sendMessage(chatId, 'Your message is saved in the app for your owner (they have not connected Telegram yet).');

    const sent = await telegram.sendMessage(ownerLink.chatId, `<b>Message from ${escape(link.name)}</b>\n${escape(text)}\n\n<i>Reply to this message to answer.</i>`);
    await Relay.create({ tenant: link.user, owner: ownerId, tenantChatId: chatId, ownerChatId: ownerLink.chatId, ownerMessageId: sent.message_id, text });
    return telegram.sendMessage(chatId, 'Sent to your owner. Their reply will appear here.');
  }

  return telegram.sendMessage(chatId, 'Owners receive alerts here. To answer a tenant, use Reply on their forwarded message.');
}

// The tenant's owner is whoever issued their most recent bill (billing-service knows).
async function findOwnerForTenant(tenantId) {
  const { createServiceClient } = require('../utils/serviceClient');
  const billing = createServiceClient('billing-service', 'BILLING_SERVICE_URL');
  const res = await billing.request({ url: `/internal/tenants/${tenantId}/owner` }).catch(() => null);
  return res?.owner || null;
}

/* ---------- receiving updates ---------- */
let polling = false;

async function startPolling() {
  if (!telegram.enabled() || polling) return;
  polling = true;
  await telegram.deleteWebhook();
  let offset = 0;
  console.log('[telegram] polling for messages');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const updates = await telegram.getUpdates(offset);
      for (const u of updates) {
        offset = u.update_id + 1;
        handleUpdate(u).catch((e) => console.warn('[telegram] update failed:', e.message));
      }
    } catch (error) {
      console.warn('[telegram] polling error:', error.response?.data?.description || error.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function start() {
  if (!telegram.enabled()) {
    console.log('[telegram] TELEGRAM_BOT_TOKEN not set: console mode (messages are logged, not sent)');
    return;
  }
  const me = await telegram.getMe().catch((e) => {
    console.warn('[telegram] token rejected:', e.response?.data?.description || e.message);
    return null;
  });
  if (!me) return;
  if (!process.env.TELEGRAM_BOT_USERNAME) process.env.TELEGRAM_BOT_USERNAME = me.username;
  console.log(`[telegram] bot @${me.username} ready`);

  if (process.env.PUBLIC_URL) {
    const url = `${process.env.PUBLIC_URL.replace(/\/$/, '')}/telegram/webhook/${webhookSecret()}`;
    const r = await telegram.setWebhook(url).catch((e) => ({ ok: false, description: e.message }));
    console.log(`[telegram] webhook ${r.ok ? 'set' : 'FAILED: ' + r.description}`);
  } else {
    startPolling();
  }
}

// Only Telegram knows this path, so random posts to /telegram/webhook/* are ignored.
const webhookSecret = () => require('crypto').createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN + (process.env.SERVICE_KEY || '')).digest('hex').slice(0, 24);

module.exports = { handleUpdate, start, webhookSecret };
