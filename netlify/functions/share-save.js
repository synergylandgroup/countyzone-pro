// netlify/functions/share-save.js
// Saves zone data and returns a short share ID using Netlify Blobs

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const payload = JSON.parse(event.body || '{}');
    if (!payload.zones || !payload.zones.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'zones required' }) };

    // Generate short ID
    const id = Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

    const { getStore } = require('@netlify/blobs');
    const store = getStore('zone-shares');
    await store.set(id, JSON.stringify({ ...payload, created: new Date().toISOString() }));

    return { statusCode: 200, headers, body: JSON.stringify({ id }) };
  } catch (err) {
    console.error('share-save error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
