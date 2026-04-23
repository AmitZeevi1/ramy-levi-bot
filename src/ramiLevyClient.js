const axios = require('axios');

const BASE_URL = 'https://www.rami-levy.co.il';

// In-memory session — populated via /settoken command or env vars at startup
const session = {
  apiKey: process.env.RAMI_LEVY_API_KEY || null,
  ecomToken: process.env.RAMI_LEVY_ECOM_TOKEN || null,
  cookie: process.env.RAMI_LEVY_COOKIE || null,
};

function setSession(apiKey, ecomToken, cookie) {
  session.apiKey = apiKey;
  session.ecomToken = ecomToken;
  session.cookie = cookie;
}

function hasSession() {
  return !!(session.apiKey && session.ecomToken && session.cookie);
}

function getHeaders() {
  return {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'he-IL,he;q=0.9',
    'authorization': `Bearer ${session.apiKey}`,
    'ecomtoken': session.ecomToken,
    'cookie': session.cookie,
    'content-type': 'application/json;charset=UTF-8',
    'locale': 'he',
    'origin': BASE_URL,
    'referer': `${BASE_URL}/he`,
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };
}

async function searchProduct(query, storeId = process.env.RAMI_LEVY_STORE_ID || '331') {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/catalog`,
      { q: query, aggs: 1, store: storeId },
      { headers: getHeaders(), timeout: 8000 }
    );

    const items = response.data?.data;
    if (!items || items.length === 0) return null;

    const best = items[0];
    const storeIdNum = Number(storeId);
    return {
      id: best.id,
      name: best.name,
      price: best.price?.price ?? null,
      imageUrl: best.images?.small ?? null,
      outOfStock: best.prop?.status === 0 || (best.available_in && !best.available_in.includes(storeIdNum)),
    };
  } catch (err) {
    console.error(`[searchProduct] Error searching "${query}":`, err.message);
    return null;
  }
}

async function searchProducts(queries, storeId = process.env.RAMI_LEVY_STORE_ID || '331') {
  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (query) => ({
        query,
        result: await searchProduct(query, storeId),
      }))
    );
    results.push(...batchResults);

    if (i + BATCH_SIZE < queries.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return results;
}

async function createCart(items, storeId = process.env.RAMI_LEVY_STORE_ID || '331') {
  const itemsMap = {};
  items.forEach(({ id, quantity }) => {
    itemsMap[String(id)] = String(quantity.toFixed(2));
  });

  try {
    const supplyAt = getNextDeliveryDate();

    const response = await axios.post(
      `${BASE_URL}/api/v2/cart`,
      { store: storeId, isClub: 0, supplyAt, items: itemsMap, meta: null },
      { headers: getHeaders(), timeout: 10000 }
    );

    const data = response.data;
    return {
      cartUrl: `${BASE_URL}/he/`,
      total: data?.totals?.total ?? null,
      itemCount: Object.keys(itemsMap).length,
    };
  } catch (err) {
    console.error('[createCart] Error creating cart:', err.message);
    return null;
  }
}

function getNextDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

module.exports = { searchProduct, searchProducts, createCart, setSession, hasSession };
