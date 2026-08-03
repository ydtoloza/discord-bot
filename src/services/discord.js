const axios = require('axios');

function getWebhookUrl() {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    throw new Error('Missing DISCORD_WEBHOOK_URL environment variable');
  }
  return url;
}

async function sendText(text) {
  const url = getWebhookUrl();

  await axios.post(
    url,
    {
      content: text
    },
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  console.log('[Discord] Message sent');
}

async function sendImage(mediaUrl, caption) {
  const url = getWebhookUrl();

  if (!mediaUrl) {
    throw new Error('Missing image media URL');
  }

  // Enviamos la imagen embebida en un embed para que se vea elegante
  // junto con el texto en el contenido.
  await axios.post(
    url,
    {
      content: caption,
      embeds: [
        {
          image: {
            url: mediaUrl
          }
        }
      ]
    },
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );

  console.log('[Discord] Image and message sent');
}

module.exports = {
  sendImage,
  sendText
};
