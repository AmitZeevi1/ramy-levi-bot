/**
 * Parses a free-form shopping list pasted into WhatsApp.
 *
 * Handles common formats:
 *   - Numbered lists:   "1. חלב\n2. לחם"
 *   - Bullet lists:     "- חלב\n- לחם" or "• חלב"
 *   - Comma separated:  "חלב, לחם, ביצים"
 *   - Plain lines:      "חלב\nלחם\nביצים"
 *   - With quantities:  "חלב x2" or "2 חלב" or "חלב 2 יח'"
 *
 * @param {string} rawText - The raw WhatsApp message body
 * @returns {Array<{name: string, quantity: number}>}
 */
function parseShoppingList(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  let text = rawText.trim();

  // Split on newlines or commas
  let lines = text
    .split(/[\n,]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const items = [];

  for (const line of lines) {
    // Skip obvious non-items
    if (/^(רשימת קניות|קניות|shopping list|list)/i.test(line)) continue;

    let name = line;
    let quantity = 1;

    // Strip leading list markers: "1.", "1)", "-", "•", "*"
    name = name.replace(/^[\d]+[.)]\s*/, '');
    name = name.replace(/^[-•*]\s*/, '');

    // Extract trailing quantity: "x2", "×2", "* 2", "2 יח'", "2 ק"ג"
    const trailingQty = name.match(/[×x]\s*(\d+)\s*$/i);
    if (trailingQty) {
      quantity = parseInt(trailingQty[1], 10);
      name = name.replace(trailingQty[0], '').trim();
    }

    // Extract leading quantity: "2 חלב", "3x לחם"
    const leadingQty = name.match(/^(\d+)\s*[x×]?\s+/i);
    if (leadingQty && !trailingQty) {
      quantity = parseInt(leadingQty[1], 10);
      name = name.replace(leadingQty[0], '').trim();
    }

    // Strip trailing unit suffixes: "יח'", "ק"ג", "גרם", "ליטר"
    name = name.replace(/\s+(\d+\s*)?(יח'?|ק"?ג|גרם|מ"?ל|ליטר|kg|gr|ml|l)$/i, '').trim();

    if (name.length > 1) {
      items.push({ name, quantity: Math.max(1, quantity) });
    }
  }

  return items;
}

/**
 * Format the bot's reply message with found/not-found items.
 *
 * @param {Array<{query, result}>} searchResults
 * @param {{cartUrl: string, total: number} | null} cart
 * @returns {string}
 */
function formatReplyMessage(searchResults, cart) {
  const found = searchResults.filter((r) => r.result !== null);
  const notFound = searchResults.filter((r) => r.result === null);

  const lines = [];

  lines.push('🛒 *סל הקניות שלך ברמי לוי*\n');

  if (found.length > 0) {
    lines.push(`✅ *נמצאו ${found.length} פריטים:*`);
    found.forEach(({ query, result }) => {
      const price = result.price ? ` — ₪${result.price}` : '';
      lines.push(`  • ${result.name}${price}`);
    });
  }

  if (notFound.length > 0) {
    lines.push('');
    lines.push(`❌ *לא נמצאו ${notFound.length} פריטים:*`);
    notFound.forEach(({ query }) => {
      lines.push(`  • ${query}`);
    });
  }

  if (cart) {
    lines.push('');
    if (cart.total) {
      lines.push(`💰 *סה"כ משוער: ₪${cart.total.toFixed(2)}*`);
    }
    lines.push(`\n🔗 לסיום הזמנה:\n${cart.cartUrl}`);
  } else if (found.length === 0) {
    lines.push('\nלא נמצאו פריטים. נסה לנסח את השמות בצורה אחרת.');
  }

  lines.push('\n_Bot by RamiBot 🤖_');

  return lines.join('\n');
}

module.exports = { parseShoppingList, formatReplyMessage };
