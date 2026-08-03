const { formatEpisodeCode, getQualityLabel, translateText } = require('../utils/helpers');
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

async function formatSonarrMessage(payload) {
  if (payload.eventType === 'Test') {
    return {
      title: '✅ Test de Sonarr Exitoso',
      description: 'El webhook de Sonarr está conectado y enviando notificaciones correctamente a Discord.',
      color: 0x0088ff // Azul para Sonarr
    };
  }

  const series = payload.series || payload.remoteEpisode?.series || {};
  const episodes = getEpisodes(payload);
  const episodeFile = getEpisodeFile(payload);
  const mediaInfo = episodeFile.mediaInfo || {};
  const title = series.title;

  if (!title) {
    return null;
  }

  // Buscar imágenes
  const images = series.images || [];
  let imageUrl = null;
  const preferredImage = images.find((img) => ['poster', 'cover'].includes(String(img.coverType).toLowerCase())) || images[0];
  if (preferredImage) {
    imageUrl = preferredImage.remoteUrl || preferredImage.url;
  }

  const year = series.year ? ` (${series.year})` : '';

  if (episodes.length === 0 && ['SeriesAdd', 'SeriesAdded'].includes(payload.eventType)) {
    const embed = {
      title: '📺 Nueva serie agregada',
      description: `**${title}${year}**\n\n${series.status ? `Estado: ${series.status}` : ''}`,
      color: 0x0088ff,
      fields: []
    };
    if (imageUrl) embed.image = { url: imageUrl };
    return embed;
  }

  if (episodes.length === 0) {
    return null;
  }

  const quality = getQualityLabel(episodeFile.quality, episodeFile.qualityCutoffNotMet);
  const useSeriesOverview = isSeriesPackage(episodes);
  const rawEpisodeOverview = episodes[0]?.overview;
  
  const translatedEpisodeOverview = rawEpisodeOverview ? await translateText(rawEpisodeOverview) : '';
  const finalOverview = useSeriesOverview
    ? await getTmdbSeriesOverview(series.tmdbId || series.tmdbid)
    : translatedEpisodeOverview;
  
  let episodesLines = [];
  let headerTitle = '';

  if (payload.eventType === 'Grab') {
    headerTitle = '📥 Descarga Iniciada';
  } else {
    headerTitle = episodes.length > 1 ? '📺 Nuevos episodios' : '📺 Nuevo episodio';
  }

  if (episodes.length === 1) {
    episodesLines = [formatEpisodeLine(episodes[0])];
  } else {
    const seasons = new Set(episodes.map(e => e.seasonNumber));
    if (seasons.size === 1) {
      episodesLines = [`${episodes.length} episodios de la Temporada ${[...seasons][0]} agregados`];
    } else {
      episodesLines = [`${episodes.length} episodios de varias temporadas agregados`];
    }
  }

  const embed = {
    title: headerTitle,
    description: `**${title}**\n\n${episodesLines.join('\n')}\n\n${finalOverview || ''}`,
    color: 0x0088ff,
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

  if (mediaInfo.videoBitrate) {
    const kbps = Math.round(mediaInfo.videoBitrate / 1000);
    embed.fields.push({
      name: '📶 Bitrate',
      value: `${kbps} Kbps`,
      inline: true
    });
  }

  let audios = episodeFile.languages && episodeFile.languages.length > 0
    ? episodeFile.languages.map(l => l.name).join(', ')
    : (mediaInfo.audioLanguages ? mediaInfo.audioLanguages.join(', ').toUpperCase() : '');
    
  let subs = mediaInfo.subtitles ? mediaInfo.subtitles.join(', ').toUpperCase() : '';

  if (audios) {
    embed.fields.push({ name: '🔊 Audio', value: audios, inline: true });
  }
  if (subs) {
    embed.fields.push({ name: '💬 Subs', value: subs, inline: true });
  }

  return embed;
}

module.exports = {
  formatSonarrMessage,
  getSonarrLogTitle,
  isSonarrEventSupported
};
