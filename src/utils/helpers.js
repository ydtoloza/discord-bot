function compactLines(lines) {
  const result = [];

  for (const line of lines) {
    if (line === undefined || line === null) {
      continue;
    }

    const value = String(line).trimEnd();

    if (value === '' && result[result.length - 1] === '') {
      continue;
    }

    result.push(value);
  }

  while (result[0] === '') {
    result.shift();
  }

  while (result[result.length - 1] === '') {
    result.pop();
  }

  return result;
}

function formatBytes(bytes) {
  const value = Number(bytes);

  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${Number(size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1))} ${units[unitIndex]}`;
}

const translate = require('translate-google');

async function translateText(text) {
  if (!text || typeof text !== 'string') return text;
  try {
    return await translate(text, { to: 'es' });
  } catch (error) {
    console.error('[Traducción Error]', error.message);
    return text; // Fallback al texto original si falla
  }
}

function getQualityLabel(quality) {
  if (!quality) {
    return '';
  }

  if (typeof quality === 'string') {
    const searchStr = quality.toLowerCase();

    if (searchStr.includes('2160') || searchStr.includes('4k')) {
      return '4K Ultra HD';
    }
    if (searchStr.includes('1080')) {
      return '1080p Full HD';
    }
    if (searchStr.includes('720')) {
      return '720p HD';
    }
    if (searchStr.includes('480')) {
      return 'Calidad Estándar (SD)';
    }

    return quality;
  }

  const source = quality.quality?.source || quality.source || '';
  const resolution = quality.quality?.resolution || quality.resolution || '';
  const name = quality.quality?.name || quality.name || '';
  
  const searchStr = `${source} ${resolution} ${name}`.toLowerCase();

  if (searchStr.includes('2160') || searchStr.includes('4k')) {
    return '4K Ultra HD';
  }
  if (searchStr.includes('1080')) {
    return '1080p Full HD';
  }
  if (searchStr.includes('720')) {
    return '720p HD';
  }
  if (searchStr.includes('480')) {
    return 'Calidad Estándar (SD)';
  }

  // Fallback si no se reconoce la resolución
  const parts = [];
  if (source) parts.push(source);
  if (resolution) parts.push(`${resolution}p`);
  if (parts.length > 0) return parts.join(' ');

  return name || '';
}

function formatEpisodeCode(episode) {
  const season = Number(episode.seasonNumber);
  const number = Number(episode.episodeNumber);

  if (!Number.isFinite(season) || !Number.isFinite(number)) {
    return episode.title || 'Episodio';
  }

  return `S${String(season).padStart(2, '0')}E${String(number).padStart(2, '0')}`;
}

function getImageMedia(images, fallbackImage) {
  if (typeof fallbackImage === 'string' && fallbackImage.trim()) {
    return fallbackImage.trim();
  }

  if (!Array.isArray(images)) {
    return '';
  }

  const preferred = images.find((image) => ['poster', 'cover'].includes(String(image.coverType || image.type).toLowerCase()))
    || images.find((image) => image.remoteUrl || image.url);

  if (!preferred) {
    return '';
  }

  return preferred.remoteUrl || preferred.url || '';
}

function mapLanguageCode(code) {
  if (!code) return '';
  const lower = String(code).toLowerCase();
  
  const map = {
    'spa': 'Español (Latinoamérica)',
    'es': 'Español (Latinoamérica)',
    'spanish': 'Español (Latinoamérica)',
    'eng': 'Inglés',
    'en': 'Inglés',
    'english': 'Inglés',
    'jpn': 'Japonés',
    'ja': 'Japonés',
    'japanese': 'Japonés',
    'myn': 'Maya',
    'fre': 'Francés',
    'fra': 'Francés',
    'french': 'Francés',
    'ger': 'Alemán',
    'deu': 'Alemán',
    'german': 'Alemán',
    'ita': 'Italiano',
    'italian': 'Italiano',
    'por': 'Portugués',
    'portuguese': 'Portugués',
    'kor': 'Coreano',
    'ko': 'Coreano',
    'korean': 'Coreano',
    'chi': 'Chino',
    'zho': 'Chino',
    'chinese': 'Chino',
    'rus': 'Ruso',
    'russian': 'Ruso'
  };

  return map[lower] || code.toUpperCase();
}

function parseLanguages(languagesArr, mediaInfoLangs) {
  // Prefer mediaInfoLangs as it usually contains the actual MKV tracks
  let langs = mediaInfoLangs && mediaInfoLangs.length > 0 ? mediaInfoLangs : [];
  if (langs.length === 0 && languagesArr && languagesArr.length > 0) {
    langs = languagesArr.map(l => l.name);
  }
  
  if (!langs || langs.length === 0) return '';
  
  // Deduplicate and map
  const unique = [...new Set(langs)];
  return unique.map(mapLanguageCode).join(', ');
}

module.exports = {
  compactLines,
  formatBytes,
  formatEpisodeCode,
  getImageMedia,
  getQualityLabel,
  translateText,
  mapLanguageCode,
  parseLanguages
};
