const express = require('express');
const { isSonarrEventSupported } = require('../formatters/sonarrFormatter');
const { handleSonarrWebhook } = require('../services/sonarrAggregator');

const router = express.Router();

function handleSonarrRequest(req, res) {
  res.status(200).json({ ok: true });

  const payload = req.body || {};

  console.log(`[Sonarr] Received webhook: ${payload.eventType || 'Unknown Event'}`);

  if (!isSonarrEventSupported(payload.eventType)) {
    console.log(`[Sonarr] Event ignored (not supported): ${payload.eventType}`);
    return;
  }

  handleSonarrWebhook(payload);
}

router.post('/', handleSonarrRequest);

module.exports = router;
