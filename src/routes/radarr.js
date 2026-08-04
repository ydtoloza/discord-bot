const express = require('express');
const { sendEmbed } = require('../services/discord');
const { isDuplicate } = require('../services/deduplicator');
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

  const type = payload.eventType;
  const tmdb = payload.movie?.tmdbId || payload.remoteMovie?.tmdbId || payload.movie?.id || '0';
  const quality = payload.movieFile?.quality || '0';
  const fingerprint = `R_${tmdb}_${quality}_${type}`;

  if (type !== 'Test' && isDuplicate(fingerprint)) {
    console.log(`[Radarr] Duplicate ignored: ${fingerprint}`);
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
