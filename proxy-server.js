import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - whitelist only localhost in development
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3004', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' })); // Limit request body size

app.post('/api/anthropic/messages', async (req, res) => {
  // Use server-side API key from environment variables
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('[PROXY] API key not configured on server');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Validate request body
  if (!req.body || !req.body.model || !req.body.messages) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  // Validate model (allow only specific models)
  const allowedModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-20240620',
    'claude-3-haiku-20240307',
    'claude-sonnet-4-5-20250929'
  ];

  if (!allowedModels.includes(req.body.model)) {
    return res.status(400).json({ error: 'Model not allowed' });
  }

  // Limit max_tokens
  const maxTokensLimit = 4096;
  if (req.body.max_tokens && req.body.max_tokens > maxTokensLimit) {
    req.body.max_tokens = maxTokensLimit;
  }

  console.log('[PROXY] Request:', { model: req.body.model, messages: req.body.messages.length });

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
    console.log('[PROXY] Response:', { status: response.status, ok: response.ok });

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[PROXY] Error:', error.constructor.name);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
