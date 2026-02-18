import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";

const WIKISOURCE_API_BASE = "https://en.wikisource.org/w/api.php";

const buildHtmlUrl = (title) =>
  `https://en.wikisource.org/wiki/${encodeURIComponent(title).replace(/%20/g, "_")}`;

export const searchWikisource = async (query, options = {}) => {
  const { limit = 20 } = options;
  const title = query.trim();

  if (!title || limit < 1) {
    return [];
  }

  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "text",
    format: "json"
  });

  // Stub-like implementation: try exact title parse and return one normalized item if found.
  const response = await fetchWithTimeout(`${WIKISOURCE_API_BASE}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Wikisource request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.parse?.title) {
    return [];
  }

  return [
    {
      id: `wikisource:${encodeURIComponent(payload.parse.title)}`,
      title: payload.parse.title,
      authors: [],
      source: "wikisource",
      readable: true,
      formats: {
        html: buildHtmlUrl(payload.parse.title)
      }
    }
  ];
};
