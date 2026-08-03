const { compactLines, formatBytes, formatEpisodeCode, getQualityLabel, translateText } = require('../utils/helpers');
const { getTmdbSeriesOverview } = require('../services/tmdb');

const SUPPORTED_EVENTS = new Set([
  'Download',
  'EpisodeFileImport',
  'Grab',
  'SeriesAdd',
  'SeriesAdded',
  'Test',
  'Upgrade'
]);

function isSonarrEventSupported(eventType) {
  return SUPPORTED_EVENTS.has(eventType);
}

function getEpisodeFile(payload) {
  return payload.episodeFile || payload.remoteEpisode?.episodeFile || {};
}

function getEpisodes(payload) {
  if (Array.isArray(payload.episodes) && payload.episodes.length > 0) {
    return payload.episodes;
  }

  if (Array.isArray(payload.remoteEpisode?.episodes) && payload.remoteEpisode.episodes.length > 0) {
    return payload.remoteEpisode.episodes;
  }

  return payload.episode ? [payload.episode] : [];
}

function getSonarrLogTitle(payload) {
  const seriesTitle = payload.series?.title || payload.remoteEpisode?.series?.title || 'Unknown series';
  const firstEpisode = getEpisodes(payload)[0];
  const episodeCode = firstEpisode ? ` ${formatEpisodeCode(firstEpisode)}` : '';

  return `${seriesTitle}${episodeCode}`;
}

function formatEpisodeLine(episode) {
  const code = formatEpisodeCode(episode);
  return episode.title ? `${code} — ${episode.title}` : code;
}

function isSeriesPackage(episodes) {
  return episodes.length > 1;
}

function formatSeriesMessage(series) {
  const year = series.year ? ` (${series.year})` : '';
  const status = series.status ? `📊 ${series.status}` : '';
  const network = series.network ? `📡 ${series.network}` : '';

  return compactLines([
    '📺 **Nueva serie**',
    '',
    `${series.title}${year}`,
    '',
    status,
    network
  ]).join('\n');
}

async function formatSonarrMessage(payload) {
  const series = payload.series || payload.remoteEpisode?.series || {};
  const episodes = getEpisodes(payload);
  const episodeFile = getEpisodeFile(payload);
  const mediaInfo = episodeFile.mediaInfo || {};
  if (payload.eventType === 'Test') {
    return compactLines([
      '✅ **Test de Sonarr Exitoso**',
      '',
      'El webhook de Sonarr está conectado y enviando notificaciones correctamente a Discord.'
    ]).join('\n');
  }

  const title = series.title;

  if (!title) {
    return '';
  }

  if (episodes.length === 0 && ['SeriesAdd', 'SeriesAdded'].includes(payload.eventType)) {
    return formatSeriesMessage(series);
  }

  if (episodes.length === 0) {
    return '';
  }

  const quality = getQualityLabel(episodeFile.quality, episodeFile.qualityCutoffNotMet);
  const header = episodes.length > 1 ? '📺 **Nuevos episodios**' : '📺 **Nuevo episodio**';
  const useSeriesOverview = isSeriesPackage(episodes);
  const rawEpisodeOverview = episodes[0]?.overview;
  
  const translatedEpisodeOverview = rawEpisodeOverview ? await translateText(rawEpisodeOverview) : '';

  const finalOverview = useSeriesOverview
    ? await getTmdbSeriesOverview(series.tmdbId || series.tmdbid)
    : translatedEpisodeOverview;
  
  let episodesLines = [];
  if (episodes.length === 1) {
    episodesLines = [formatEpisodeLine(episodes[0])];
  } else {
    // Si hay multiples episodios
    const seasons = new Set(episodes.map(e => e.seasonNumber));
    if (seasons.size === 1) {
      episodesLines = [`${episodes.length} episodios de la Temporada ${[...seasons][0]} agregados`];
    } else {
      episodesLines = [`${episodes.length} episodios de varias temporadas agregados`];
    }
  }

  if (payload.eventType === 'Grab') {
    return compactLines([
      '📥 **Descarga Iniciada**',
      '',
      title,
      '',
      ...episodesLines,
      '',
      finalOverview ? `${finalOverview}` : '',
      finalOverview ? '' : ''
    ]).join('\n');
  }

  return compactLines([
    header,
    '',
    title,
    '',
    ...episodesLines,
    '',
    finalOverview ? `${finalOverview}` : '',
    finalOverview ? '' : '',
    quality ? `🎞 ${quality}` : ''
  ]).join('\n');
}

module.exports = {
  formatSonarrMessage,
  getSonarrLogTitle,
  isSonarrEventSupported
};
