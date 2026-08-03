const axios = require('axios');

const DEFAULT_LANGUAGE = 'es-ES';
const DEFAULT_CACHE_TTL_MINUTES = 1440;
const cache = new Map();

function getTmdbConfig() {
  const ttlMinutes = Number(process.env.TMDB_CACHE_TTL_MINUTES);

  return {
    apiKey: process.env.TMDB_API_KEY ? process.env.TMDB_API_KEY.trim() : null,
    language: process.env.TMDB_LANGUAGE || DEFAULT_LANGUAGE,
    ttlMinutes: Number.isFinite(ttlMinutes) && ttlMinutes > 0
      ? ttlMinutes
      : DEFAULT_CACHE_TTL_MINUTES
  };
}

function getCacheKey(tmdbId, language) {
  return `tv:${tmdbId}:${language}`;
}

async function getTmdbSeriesOverview(tmdbId) {
  const { apiKey, language, ttlMinutes } = getTmdbConfig();

  if (!apiKey || !tmdbId) {
    return '';
  }

  const cacheKey = getCacheKey(tmdbId, language);
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.overview;
  }

  try {
    const response = await axios.get(`https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbId)}`, {
      params: {
        api_key: apiKey,
        language
      },
      timeout: 10000
    });

    const overview = typeof response.data?.overview === 'string' ? response.data.overview : '';

    cache.set(cacheKey, {
      overview,
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    });

    return overview;
  } catch (error) {
    console.error('[TMDB Error]', error.message);
    return '';
  }
}

module.exports = {
  getTmdbSeriesOverview
};
