const { compactLines, getQualityLabel, translateText } = require('../utils/helpers');

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
  const movie = payload.movie || payload.remoteMovie?.movie || {};
  const movieFile = getMovieFile(payload);
  const mediaInfo = movieFile.mediaInfo || {};
  if (payload.eventType === 'Test') {
    return compactLines([
      '✅ **Test de Radarr Exitoso**',
      '',
      'El webhook de Radarr está conectado y enviando notificaciones correctamente a Discord.'
    ]).join('\n');
  }

  const title = movie.title;

  if (!title) {
    return '';
  }

  const year = movie.year ? ` (${movie.year})` : '';
  const overview = movie.overview ? await translateText(movie.overview) : '';
  const quality = getQualityLabel(movieFile.quality);

  if (payload.eventType === 'Grab') {
    return compactLines([
      '📥 **Descarga Iniciada**',
      '',
      `🍿 ${title}${year}`,
      '',
      quality ? `🎞 ${quality}` : ''
    ]).join('\n');
  }

  return compactLines([
    '🎬 **Nueva película**',
    '',
    `🍿 ${title}${year}`,
    '',
    overview ? `${overview}` : '',
    '',
    quality ? `🎞 ${quality}` : ''
  ]).join('\n');
}

module.exports = {
  formatRadarrMessage,
  getRadarrLogTitle,
  isRadarrEventSupported
};
