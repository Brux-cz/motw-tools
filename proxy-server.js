import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/anthropic/messages', async (req, res) => {
  const apiKey = req.headers['x-api-key'];

  console.log('[PROXY] Received request');
  console.log('[PROXY] API Key:', apiKey ? `present (${apiKey.length} chars)` : 'MISSING');
  console.log('[PROXY] Body:', JSON.stringify(req.body).substring(0, 100));

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('[PROXY] Response status:', response.status);

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[PROXY] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
