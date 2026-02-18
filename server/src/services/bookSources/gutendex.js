import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";

const GUTENDEX_BASE_URL = "https://gutendex.com/books";
const MAX_GUTENDEX_PAGES = 50;
const GUTENDEX_PAGE_SIZE = 32;
const GUTENDEX_HEADERS = {
  Accept: "application/json",
  "User-Agent": "ReadABookOrSomething/1.0 (+local-dev)"
};

const pickByMimePrefix = (formats, prefix) => {
  const key = Object.keys(formats || {}).find((item) => item.startsWith(prefix));
  return key ? formats[key] : undefined;
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

export const fetchGutendexPage = async ({ query, page = 1, mimeType }) => {
  const response = await fetchWithTimeout(
    buildUrl({ query, page, mimeType }),
    { headers: GUTENDEX_HEADERS },
    30000,
    1,
    600
  );
  if (!response.ok) {
    throw new Error(`Gutendex request failed: ${response.status}`);
  }
  return response.json();
};

export const searchGutendexWindow = async (query, options = {}) => {
  const { limit = 20, page = 1, mimeType } = options;
  const safeLimit = Math.max(Number(limit) || 20, 1);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const startPage = Math.floor(offset / GUTENDEX_PAGE_SIZE) + 1;
  const endOffset = offset + safeLimit - 1;
  const endPage = Math.floor(Math.max(endOffset, 0) / GUTENDEX_PAGE_SIZE) + 1;

  const firstPayload = await fetchGutendexPage({ query, page: startPage, mimeType });
  const firstResults = Array.isArray(firstPayload.results) ? firstPayload.results : [];
  const total = Number(firstPayload.count) || 0;

  if (offset >= total) {
    return { total, results: [] };
  }

  const chunks = [];
  for (let p = startPage; p <= endPage; p += 1) {
    if (p === startPage) {
      chunks.push(firstResults);
      continue;
    }
    const payload = await fetchGutendexPage({ query, page: p, mimeType });
    chunks.push(Array.isArray(payload.results) ? payload.results : []);
  }

  const flat = chunks.flat();
  const localStart = offset - (startPage - 1) * GUTENDEX_PAGE_SIZE;
  const sliced = flat.slice(localStart, localStart + safeLimit).map(normalizeGutendexBook);

  return { total, results: sliced };
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
