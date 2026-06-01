const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const BASE_URL = 'https://otakudesu.blog';
const TIMEOUT = 30000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; rv:120.0) Gecko/20100101 Firefox/120.0';

const fetchHTML = async (url) => {
  try {
    return await cloudscraper.get(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      timeout: TIMEOUT,
    });
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
};

const cleanTitle = (title) =>
  title
    .replace(/\s*Sub\s*Indo\s*$/i, '')
    .replace(/\s*Subtitle\s*Indonesia\s*$/i, '')
    .replace(/\s*Episode\s+\d+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

const buildTitleIndex = (knownTitles) => {
  const index = new Map();
  for (const raw of knownTitles) {
    const clean = cleanTitle(raw);
    if (clean.length > 3) index.set(clean.replace(/\s+/g, ''), raw);
  }
  return index;
};

const splitByUppercaseTransition = (text) => {
  const titles = [];
  let buffer = '';
  for (let i = 0; i < text.length; i++) {
    buffer += text[i];
    const next = text[i + 1];
    if (next && /[a-z0-9)\]}"'!?.:]/.test(text[i]) && /[A-Z]/.test(next)) {
      if (buffer.length > 3) {
        titles.push(buffer.trim());
        buffer = '';
      }
    }
  }
  if (buffer.trim().length > 3) titles.push(buffer.trim());
  const merged = [];
  for (const t of titles) {
    if (merged.length > 0 && t.length < 12 && !/Season|Part|Movie|OVA|Special/i.test(t)) {
      merged[merged.length - 1] += t;
    } else {
      merged.push(t);
    }
  }
  return merged.filter((t) => t.length > 3);
};

const splitByKnownTitles = (text, titleIndex) => {
  const stripped = text.replace(/\s+/g, '');
  const matches = [];
  for (const [cleanStripped, original] of titleIndex) {
    let pos = 0;
    while ((pos = stripped.indexOf(cleanStripped, pos)) !== -1) {
      matches.push({ start: pos, end: pos + cleanStripped.length, title: original });
      pos += cleanStripped.length;
    }
  }
  matches.sort((a, b) => a.start - b.start);
  const filtered = [];
  for (const m of matches) {
    if (filtered.length === 0 || m.start >= filtered[filtered.length - 1].end) filtered.push(m);
  }
  if (filtered.length === 0) return splitByUppercaseTransition(text);
  const result = [];
  let cursor = 0;
  for (const m of filtered) {
    if (m.start > cursor) {
      const remaining = text.substring(cursor, m.start).trim();
      if (remaining.length > 3) result.push(...splitByUppercaseTransition(remaining));
    }
    result.push(m.title);
    cursor = m.end;
  }
  if (cursor < text.length) {
    const remaining = text.substring(cursor).trim();
    if (remaining.length > 3) result.push(...splitByUppercaseTransition(remaining));
  }
  return result.filter((t) => t.length > 3);
};

const parseList = ($) => {
  const results = [];
  $('.detpost').each((i, el) => {
    const thumb = $(el).find('.thumb a');
    const img = thumb.find('img');
    results.push({
      title: img.attr('alt') || '',
      link: thumb.attr('href') || '',
      image: img.attr('src') || '',
      episode: $(el).find('.epz').text().trim(),
      jadwal: $(el).find('.epztipe').text().trim(),
      tanggal: $(el).find('.newnime').text().trim(),
    });
  });
  if (!results.length) {
    $('.venutama ul li, .venser ul li').each((i, el) => {
      const a = $(el).find('a');
      const img = a.find('img');
      if (a.length) {
        results.push({
          title: img.attr('alt') || a.text().trim(),
          link: a.attr('href') || '',
          image: img.attr('src') || '',
        });
      }
    });
  }
  return results;
};

const parseDetail = ($) => {
  const info = {};
  $('.infozingle p span, .spe span').each((i, el) => {
    const t = $(el).text().trim();
    const idx = t.indexOf(':');
    if (idx !== -1) info[t.slice(0, idx).trim().toLowerCase()] = t.slice(idx + 1).trim();
  });
  const sinopsis = $('.sinopsis').text().trim() || $('.infozingle p:last-of-type').text().trim();
  const episodes = [];
  $('.episodelist ul li a, .episodelist a').each((i, el) => {
    episodes.push({ title: $(el).text().trim(), link: $(el).attr('href') || '' });
  });
  return { info, episodes, sinopsis };
};

const parseEpisode = ($) => {
  const title = $('h1, .entry-title').first().text().trim();
  const download = [];
  $('.download ul li').each((i, el) => {
    download.push({
      quality: $(el).find('strong').text().trim(),
      link: $(el).find('a').attr('href') || '',
    });
  });
  const streaming = [];
  $('iframe').each((i, el) => {
    const src = $(el).attr('src');
    if (src) streaming.push(src);
  });
  return { title, download, streaming };
};

const parseGenreList = ($) =>
  $('.genres a')
    .map((i, el) => ({
      genre: $(el).text().trim(),
      link: BASE_URL + ($(el).attr('href') || ''),
    }))
    .get();

const parseBatch = ($) => {
  const title = $('h1, .entry-title').first().text().trim();
  const download = [];
  $('.download ul li, .download2 ul li').each((i, el) => {
    download.push({
      quality: $(el).find('strong').text().trim(),
      link: $(el).find('a').attr('href') || '',
    });
  });
  return { title, download };
};

const parseJadwal = ($, knownTitles = []) => {
  const raw = $('.venser .page, .venutama, .venser').first().text().trim();
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random'];
  const schedule = {};
  let currentDay = null;
  const titleIndex = buildTitleIndex(knownTitles);
  const cleaned = raw
    .replace(/^Jadwal Rilis Anime On-Going\s*/, '')
    .replace(/Jadwal Rilis\s*/, '')
    .replace(/Note:\s*Jadwal bisa berubah sewaktu-waktu\s*/, '');
  const parts = cleaned.split(new RegExp('(' + days.join('|') + ')'));
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (days.includes(part)) {
      currentDay = part;
      schedule[currentDay] = [];
    } else if (currentDay && part.length > 0) {
      schedule[currentDay] = titleIndex.size > 0
        ? splitByKnownTitles(part, titleIndex)
        : splitByUppercaseTransition(part);
    }
  }
  return schedule;
};

const scraper = async (type, param) => {
  let html, $;
  let data;

  switch (type) {
    case 'home':
      html = await fetchHTML(`${BASE_URL}/`);
      data = parseList(cheerio.load(html));
      break;

    case 'ongoing':
      html = await fetchHTML(`${BASE_URL}/ongoing-anime/`);
      data = parseList(cheerio.load(html));
      break;

    case 'search':
      if (!param) throw new Error('Query required');
      html = await fetchHTML(`${BASE_URL}/?s=${encodeURIComponent(param)}&post_type=anime`);
      data = parseList(cheerio.load(html));
      break;

    case 'anime':
      if (!param) throw new Error('Slug required');
      html = await fetchHTML(`${BASE_URL}/anime/${encodeURIComponent(param)}/`);
      data = parseDetail(cheerio.load(html));
      break;

    case 'episode':
      if (!param) throw new Error('Slug required');
      html = await fetchHTML(`${BASE_URL}/episode/${encodeURIComponent(param)}/`);
      data = parseEpisode(cheerio.load(html));
      break;

    case 'genre':
      html = await fetchHTML(`${BASE_URL}/genre-list/`);
      data = parseGenreList(cheerio.load(html));
      break;

    case 'batch':
      if (!param) throw new Error('Slug required');
      html = await fetchHTML(`${BASE_URL}/batch/${encodeURIComponent(param)}/`);
      data = parseBatch(cheerio.load(html));
      break;

    case 'jadwal':
      html = await fetchHTML(`${BASE_URL}/`);
      const knownTitles = parseList(cheerio.load(html)).map((a) => a.title);
      html = await fetchHTML(`${BASE_URL}/jadwal-rilis/`);
      data = parseJadwal(cheerio.load(html), knownTitles);
      break;

    case 'all':
      const [homeHtml, ongoingHtml, genreHtml, jadwalHtml] = await Promise.all([
        fetchHTML(`${BASE_URL}/`),
        fetchHTML(`${BASE_URL}/ongoing-anime/`),
        fetchHTML(`${BASE_URL}/genre-list/`),
        fetchHTML(`${BASE_URL}/jadwal-rilis/`),
      ]);
      const homeData = parseList(cheerio.load(homeHtml));
      const ongoingData = parseList(cheerio.load(ongoingHtml));
      const allTitles = [...homeData.map((a) => a.title), ...ongoingData.map((a) => a.title)];
      data = {
        home: homeData,
        ongoing: ongoingData,
        genre_list: parseGenreList(cheerio.load(genreHtml)),
        jadwal: parseJadwal(cheerio.load(jadwalHtml), allTitles),
      };
      break;

    default:
      throw new Error(`Unknown type: ${type}`);
  }

  return {
    success: true,
    data,
    creator: 'rynaqrtz',
  };
};

module.exports = scraper;
