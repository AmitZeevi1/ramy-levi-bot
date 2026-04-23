const { searchProducts, createCart, setSession, hasSession } = require('./ramiLevyClient');
const { parseShoppingList, formatReplyMessage } = require('./listParser');
const { analyzeShoppingList, mergeClarifications } = require('./ai');
const { getPreferences, setPreference, deletePreference, listPreferences } = require('./storage');

// In-memory conversation state for clarification flow
// userId → { items: [...], clarified: [...], pending: [...] }
const conversationState = new Map();

function applyPreferences(items, prefs) {
  return items.map((item) => {
    const key = item.name.trim();
    const mapped = prefs[key] || prefs[key.toLowerCase()];
    return mapped ? { ...item, name: mapped } : item;
  });
}

async function handleShoppingList(messageBody, userId) {
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

  // Apply user preferences
  const prefs = await getPreferences(userId);
  const itemsWithPrefs = applyPreferences(items, prefs);

  console.log(`[bot] Parsed ${itemsWithPrefs.length} items:`, itemsWithPrefs.map((i) => i.name));

  // Claude analysis for ambiguity
  let analyzed;
  try {
    analyzed = await analyzeShoppingList(itemsWithPrefs);
  } catch (err) {
    console.error('[bot] Claude analysis failed, falling back to direct search:', err.message);
    analyzed = itemsWithPrefs.map((item) => ({ original: item.name, query: item.name, needsClarification: false }));
  }

  const pendingClarification = analyzed.filter((a) => a.needsClarification);
  const readyItems = analyzed.filter((a) => !a.needsClarification);

  if (pendingClarification.length > 0) {
    conversationState.set(userId, {
      allItems: itemsWithPrefs,
      readyItems,
      pending: pendingClarification,
      awaitingAnswers: true,
    });

    const questions = pendingClarification.map((a, i) => `${i + 1}. ${a.question}`).join('\n');
    return `לפני שאמשיך, כמה שאלות:\n\n${questions}\n\nענה על כל השאלות בסדר (שורה לכל תשובה).`;
  }

  return searchAndBuildCart(readyItems, itemsWithPrefs);
}

async function handleClarification(messageBody, userId) {
  const state = conversationState.get(userId);
  if (!state) return null;

  conversationState.delete(userId);

  const answers = messageBody.split('\n').map((l) => l.trim()).filter(Boolean);

  let resolved;
  try {
    resolved = await mergeClarifications(state.pending, answers);
  } catch (err) {
    console.error('[bot] Claude merge failed:', err.message);
    resolved = state.pending.map((item, i) => ({
      original: item.original,
      query: `${item.original} ${answers[i] || ''}`.trim(),
    }));
  }

  const allReady = [
    ...state.readyItems,
    ...resolved.map((r) => ({ original: r.original, query: r.query, needsClarification: false })),
  ];

  return searchAndBuildCart(allReady, state.allItems);
}

async function searchAndBuildCart(readyItems, originalItems) {
  const queries = readyItems.map((a) => a.query || a.name);
  const searchResults = await searchProducts(queries);

  // Re-map results back to original names for display
  const remapped = searchResults.map((r, i) => ({
    ...r,
    query: readyItems[i]?.original || r.query,
  }));

  const foundItems = remapped
    .filter((r) => r.result !== null && !r.result.outOfStock)
    .map(({ result }) => {
      const originalItem = originalItems.find((i) => i.name === result.name || queries.includes(result.name));
      return { id: result.id, quantity: originalItem?.quantity ?? 1 };
    });

  let cart = null;
  if (foundItems.length > 0) {
    cart = await createCart(foundItems);
  }

  return formatReplyMessage(remapped, cart);
}

function hasPendingClarification(userId) {
  return conversationState.has(userId);
}

function handleSetToken(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 4) return false;
  const [, apiKey, ecomToken, ...cookieParts] = parts;
  setSession(apiKey, ecomToken, cookieParts.join(' '));
  return true;
}

async function handleSetPref(userId, text) {
  // /setpref חלב = חלב ללא לקטוז
  const match = text.replace(/^\/setpref\s*/i, '').match(/^(.+?)\s*=\s*(.+)$/);
  if (!match) return false;
  await setPreference(userId, match[1].trim(), match[2].trim());
  return true;
}

async function handleDeletePref(userId, text) {
  const key = text.replace(/^\/deletepref\s*/i, '').trim();
  if (!key) return false;
  await deletePreference(userId, key);
  return true;
}

async function handleListPrefs(userId) {
  const prefs = await listPreferences(userId);
  const entries = Object.entries(prefs);
  if (entries.length === 0) return 'אין לך העדפות שמורות.';
  return '*העדפות שמורות:*\n' + entries.map(([k, v]) => `  • ${k} → ${v}`).join('\n');
}

module.exports = {
  handleShoppingList,
  handleClarification,
  hasPendingClarification,
  handleSetToken,
  handleSetPref,
  handleDeletePref,
  handleListPrefs,
};
