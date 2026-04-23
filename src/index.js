require('dotenv').config();

const express = require('express');
const { Telegraf } = require('telegraf');
const {
  handleShoppingList,
  handleClarification,
  hasPendingClarification,
  handleSetToken,
  handleSetPref,
  handleDeletePref,
  handleListPrefs,
} = require('./bot');

const ALLOWED_IDS = (process.env.ALLOWED_TELEGRAM_IDS || '')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter(Boolean);

// Keep-alive HTTP server for Render free Web Service
const app = express();
app.get('/health', (_, res) => res.json({ status: 'ok' }));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Health check on port ${PORT}`));

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Auth middleware
bot.use((ctx, next) => {
  if (ALLOWED_IDS.length > 0 && !ALLOWED_IDS.includes(ctx.from?.id)) {
    return ctx.reply('אין לך הרשאה להשתמש בבוט זה.');
  }
  return next();
});

bot.start((ctx) =>
  ctx.reply(
    'שלום! 👋 אני *RamiBot*.\n\nשלח לי רשימת קניות ואני אבנה לך סל ברמי לוי.\n\nפקודות:\n/settoken — הגדרת טוקנים לרמי לוי\n/setpref — הגדרת העדפה (למשל: /setpref חלב = חלב ללא לקטוז)\n/listprefs — הצגת ההעדפות שלך\n/deletepref — מחיקת העדפה\n/help — עזרה',
    { parse_mode: 'Markdown' }
  )
);

bot.help((ctx) =>
  ctx.reply(
    '*RamiBot — עזרה*\n\n' +
    'שלח רשימת קניות בכל פורמט:\n' +
    '• חלב 3%\n• לחם אחיד\n• ביצים x2\n\n' +
    '*פקודות:*\n' +
    '/settoken <token> <ecomtoken> <cookie> — הגדרת טוקנים\n' +
    '/setpref חלב = חלב ללא לקטוז — שמירת העדפה\n' +
    '/listprefs — הצגת כל ההעדפות\n' +
    '/deletepref חלב — מחיקת העדפה',
    { parse_mode: 'Markdown' }
  )
);

bot.command('settoken', (ctx) => {
  const ok = handleSetToken(ctx.message.text);
  if (ok) {
    ctx.reply('✅ טוקנים הוגדרו בהצלחה! שלח רשימת קניות כדי לבדוק.');
  } else {
    ctx.reply('פורמט שגוי. השתמש ב:\n`/settoken <apiKey> <ecomToken> <cookie>`', { parse_mode: 'Markdown' });
  }
});

bot.command('setpref', async (ctx) => {
  try {
    const ok = await handleSetPref(ctx.from.id, ctx.message.text);
    ctx.reply(ok ? '✅ העדפה נשמרה.' : 'פורמט שגוי. לדוגמה: `/setpref חלב = חלב ללא לקטוז`', { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[setpref]', err.message);
    ctx.reply('שגיאה בשמירת ההעדפה.');
  }
});

bot.command('listprefs', async (ctx) => {
  try {
    const reply = await handleListPrefs(ctx.from.id);
    ctx.reply(reply, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[listprefs]', err.message);
    ctx.reply('שגיאה בטעינת ההעדפות.');
  }
});

bot.command('deletepref', async (ctx) => {
  try {
    const ok = await handleDeletePref(ctx.from.id, ctx.message.text);
    ctx.reply(ok ? '✅ העדפה נמחקה.' : 'פורמט שגוי. לדוגמה: `/deletepref חלב`', { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[deletepref]', err.message);
    ctx.reply('שגיאה במחיקת ההעדפה.');
  }
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;

  const userId = ctx.from.id;

  try {
    await ctx.sendChatAction('typing');

    let reply;
    if (hasPendingClarification(userId)) {
      reply = await handleClarification(text, userId);
    } else {
      reply = await handleShoppingList(text, userId);
    }

    await ctx.reply(reply, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[bot] Error:', err.message);
    await ctx.reply(`😕 שגיאה: ${err.message}`);
  }
});

bot.launch();
console.log('🤖 RamiBot (Telegram) is running...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
