const GUTENDEX_BASE_URL = "https://gutendex.com/books";

const pickByMimePrefix = (formats, prefix) => {
  const key = Object.keys(formats || {}).find((item) => item.startsWith(prefix));
  return key ? formats[key] : undefined;
};

export const searchGutendex = async (query, options = {}) => {
  const { limit = 20, mimeType } = options;
  const params = new URLSearchParams({
    search: query,
    page: "1"
  });

  if (mimeType) {
    params.set("mime_type", mimeType);
  }

  const response = await fetch(`${GUTENDEX_BASE_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Gutendex request failed: ${response.status}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload.results) ? payload.results.slice(0, limit) : [];

  return items.map((item) => {
    const formats = item.formats || {};
    const epub = formats["application/epub+zip"];
    const html = pickByMimePrefix(formats, "text/html");
    const text = pickByMimePrefix(formats, "text/plain");

    return {
      id: `gutendex:${item.id}`,
      title: item.title || "",
      authors: (item.authors || []).map((author) => author.name).filter(Boolean),
      coverUrl: formats["image/jpeg"],
      source: "gutendex",
      readable: true,
      formats: {
        epub,
        html,
        text
      }
    };
  });
};

