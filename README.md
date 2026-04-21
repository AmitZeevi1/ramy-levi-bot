# 🛒 RamiBot — Telegram Shopping Bot for Rami Levy

Send a shopping list on Telegram → get a built Rami Levy cart with a checkout link.
Items not found are highlighted so you know what to add manually.

---

## How it works

```
User sends list → Telegram Bot → This bot → Rami Levy API → Cart link sent back
```

1. User sends a free-form shopping list (Hebrew or English, any format)
2. Bot parses the list and searches each item in the Rami Levy catalog
3. Found items are added to a cart automatically
4. Bot replies with: ✅ found items with prices, ❌ missing items, 🔗 checkout link

---

## Quick start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Then fill in `.env`.

### 3. Create a Telegram bot
1. Open Telegram → search for **@BotFather**
2. Send `/newbot` and follow the prompts
3. Copy the **token** → set as `TELEGRAM_BOT_TOKEN`

### 4. Get your Telegram user ID
1. Message **@userinfobot** on Telegram
2. Copy your numeric ID → add to `ALLOWED_TELEGRAM_IDS`
3. Do the same for your wife's account (comma-separated)

### 5. Start the server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 6. Set Rami Levy tokens in the bot
Send `/settoken` in the Telegram chat (see the Rami Levy tokens section below).

---

## Getting Rami Levy tokens

> ⚠️ These expire every few days — refresh them with `/settoken` when the bot stops finding products.

1. Go to https://www.rami-levy.co.il and **log in**
2. Open DevTools (`F12`) → **Network** tab
3. Search for any product on the site
4. Click on the `/api/catalog` request → **Request Headers**
5. Copy:
   - `Authorization` header → everything after `Bearer ` → this is `<apiKey>`
   - `ecomtoken` header → full value → this is `<ecomToken>`
   - `cookie` header → full value → this is `<cookie>`
6. In the Telegram bot chat, send:
   ```
   /settoken <apiKey> <ecomToken> <cookie>
   ```

---

## Supported list formats

```
# Numbered
1. חלב 3%
2. לחם אחיד

# Bullets
- חלב 3%
• לחם אחיד

# Plain lines
חלב 3%
לחם אחיד

# Comma separated
חלב, לחם, ביצים, עגבניות

# With quantities
חלב x3
2 לחם אחיד
```

---

## Project structure

```
src/
  index.js          ← Telegraf bot setup + command handlers
  bot.js            ← Orchestrates search + cart creation
  ramiLevyClient.js ← Rami Levy API calls (search, cart, session)
  listParser.js     ← Parses messy shopping list text
.env.example        ← Environment variables template
render.yaml         ← Render.com deployment config
```

---

## Deploying to Render

1. Push to GitHub
2. In Render: New → **Background Worker** (not Web Service — no HTTP needed)
3. Set env vars: `TELEGRAM_BOT_TOKEN`, `ALLOWED_TELEGRAM_IDS`, `RAMI_LEVY_STORE_ID`
4. Deploy — the bot connects to Telegram via long polling automatically

---

## Token refresh

When the bot stops finding products, refresh tokens:
1. Re-extract from rami-levy.co.il DevTools
2. Send `/settoken <apiKey> <ecomToken> <cookie>` in the bot chat

No restart or Render dashboard required.

---

## License

MIT
