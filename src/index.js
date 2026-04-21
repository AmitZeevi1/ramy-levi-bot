require('dotenv').config();

const { Telegraf } = require('telegraf');
const { handleShoppingList, handleSetToken } = require('./bot');

const ALLOWED_IDS = (process.env.ALLOWED_TELEGRAM_IDS || '')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter(Boolean);

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
    'שלום! 👋 אני *RamiBot*.\n\nשלח לי רשימת קניות ואני אבנה לך סל ברמי לוי.\n\nפקודות:\n/settoken — הגדרת טוקנים לרמי לוי\n/help — עזרה',
    { parse_mode: 'Markdown' }
  )
);

bot.help((ctx) =>
  ctx.reply(
    '*RamiBot — עזרה*\n\n' +
    'שלח רשימת קניות בכל פורמט:\n' +
    '• חלב 3%\n• לחם אחיד\n• ביצים x2\n\n' +
    '*הגדרת טוקנים:*\n' +
    '1. היכנס לאתר רמי לוי ← F12 ← Network\n' +
    '2. חפש מוצר כלשהו\n' +
    '3. לחץ על בקשת /api/catalog\n' +
    '4. העתק את הערכים מ-Request Headers:\n' +
    '   - Authorization (ללא "Bearer ")\n' +
    '   - ecomtoken\n' +
    '   - cookie\n' +
    '5. שלח: /settoken <token> <ecomtoken> <cookie>',
    { parse_mode: 'Markdown' }
  )
);

bot.command('settoken', (ctx) => {
  const ok = handleSetToken(ctx.message.text);
  if (ok) {
    ctx.reply('✅ טוקנים הוגדרו בהצלחה! שלח רשימת קניות כדי לבדוק.');
  } else {
    ctx.reply(
      'פורמט שגוי. השתמש ב:\n`/settoken <apiKey> <ecomToken> <cookie>`',
      { parse_mode: 'Markdown' }
    );
  }
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;

  try {
    await ctx.sendChatAction('typing');
    const reply = await handleShoppingList(text);
    await ctx.reply(reply, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[bot] Error:', err.message);
    await ctx.reply('😕 משהו השתבש. נסה שוב בעוד כמה שניות.');
  }
});

bot.launch();
console.log('🤖 RamiBot (Telegram) is running...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
