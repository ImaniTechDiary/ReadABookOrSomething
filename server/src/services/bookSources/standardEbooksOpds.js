import { XMLParser } from "fast-xml-parser";

const OPDS_URL = "https://standardebooks.org/feeds/opds";
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
});

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const pickLink = (links, predicate) => asArray(links).find(predicate)?.href;

const deriveId = (entryId) => {
  if (!entryId) return `standardebooks:${crypto.randomUUID()}`;
  const cleaned = entryId.split("#")[0].replace(/\/$/, "");
  const slug = cleaned.split("/").pop() || cleaned;
  return `standardebooks:${slug}`;
};

export const searchStandardEbooksOpds = async (query, options = {}) => {
  const { limit = 20 } = options;
  const response = await fetch(OPDS_URL, {
    headers: {
      Accept: "application/atom+xml, application/xml"
    }
  });

  if (!response.ok) {
    throw new Error(`Standard Ebooks OPDS request failed: ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const entries = asArray(parsed?.feed?.entry);
  const lowerQuery = query.trim().toLowerCase();

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
    })
    .slice(0, limit);

  return mapped;
};

