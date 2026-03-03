// netlify/functions/share-load.js
// Loads zone data by share ID from Netlify Blobs

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    const id = event.queryStringParameters?.id;
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) };

    const { getStore } = require('@netlify/blobs');
    const store = getStore('zone-shares');
    const raw = await store.get(id);
    if (!raw) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Share not found or expired' }) };

    return { statusCode: 200, headers, body: raw };
  } catch (err) {
    console.error('share-load error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
