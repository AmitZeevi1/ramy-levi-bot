require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { handleShoppingList } = require('./bot');

const app = express();
app.use(bodyParser.json());

const INSTANCE_ID    = process.env.GREEN_API_INSTANCE_ID;
const INSTANCE_TOKEN = process.env.GREEN_API_TOKEN;
const GREEN_BASE     = `https://api.green-api.com/waInstance${INSTANCE_ID}`;

// ─────────────────────────────────────────────
// Send a WhatsApp message via Green API
// chatId format: "972501234567@c.us"
// ─────────────────────────────────────────────
async function sendMessage(chatId, text) {
  await axios.post(
    `${GREEN_BASE}/sendMessage/${INSTANCE_TOKEN}`,
    { chatId, message: text },
    { timeout: 10000 }
  );
}

// ─────────────────────────────────────────────
// POST /webhook  — Green API calls this on every incoming message
// ─────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  // Always acknowledge immediately
  res.sendStatus(200);

  const body = req.body;

  // Green API sends several webhook types — we only care about incoming messages
  if (body?.typeWebhook !== 'incomingMessageReceived') return;

  const messageData = body?.messageData;
  if (messageData?.typeMessage !== 'textMessage') return;

  const chatId = body?.senderData?.chatId;
  const text   = messageData?.textMessageData?.textMessage || '';

  if (!chatId || !text) return;

  console.log(`[webhook] From ${chatId}: "${text.slice(0, 80)}"`);

  try {
    const reply = await handleShoppingList(text);
    await sendMessage(chatId, reply);
    console.log(`[webhook] Reply sent to ${chatId}`);
  } catch (err) {
    console.error('[webhook] Error:', err.message);
    try {
      await sendMessage(chatId, '😕 משהו השתבש. נסה שוב בעוד כמה שניות.');
    } catch (_) {}
  }
});

// ─────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────
// POST /test  — test without WhatsApp
// Body: { "message": "חלב, לחם, ביצים" }
// ─────────────────────────────────────────────
app.post('/test', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message field required' });
  try {
    const reply = await handleShoppingList(message);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🤖 RamiBot (Green API) running on port ${PORT}`);
  console.log(`   Webhook: POST http://localhost:${PORT}/webhook`);
  console.log(`   Test:    POST http://localhost:${PORT}/test`);
  console.log(`   Health:  GET  http://localhost:${PORT}/health\n`);
});
