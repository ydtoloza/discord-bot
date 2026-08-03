const express = require('express');
const { sendImage, sendText } = require('../services/discord');
const { formatRadarrMessage, getRadarrLogTitle, isRadarrEventSupported } = require('../formatters/radarrFormatter');
const { getImageMedia } = require('../utils/helpers');

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
    const message = await formatRadarrMessage(payload);
    if (!message) {
      return;
    }

    console.log(`[Radarr] ${getRadarrLogTitle(payload)}`);
    const image = getImageMedia(payload.movie?.images || payload.remoteMovie?.movie?.images, payload.image);

    if (image) {
      await sendImage(image, message);
      return;
    }

    await sendText(message);
  } catch (error) {
    console.error('[Radarr]', error.message);
  }
}

router.post('/', handleRadarrWebhook);

module.exports = router;
