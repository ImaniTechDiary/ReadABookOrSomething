import { searchGutendex } from "./bookSources/gutendex.js";
import { searchStandardEbooksOpds } from "./bookSources/standardEbooksOpds.js";
import { searchWikisource } from "./bookSources/wikisource.js";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const DEFAULT_SOURCES = ["gutendex", "standardebooks"];
const SUPPORTED_SOURCES = ["gutendex", "standardebooks", "wikisource"];
const SOURCE_FETCH_LIMIT = 50;

const sourceHandlers = {
  gutendex: searchGutendex,
  standardebooks: searchStandardEbooksOpds,
  wikisource: searchWikisource
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
  return value.results;
};

const setCached = (key, results) => {
  cache.set(key, {
    createdAt: Date.now(),
    results
  });
};

export const parseSourcesParam = (rawSources) => {
  if (!rawSources) return DEFAULT_SOURCES;

  const parsed = rawSources
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item) => SUPPORTED_SOURCES.includes(item));

  return parsed.length ? [...new Set(parsed)] : DEFAULT_SOURCES;
};

export const aggregateBooks = async ({ query, sources, limit = 20 }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const cacheKey = getCacheKey(query, sources);
  const cached = getCached(cacheKey);

  if (cached) {
    return cached.slice(0, safeLimit);
  }

  const sourcePromises = sources.map(async (source) => {
    const handler = sourceHandlers[source];
    if (!handler) return [];
    return handler(query, { limit: SOURCE_FETCH_LIMIT });
  });

  const settled = await Promise.allSettled(sourcePromises);

  const combined = settled.flatMap((result) =>
    result.status === "fulfilled" && Array.isArray(result.value) ? result.value : []
  );

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

  setCached(cacheKey, ranked);
  return ranked.slice(0, safeLimit);
};

