const axios = require('axios');

function getWebhookUrl() {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    throw new Error('Missing DISCORD_WEBHOOK_URL environment variable');
  }
  return url.trim();
}

async function sendEmbed(embed) {
  const url = getWebhookUrl();

  const payload = {
    embeds: [embed]
  };

  // If there's content to ping roles etc, it could go here, but for now just embed.
  if (embed.content) {
    payload.content = embed.content;
    delete embed.content;
  }

  await axios.post(
    url,
    payload,
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );

  console.log('[Discord] Embed message sent');
}

module.exports = {
  sendEmbed
};
