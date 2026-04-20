const { searchProducts, createCart } = require('./ramiLevyClient');
const { parseShoppingList, formatReplyMessage } = require('./listParser');

/**
 * Main bot handler. Called with the raw WhatsApp message text.
 * Returns a formatted reply string.
 *
 * @param {string} messageBody - Raw text from the user
 * @returns {Promise<string>} - Reply to send back
 */
async function handleShoppingList(messageBody) {
  // 1. Parse the shopping list
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

  // 2. Send a "working on it" indicator (returned before async work in webhook context)
  // The actual processing happens below

  // 3. Search for all products in parallel
  const queries = items.map((i) => i.name);
  const searchResults = await searchProducts(queries);

  // 4. Build cart from found items
  const foundItems = searchResults
    .filter((r) => r.result !== null)
    .map(({ query, result }) => {
      const originalItem = items.find((i) => i.name === query);
      return {
        id: result.id,
        quantity: originalItem?.quantity ?? 1,
      };
    });

  let cart = null;
  if (foundItems.length > 0) {
    cart = await createCart(foundItems);
  }

  // 5. Format and return the reply
  return formatReplyMessage(searchResults, cart);
}

module.exports = { handleShoppingList };
