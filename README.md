# 🛒 RamiBot — WhatsApp Shopping Bot for Rami Levy

Send a shopping list on WhatsApp → get a built Rami Levy cart with a checkout link.
Items not found are highlighted so you know what to add manually.

---

## How it works

```
User pastes list → WhatsApp → Green API → This bot → Rami Levy API → Cart link sent back
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
Then fill in `.env` (see sections below).

### 3. Get Green API credentials

1. Sign up at https://green-api.com (free tier available)
2. Create a new instance and scan the QR code with your WhatsApp to connect
3. Copy your **Instance ID** and **API Token** from the instance dashboard
4. Set the webhook URL to `https://YOUR_DOMAIN/webhook` in the instance settings

### 4. Get Rami Levy session tokens

> ⚠️ These expire — you'll need to refresh them every few days.

1. Go to https://www.rami-levy.co.il and **log in** to your account
2. Open DevTools (`F12`) → **Network** tab
3. Search for any product on the site
4. Click on the `/api/catalog` request in the Network tab
5. Under **Request Headers**, copy:
   - `Authorization` header → paste everything after `Bearer ` into `RAMI_LEVY_API_KEY`
   - `ecomtoken` header → paste full value into `RAMI_LEVY_ECOM_TOKEN`
   - `cookie` header → paste full value into `RAMI_LEVY_COOKIE`

### 5. Find your store ID

1. On the Rami Levy site, add any item to your cart
2. In DevTools Network, find the `/api/v2/cart` request
3. In the request body, note the `store` field (e.g. `331`)
4. Set `RAMI_LEVY_STORE_ID` in your `.env`

**Common store IDs:**
| Store | ID |
|---|---|
| Jerusalem Talpiot | 331 |
| Tel Aviv Hamasger | 10 |
| Haifa Haneviim | 111 |

### 6. Start the server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 7. Expose to the internet (for Green API webhook)
```bash
# Using ngrok (easiest for local dev):
npx ngrok http 3000
# Copy the https URL and set it as webhook in your Green API instance settings
```

---

## Testing without WhatsApp

```bash
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"message": "חלב 3%\nלחם אחיד\nביצים גדולות x2\nעגבניות\nגבינה צהובה"}'
```

---

## Supported list formats

The bot handles all common formats:

```
# Numbered
1. חלב 3%
2. לחם אחיד
3. ביצים x2

# Bullets
- חלב 3%
• לחם אחיד
* ביצים x2

# Plain lines
חלב 3%
לחם אחיד
ביצים x2

# Comma separated
חלב, לחם, ביצים, עגבניות

# With quantities
חלב x3
2 לחם אחיד
ביצים 3 יח'
```

---

## Project structure

```
src/
  index.js          ← Express server + Green API webhook
  bot.js            ← Orchestrates search + cart creation
  ramiLevyClient.js ← Rami Levy API calls (search, cart)
  listParser.js     ← Parses messy shopping list text
.env.example        ← Environment variables template
```

---

## Deploying to production

Any Node.js host works. Recommended options:

| Platform | Free tier | Notes |
|---|---|---|
| **Railway** | Yes | Deploy from GitHub, auto HTTPS |
| **Render** | Yes | Free spins down after inactivity |
| **Fly.io** | Yes | Always-on, good for bots |
| **VPS** (DigitalOcean/Hetzner) | ~$5/mo | Full control |

---

## Token refresh (important!)

Rami Levy session tokens expire periodically. When the bot stops finding products:
1. Log in to rami-levy.co.il again
2. Re-extract the 3 tokens from DevTools
3. Update your `.env` and restart

For production, consider building a `/refresh-tokens` admin endpoint or a reminder to refresh weekly.

---

## License

MIT
