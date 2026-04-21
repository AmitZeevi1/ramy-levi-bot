const { searchProducts, createCart, setSession, hasSession } = require('./ramiLevyClient');
const { parseShoppingList, formatReplyMessage } = require('./listParser');

async function handleShoppingList(messageBody) {
  if (!hasSession()) {
    return 'לא מחובר לרמי לוי. שלח /settoken כדי להגדיר את הטוקנים.';
  }

  const items = parseShoppingList(messageBody);

  if (items.length === 0) {
    return [
      'שלום! 👋 אני *RamiBot*.',
      '',
      'שלח לי רשימת קניות ואני אבנה לך סל ברמי לוי.',
      '',
      'לדוגמה:',
      '• חלב 3%',
      '• לחם אחיד',
      '• ביצים גדולות x2',
      '• עגבניות',
    ].join('\n');
  }

  console.log(`[bot] Parsed ${items.length} items:`, items.map((i) => i.name));

  const queries = items.map((i) => i.name);
  const searchResults = await searchProducts(queries);

  const foundItems = searchResults
    .filter((r) => r.result !== null)
    .map(({ query, result }) => {
      const originalItem = items.find((i) => i.name === query);
      return { id: result.id, quantity: originalItem?.quantity ?? 1 };
    });

  let cart = null;
  if (foundItems.length > 0) {
    cart = await createCart(foundItems);
  }

  return formatReplyMessage(searchResults, cart);
}

// Returns true on success, false on bad format
function handleSetToken(text) {
  // Expected: /settoken <apiKey> <ecomToken> <cookie>
  const parts = text.trim().split(/\s+/);
  if (parts.length < 4) return false;

  const [, apiKey, ecomToken, ...cookieParts] = parts;
  const cookie = cookieParts.join(' ');

  setSession(apiKey, ecomToken, cookie);
  return true;
}

module.exports = { handleShoppingList, handleSetToken };
