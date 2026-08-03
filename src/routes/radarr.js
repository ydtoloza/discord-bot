const express = require('express');
const { sendEmbed } = require('../services/discord');
const { formatRadarrMessage, getRadarrLogTitle, isRadarrEventSupported } = require('../formatters/radarrFormatter');

const router = express.Router();

async function handleRadarrWebhook(req, res) {
  res.status(200).json({ ok: true });

  const payload = req.body || {};

  console.log(`[Radarr] Received webhook: ${payload.eventType || 'Unknown Event'}`);

  if (!isRadarrEventSupported(payload.eventType)) {
    console.log(`[Radarr] Event ignored (not supported): ${payload.eventType}`);
    return;
  }

  try {
    const embed = await formatRadarrMessage(payload);
    if (!embed) {
      return;
    }

    console.log(`[Radarr] ${getRadarrLogTitle(payload)}`);
    
    await sendEmbed(embed);
  } catch (error) {
    console.error('[Radarr]', error.message);
  }
}

router.post('/', handleRadarrWebhook);

module.exports = router;
