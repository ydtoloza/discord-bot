const { sendEmbed } = require('./discord');
const { formatSonarrMessage, getSonarrLogTitle } = require('../formatters/sonarrFormatter');
const { isDuplicate } = require('./deduplicator');

const pendingWebhooks = new Map();
// Ventana deslizante (ms): cada webhook del mismo key reinicia el timer.
// Configurable por .env; default 10 s para no cambiar el comportamiento previo.
const AGGREGATION_DELAY_MS = Math.max(0, Number(process.env.AGGREGATION_DELAY_MS) || 10000);

function getAggregationKey(payload) {
  const seriesId = payload.series?.id || payload.remoteEpisode?.series?.id;
  if (seriesId && ['Download', 'EpisodeFileImport', 'Grab'].includes(payload.eventType)) {
    return `${payload.eventType}_${seriesId}`;
  }
  return null;
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

async function processAggregatedPayload(key) {
  const data = pendingWebhooks.get(key);
  if (!data) return;
  pendingWebhooks.delete(key);

  const { basePayload, allEpisodes } = data;
  
  // Sort episodes by season/episode number
  allEpisodes.sort((a, b) => {
    if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
    return a.episodeNumber - b.episodeNumber;
  });

  // Replace episodes in base payload
  if (basePayload.episodes) {
    basePayload.episodes = allEpisodes;
  } else if (basePayload.remoteEpisode && basePayload.remoteEpisode.episodes) {
    basePayload.remoteEpisode.episodes = allEpisodes;
  } else {
    basePayload.episodes = allEpisodes; // Fallback
  }

  try {
    const embed = await formatSonarrMessage(basePayload);
    if (!embed) return;

    if (allEpisodes.length > 1) {
      console.log(`[Sonarr] Procesando ${allEpisodes.length} episodios agregados para ${basePayload.series?.title || 'Unknown'}`);
    } else {
      console.log(`[Sonarr] ${getSonarrLogTitle(basePayload)}`);
    }

    await sendEmbed(embed);
  } catch (error) {
    console.error('[Sonarr Aggregator]', error.message);
  }
}

function handleSonarrWebhook(payload) {
  const key = getAggregationKey(payload);

  if (!key) {
    // If it's not a aggregatable event, process immediately
    processImmediate(payload);
    return;
  }

  const episodes = getEpisodes(payload);
  const type = payload.eventType;
  const tvdb = payload.series?.tvdbId || payload.remoteEpisode?.series?.tvdbId || payload.series?.id || '0';
  let quality = payload.episodeFile?.quality || payload.remoteEpisode?.episodeFile?.quality || '0';

  if (type === 'SeriesAdd' || type === 'SeriesAdded') {
    const fingerprint = `S_${tvdb}_${type}`;
    if (isDuplicate(fingerprint)) {
      console.log(`[Sonarr] Duplicate ignored: ${fingerprint}`);
      return;
    }
  }

  // Solo procesamos episodios que no sean duplicados
  const uniqueEpisodes = episodes.filter(ep => {
    const fingerprint = `S_${tvdb}_${ep.seasonNumber}x${ep.episodeNumber}_${quality}_${type}`;
    
    if (type !== 'Test' && isDuplicate(fingerprint)) {
      console.log(`[Sonarr] Duplicate ignored: ${fingerprint}`);
      return false;
    }
    return true;
  });

  if (type !== 'Test' && uniqueEpisodes.length === 0 && episodes.length > 0) {
    // Si todos los episodios de este webhook eran duplicados, lo ignoramos entero.
    return;
  }
  
  if (pendingWebhooks.has(key)) {
    const data = pendingWebhooks.get(key);
    
    // Add new episodes avoiding duplicates by ID
    for (const ep of uniqueEpisodes) {
      if (!data.allEpisodes.some(e => e.id === ep.id)) {
        data.allEpisodes.push(ep);
      }
    }
    
    // Reset timer
    clearTimeout(data.timer);
    data.timer = setTimeout(() => processAggregatedPayload(key), AGGREGATION_DELAY_MS);
  } else {
    // First event of this kind
    const timer = setTimeout(() => processAggregatedPayload(key), AGGREGATION_DELAY_MS);
    pendingWebhooks.set(key, {
      basePayload: payload,
      allEpisodes: [...episodes],
      timer
    });
  }
}

async function processImmediate(payload) {
  try {
    const embed = await formatSonarrMessage(payload);
    if (!embed) return;

    console.log(`[Sonarr] ${getSonarrLogTitle(payload)}`);
    await sendEmbed(embed);
  } catch (error) {
    console.error('[Sonarr Immediate]', error.message);
  }
}

module.exports = {
  handleSonarrWebhook
};
