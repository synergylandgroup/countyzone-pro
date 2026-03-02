// netlify/functions/sheets-write-zones.js
// Writes zone letter assignments back to "County Zone" column in "LI Raw Dataset"
// Looks up the column by header name — never by position

const { google } = require('googleapis');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { sheetId, sheetName = 'LI Raw Dataset', assignments } = JSON.parse(event.body || '{}');
    // assignments: [{ rowIndex: 2, zone: 'A' }, { rowIndex: 5, zone: 'B' }, ...]

    if (!sheetId)     return { statusCode: 400, headers, body: JSON.stringify({ error: 'sheetId required' }) };
    if (!assignments || !assignments.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'assignments array required' }) };
    }

    // Auth
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Find the County Zone column by header name
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!1:1`,
    });

    const headerRow = (headerRes.data.values || [[]])[0] || [];
    const zoneColIndex = headerRow.findIndex(h => h && h.trim() === 'County Zone');

    if (zoneColIndex === -1) {
      return {
        statusCode: 400, headers,
        body: JSON.stringify({ error: '"County Zone" column not found in sheet headers' })
      };
    }

    // Convert 0-based col index to A1 column letter
    function colToLetter(col) {
      let letter = '';
      col++; // make 1-based
      while (col > 0) {
        const mod = (col - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        col = Math.floor((col - mod) / 26);
      }
      return letter;
    }

    const zoneColLetter = colToLetter(zoneColIndex);

    // Build batch update — one request per assignment
    const data = assignments.map(({ rowIndex, zone }) => ({
      range: `${sheetName}!${zoneColLetter}${rowIndex}`,
      values: [[zone.toUpperCase()]],
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data,
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, updated: assignments.length }),
    };

  } catch (err) {
    console.error('sheets-write-zones error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
