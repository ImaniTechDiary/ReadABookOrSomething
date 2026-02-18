import { searchGutendex, searchGutendexWindow } from "./bookSources/gutendex.js";
import { getFallbackBooksPage } from "./bookSources/fallbackBooks.js";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const DEFAULT_SOURCES = ["gutendex"];
const sourceHandlers = {
  gutendex: searchGutendex
};

const cache = new Map();

const normalizeText = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeAuthorKey = (authors = []) => normalizeText(authors[0] || "");
const makeDedupeKey = (book) => `${normalizeText(book.title)}::${normalizeAuthorKey(book.authors)}`;

const computeScore = (book, query) => {
  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(book.title);
  const authors = normalizeText((book.authors || []).join(" "));

  if (!normalizedQuery) return 0;
  if (normalizedTitle === normalizedQuery) return 100;
  if (normalizedTitle.startsWith(normalizedQuery)) return 90;
  if (normalizedTitle.includes(normalizedQuery)) return 75;
  if (authors.includes(normalizedQuery)) return 60;
  return 25;
};

const getCacheKey = (query, sources) =>
  `${normalizeText(query)}::${sources.slice().sort().join(",")}`;

const getCached = (key) => {
  const value = cache.get(key);
  if (!value) return null;
  if (Date.now() - value.createdAt > TEN_MINUTES_MS) {
    cache.delete(key);
    return null;
  }
  return value;
};

const setCached = (key, results, sourceStatus) => {
  cache.set(key, {
    createdAt: Date.now(),
    results,
    sourceStatus
  });
};

export const parseSourcesParam = (_rawSources) => {
  return DEFAULT_SOURCES;
};

export const aggregateBooks = async ({ query, sources, limit = 20, page = 1 }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;

  const cacheKey = getCacheKey(query, sources);
  const cached = getCached(cacheKey);

  if (sources.length === 1 && sources[0] === "gutendex") {
    const direct = await searchGutendexWindow(query, { limit: safeLimit, page: safePage });
    return {
      total: direct.total,
      results: direct.results,
      sourceStatus: {
        gutendex: {
          ok: true,
          count: direct.results.length
        }
      }
    };
  }

  if (cached) {
    return {
      total: cached.results.length,
      results: cached.results.slice(start, end),
      sourceStatus: cached.sourceStatus || {}
    };
  }

  const sourcePromises = sources.map(async (source) => {
    const handler = sourceHandlers[source];
    if (!handler) return [];
    const sourceFetchLimit = Math.max(120, safePage * safeLimit * 3);
    return handler(query, { limit: sourceFetchLimit });
  });

  const settled = await Promise.allSettled(sourcePromises);
  const sourceStatus = {};

  const combined = settled.flatMap((result, index) => {
    const source = sources[index];
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      sourceStatus[source] = { ok: true, count: result.value.length };
      return result.value;
    }

    sourceStatus[source] = {
      ok: false,
      count: 0,
      error:
        result.status === "rejected"
          ? result.reason?.message || "Source request failed"
          : "Source request failed"
    };
    return [];
  });

  const dedupedByKey = new Map();
  for (const book of combined) {
    const key = makeDedupeKey(book);
    const score = computeScore(book, query);
    const withScore = { ...book, score };
    const existing = dedupedByKey.get(key);
    if (!existing || withScore.score > existing.score) {
      dedupedByKey.set(key, withScore);
    }
  }

  const ranked = [...dedupedByKey.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });

  const allSourcesFailed =
    sources.length > 0 &&
    sources.every((source) => sourceStatus[source] && sourceStatus[source].ok === false);

  if (!(allSourcesFailed && ranked.length === 0)) {
    setCached(cacheKey, ranked, sourceStatus);
  }

  if (allSourcesFailed && ranked.length === 0) {
    const fallback = getFallbackBooksPage({ query, page: safePage, limit: safeLimit });
    const fallbackResults = fallback.results.map((book) => ({
      ...book,
      score: computeScore(book, query)
    }));

    return {
      total: fallback.total,
      results: fallbackResults,
      sourceStatus: {
        ...sourceStatus,
        fallback: {
          ok: true,
          count: fallbackResults.length
        }
      }
    };
  }

  return {
    total: ranked.length,
    results: ranked.slice(start, end),
    sourceStatus
  };
};
