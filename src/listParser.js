function parseShoppingList(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  let text = rawText.trim();
  let lines = text
    .split(/[\n,]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const items = [];

  for (const line of lines) {
    if (/^(רשימת קניות|קניות|shopping list|list)/i.test(line)) continue;

    let name = line;
    let quantity = 1;

    name = name.replace(/^[\d]+[.)]\s*/, '');
    name = name.replace(/^[-•*]\s*/, '');

    const trailingQty = name.match(/[×x]\s*(\d+)\s*$/i);
    if (trailingQty) {
      quantity = parseInt(trailingQty[1], 10);
      name = name.replace(trailingQty[0], '').trim();
    }

    const leadingQty = name.match(/^(\d+)\s*[x×]?\s+/i);
    if (leadingQty && !trailingQty) {
      quantity = parseInt(leadingQty[1], 10);
      name = name.replace(leadingQty[0], '').trim();
    }

    name = name.replace(/\s+(\d+\s*)?(יח'?|ק"?ג|גרם|מ"?ל|ליטר|kg|gr|ml|l)$/i, '').trim();

    if (name.length > 1) {
      items.push({ name, quantity: Math.max(1, quantity) });
    }
  }

  return items;
}

function formatReplyMessage(searchResults, cart) {
  const found = searchResults.filter((r) => r.result !== null && !r.result.outOfStock);
  const outOfStock = searchResults.filter((r) => r.result !== null && r.result.outOfStock);
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

  if (outOfStock.length > 0) {
    lines.push('');
    lines.push(`⚠️ *אזל מהמלאי (${outOfStock.length}):*`);
    outOfStock.forEach(({ query }) => {
      lines.push(`  • ${query}`);
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
  } else if (found.length === 0 && outOfStock.length === 0) {
    lines.push('\nלא נמצאו פריטים. נסה לנסח את השמות בצורה אחרת.');
  }

  lines.push('\n_Bot by RamiBot 🤖_');
  return lines.join('\n');
}

module.exports = { parseShoppingList, formatReplyMessage };
