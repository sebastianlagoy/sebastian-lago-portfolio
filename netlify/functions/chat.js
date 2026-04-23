// netlify/functions/chat.js
// Proxy seguro para llamadas a la API de Google Gemini.
// La API key vive solo en las variables de entorno de Netlify.

const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY no está definida en las variables de entorno.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured on server.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const { messages, system } = body;

  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'messages array is required.' }) };
  }

  // Convertir historial al formato de Gemini
  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: geminiMessages,
        generationConfig: { maxOutputTokens: 350 }
      }),
    });

    const data = await response.json();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    console.error('Error llamando a Gemini:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error.' }),
    };
  }
};
