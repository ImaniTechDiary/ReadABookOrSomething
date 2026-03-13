import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";

const GUTENDEX_BASE_URL = "https://gutendex.com/books";
const MAX_GUTENDEX_PAGES = 50;
const GUTENDEX_PAGE_SIZE = 32;
const PAGE_CACHE_TTL_MS = 10 * 60 * 1000;
const QUERY_WINDOW_CACHE_TTL_MS = 10 * 60 * 1000;
const GUTENDEX_HEADERS = {
  Accept: "application/json",
  "User-Agent": "ReadABookOrSomething/1.0 (+local-dev)"
};
const pageCache = new Map();
const queryWindowCache = new Map();

const pickByMimePrefix = (formats, prefix) => {
  const key = Object.keys(formats || {}).find((item) => item.startsWith(prefix));
  return key ? formats[key] : undefined;
};

const toGenreLabel = (value = "") =>
  value
    .split("--")[0]
    .replace(/\.+$/, "")
    .trim();

const extractGenres = (item) => {
  const candidates = [...(item.bookshelves || []), ...(item.subjects || [])]
    .map(toGenreLabel)
    .filter(Boolean);

  return [...new Set(candidates)].slice(0, 6);
};

const normalizeGenre = (value = "") => value.trim().toLowerCase();
const bookMatchesGenre = (book, genre) => {
  const target = normalizeGenre(genre);
  if (!target) return true;
  return (book.genres || []).some((item) => normalizeGenre(item).includes(target));
};

export const normalizeGutendexBook = (item) => {
  const formats = item.formats || {};
  const epub = formats["application/epub+zip"];
  const html = pickByMimePrefix(formats, "text/html");
  const text = pickByMimePrefix(formats, "text/plain");
  const derivedCover = `https://www.gutenberg.org/cache/epub/${item.id}/pg${item.id}.cover.medium.jpg`;

  return {
    id: `gutendex:${item.id}`,
    title: item.title || "",
    authors: (item.authors || []).map((author) => author.name).filter(Boolean),
    genres: extractGenres(item),
    coverUrl: formats["image/jpeg"] || derivedCover,
    source: "gutendex",
    readable: true,
    formats: {
      epub,
      html,
      text
    }
  };
};

const buildUrl = ({ query, page = 1, mimeType }) => {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("search", query);
  if (mimeType) params.set("mime_type", mimeType);
  return `${GUTENDEX_BASE_URL}?${params.toString()}`;
};

const getCachedPage = (cacheKey) => {
  const cached = pageCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > PAGE_CACHE_TTL_MS) {
    pageCache.delete(cacheKey);
    return null;
  }
  return cached.payload;
};

const setCachedPage = (cacheKey, payload) => {
  pageCache.set(cacheKey, { createdAt: Date.now(), payload });
};

const getQueryWindowCacheKey = ({ query = "", mimeType }) =>
  `${query.trim().toLowerCase()}::${mimeType || ""}`;

const getCachedQueryWindow = (cacheKey) => {
  const cached = queryWindowCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > QUERY_WINDOW_CACHE_TTL_MS) {
    queryWindowCache.delete(cacheKey);
    return null;
  }
  return cached;
};

const createQueryWindowState = () => ({
  createdAt: Date.now(),
  total: 0,
  normalizedResults: [],
  nextPageToFetch: 1,
  exhausted: false
});

export const fetchGutendexPage = async ({
  query,
  page = 1,
  mimeType,
  timeoutMs = 15000,
  retries = 2
}) => {
  const cacheKey = buildUrl({ query, page, mimeType });
  const cachedPayload = getCachedPage(cacheKey);
  if (cachedPayload) return cachedPayload;

  const response = await fetchWithTimeout(
    cacheKey,
    { headers: GUTENDEX_HEADERS },
    timeoutMs,
    retries,
    600
  );
  if (!response.ok) {
    throw new Error(`Gutendex request failed: ${response.status}`);
  }
  const payload = await response.json();
  setCachedPage(cacheKey, payload);
  return payload;
};

export const searchGutendexWindow = async (query, options = {}) => {
  const { limit = 20, page = 1, mimeType, genre = "" } = options;
  const safeLimit = Math.max(Number(limit) || 20, 1);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const neededEnd = offset + safeLimit;
  const cacheKey = getQueryWindowCacheKey({ query, mimeType });
  let state = getCachedQueryWindow(cacheKey);

  if (!state) {
    state = createQueryWindowState();
    queryWindowCache.set(cacheKey, state);
  } else {
    state.createdAt = Date.now();
  }

  const targetGenre = normalizeGenre(genre);
  const hasGenreFilter = Boolean(targetGenre);

  while (!state.exhausted && state.nextPageToFetch <= MAX_GUTENDEX_PAGES) {
    if (!hasGenreFilter && state.normalizedResults.length >= neededEnd) {
      break;
    }

    if (hasGenreFilter) {
      const existingFilteredCount = state.normalizedResults.filter((book) =>
        bookMatchesGenre(book, targetGenre)
      ).length;
      if (existingFilteredCount >= neededEnd) {
        break;
      }
    }

    const payload = await fetchGutendexPage({
      query,
      page: state.nextPageToFetch,
      mimeType,
      timeoutMs: 15000,
      retries: 2
    });
    const rawItems = Array.isArray(payload.results) ? payload.results : [];
    state.total = Number(payload.count) || state.total;
    state.normalizedResults.push(...rawItems.map(normalizeGutendexBook));

    if (!payload.next || rawItems.length < GUTENDEX_PAGE_SIZE) {
      state.exhausted = true;
    } else {
      state.nextPageToFetch += 1;
    }
  }

  if (!hasGenreFilter) {
    if (offset >= state.total) {
      return { total: state.total, results: [] };
    }

    return {
      total: state.total,
      results: state.normalizedResults.slice(offset, neededEnd)
    };
  }

  const filtered = state.normalizedResults.filter((book) => bookMatchesGenre(book, targetGenre));
  const filteredTotal = filtered.length;
  if (offset >= filteredTotal) {
    return { total: filteredTotal, results: [] };
  }

  return {
    total: filteredTotal,
    results: filtered.slice(offset, neededEnd)
  };
};

export const searchGutendex = async (query, options = {}) => {
  const { limit = 20, mimeType } = options;
  const safeLimit = Math.max(Number(limit) || 20, 1);
  const collected = [];
  let nextPage = 1;
  let pages = 0;

  while (collected.length < safeLimit && pages < MAX_GUTENDEX_PAGES) {
    const payload = await fetchGutendexPage({ query, page: nextPage, mimeType });
    const items = Array.isArray(payload.results) ? payload.results : [];
    if (!items.length) break;

    for (const item of items) {
      collected.push(normalizeGutendexBook(item));
      if (collected.length >= safeLimit) break;
    }

    if (!payload.next) break;
    nextPage += 1;
    pages += 1;
  }

  return collected;
};
