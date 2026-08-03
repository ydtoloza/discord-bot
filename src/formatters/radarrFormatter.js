const { getQualityLabel, translateText } = require('../utils/helpers');

const SUPPORTED_EVENTS = new Set([
  'Download',
  'Grab',
  'MovieFileImport',
  'MovieFileRename',
  'Test',
  'Upgrade'
]);

function isRadarrEventSupported(eventType) {
  return SUPPORTED_EVENTS.has(eventType);
}

function getMovieFile(payload) {
  return payload.movieFile || payload.remoteMovie?.movieFile || payload.localMovie?.movieFile || {};
}

function getRadarrLogTitle(payload) {
  return payload.movie?.title || payload.remoteMovie?.movie?.title || 'Unknown movie';
}

async function formatRadarrMessage(payload) {
  if (payload.eventType === 'Test') {
    return {
      title: '✅ Test de Radarr Exitoso',
      description: 'El webhook de Radarr está conectado y enviando notificaciones correctamente a Discord.',
      color: 0xffa500 // Naranja para Radarr
    };
  }

  const movie = payload.movie || payload.remoteMovie?.movie || {};
  const movieFile = getMovieFile(payload);
  const mediaInfo = movieFile.mediaInfo || {};
  const title = movie.title;

  if (!title) {
    return null;
  }

  const year = movie.year ? ` (${movie.year})` : '';
  const overview = movie.overview ? await translateText(movie.overview) : '';
  const quality = getQualityLabel(movieFile.quality);
  
  // Buscar imágenes
  const images = movie.images || [];
  let imageUrl = null;
  const preferredImage = images.find((img) => ['poster', 'cover'].includes(String(img.coverType).toLowerCase())) || images[0];
  if (preferredImage) {
    imageUrl = preferredImage.remoteUrl || preferredImage.url;
  }

  let embedTitle = payload.eventType === 'Grab' ? '📥 Descarga Iniciada' : '🎬 Nueva película';
  
  const embed = {
    title: embedTitle,
    description: `**${title}${year}**\n\n${overview}`,
    color: 0xffa500,
    fields: []
  };

  if (imageUrl) {
    embed.image = { url: imageUrl };
  }

  if (quality) {
    embed.fields.push({
      name: '🎞 Calidad',
      value: quality,
      inline: true
    });
  }

  // Bitrate if available (usually in bits or bytes per second depending on Radarr version)
  // Let's check typical Radarr mediaInfo fields: videoBitrate
  if (mediaInfo.videoBitrate) {
    const kbps = Math.round(mediaInfo.videoBitrate / 1000);
    embed.fields.push({
      name: '📶 Bitrate',
      value: `${kbps} Kbps`,
      inline: true
    });
  }

  return embed;
}

module.exports = {
  formatRadarrMessage,
  getRadarrLogTitle,
  isRadarrEventSupported
};
