// index.js
const express = require('express');
const { consultarVanti } = require('./vanti-bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/v1/vanti', async (req, res) => {
  const cuenta = (req.query.cuenta || '').trim();
  if (!/^\d+$/.test(cuenta)) {
    return res.status(400).json({ ok: false, status: 'BAD_REQUEST', error: 'Parámetro "cuenta" requerido (solo dígitos).' });
  }

  // Optional request timeout
  const abortAfterMs = Number(process.env.REQUEST_TIMEOUT_MS || 60000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), abortAfterMs);

  try {
    const r = await consultarVanti(cuenta);
    res.json(r);
  } catch (e) {
    res.status(500).json({ ok: false, status: 'ERROR', error: e.message });
  } finally {
    clearTimeout(timer);
  }
});

app.get('/', (_, res) => res.send('VantiBot OK'));
app.listen(PORT, () => console.log(`HTTP server on :${PORT}`));
