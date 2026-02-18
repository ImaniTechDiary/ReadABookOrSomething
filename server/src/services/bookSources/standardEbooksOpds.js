import { XMLParser } from "fast-xml-parser";
import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";

const OPDS_URLS = [
  "https://standardebooks.org/feeds/opds",
  "https://standardebooks.org/opds/all",
  "https://standardebooks.org/feeds/opds/all"
];
const MAX_OPDS_PAGES = 30;
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
});

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const pickLink = (links, predicate) => asArray(links).find(predicate)?.href;
const resolveLink = (base, href) => {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
};

const deriveId = (entryId) => {
  if (!entryId) return `standardebooks:${crypto.randomUUID()}`;
  const cleaned = entryId.split("#")[0].replace(/\/$/, "");
  const slug = cleaned.split("/").pop() || cleaned;
  return `standardebooks:${slug}`;
};

export const searchStandardEbooksOpds = async (query, options = {}) => {
  const { limit = 20 } = options;
  const safeLimit = Math.max(Number(limit) || 20, 1);
  const lowerQuery = query.trim().toLowerCase();
  const collected = [];

  let nextUrl = OPDS_URLS[0];
  let pages = 0;
  let opdsStartIndex = 0;
  const requestHeaders = {
    Accept: "application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  };

  while (nextUrl && collected.length < safeLimit && pages < MAX_OPDS_PAGES) {
    let response;
    try {
      response = await fetchWithTimeout(
        nextUrl,
        {
          headers: requestHeaders
        },
        25000,
        1,
        500
      );
    } catch (error) {
      throw new Error(`Standard Ebooks OPDS request failed: ${error.message}`);
    }

    if (!response.ok && (response.status === 401 || response.status === 403)) {
      opdsStartIndex += 1;
      if (opdsStartIndex < OPDS_URLS.length) {
        nextUrl = OPDS_URLS[opdsStartIndex];
        pages = 0;
        continue;
      }
      throw new Error(`Standard Ebooks OPDS request failed: ${response.status}`);
    }

    if (!response.ok) {
      throw new Error(`Standard Ebooks OPDS request failed: ${response.status}`);
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const entries = asArray(parsed?.feed?.entry);

    const mapped = entries
      .map((entry) => {
      const title = entry?.title || "";
      const authors = asArray(entry?.author).map((author) => author?.name).filter(Boolean);
      const links = asArray(entry?.link);

      const epub = pickLink(
        links,
        (link) =>
          (link.type || "").toLowerCase() === "application/epub+zip" ||
          (link.rel || "").includes("acquisition")
      );
      const html = pickLink(links, (link) => (link.type || "").startsWith("text/html"));
      const text = pickLink(links, (link) => (link.type || "").startsWith("text/plain"));
      const coverUrl = pickLink(
        links,
        (link) =>
          (link.rel || "").includes("image") ||
          (link.type || "").startsWith("image/")
      );

        return {
          id: deriveId(entry?.id),
          title,
          authors,
          coverUrl,
          source: "standardebooks",
          readable: true,
          formats: {
            epub,
            html,
            text
          }
        };
      })
      .filter((item) => {
        const haystack = `${item.title} ${item.authors.join(" ")}`.toLowerCase();
        return lowerQuery ? haystack.includes(lowerQuery) : true;
      });

    collected.push(...mapped);

    const feedLinks = asArray(parsed?.feed?.link);
    const nextHref = pickLink(feedLinks, (link) => (link.rel || "").includes("next"));
    nextUrl = nextHref ? resolveLink(nextUrl, nextHref) : null;
    pages += 1;
  }

  return collected.slice(0, safeLimit);
};
