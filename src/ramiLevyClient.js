const axios = require('axios');

const BASE_URL = 'https://www.rami-levy.co.il';

/**
 * Build authenticated headers for all Rami Levy API requests.
 * Tokens come from an active browser session (see .env.example for how to extract them).
 */
function getHeaders() {
  return {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'he-IL,he;q=0.9',
    'authorization': `Bearer ${process.env.RAMI_LEVY_API_KEY}`,
    'ecomtoken': process.env.RAMI_LEVY_ECOM_TOKEN,
    'cookie': process.env.RAMI_LEVY_COOKIE,
    'content-type': 'application/json;charset=UTF-8',
    'locale': 'he',
    'origin': BASE_URL,
    'referer': `${BASE_URL}/he`,
    'user-agent': 'Mozilla/5.0 (compatible; WhatsApp-Bot/1.0)',
  };
}

/**
 * Search for a single product by name.
 * Returns the best match (first result) or null if not found.
 *
 * @param {string} query  - Product name in Hebrew or English
 * @param {string} storeId - Store ID (default from env)
 * @returns {Promise<{id, name, price, imageUrl} | null>}
 */
async function searchProduct(query, storeId = process.env.RAMI_LEVY_STORE_ID) {
  try {
    const response = await axios.get(`${BASE_URL}/api/catalog`, {
      headers: getHeaders(),
      params: {
        q: query,
        store: storeId,
        aggs: 1,
      },
      timeout: 8000,
    });

    const items = response.data?.data;
    if (!items || items.length === 0) return null;

    const best = items[0];
    return {
      id: best.id,
      name: best.name,
      price: best.price?.price ?? null,
      imageUrl: best.media?.logo ?? null,
    };
  } catch (err) {
    console.error(`[searchProduct] Error searching "${query}":`, err.message);
    return null;
  }
}

/**
 * Search for multiple products in parallel (max 5 concurrent to avoid rate limiting).
 *
 * @param {string[]} queries - Array of product names
 * @param {string}   storeId
 * @returns {Promise<Array<{query, result}>>}
 */
async function searchProducts(queries, storeId = process.env.RAMI_LEVY_STORE_ID) {
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

    // Small delay between batches to be polite to the API
    if (i + BATCH_SIZE < queries.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return results;
}

/**
 * Create (or update) a cart with given items.
 *
 * @param {Array<{id: number|string, quantity: number}>} items
 * @param {string} storeId
 * @returns {Promise<{cartUrl: string, total: number} | null>}
 */
async function createCart(items, storeId = process.env.RAMI_LEVY_STORE_ID) {
  // Build the items object: { "productId": "quantity", ... }
  const itemsMap = {};
  items.forEach(({ id, quantity }) => {
    itemsMap[String(id)] = String(quantity.toFixed(2));
  });

  try {
    const supplyAt = getNextDeliveryDate();

    const response = await axios.post(
      `${BASE_URL}/api/v2/cart`,
      {
        store: storeId,
        isClub: 0,
        supplyAt,
        items: itemsMap,
        meta: null,
      },
      {
        headers: getHeaders(),
        timeout: 10000,
      }
    );

    const data = response.data;
    return {
      cartUrl: `${BASE_URL}/he/cart`,
      total: data?.totals?.total ?? null,
      itemCount: Object.keys(itemsMap).length,
    };
  } catch (err) {
    console.error('[createCart] Error creating cart:', err.message);
    return null;
  }
}

/**
 * Returns tomorrow's date in ISO format (used as supplyAt in cart requests).
 */
function getNextDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

module.exports = { searchProduct, searchProducts, createCart };
