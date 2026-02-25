import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";

const STATIC_STICKERS = [
  { id: "star", label: "Star", previewUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2b50.svg", sticker: "⭐" },
  { id: "sparkles", label: "Sparkles", previewUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2728.svg", sticker: "✨" },
  { id: "heart", label: "Heart", previewUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2764.svg", sticker: "❤️" },
  { id: "bookmark", label: "Bookmark", previewUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f516.svg", sticker: "🔖" },
  { id: "idea", label: "Idea", previewUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4a1.svg", sticker: "💡" },
  { id: "pin", label: "Pin", previewUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4cc.svg", sticker: "📌" },
  { id: "rocket", label: "Rocket", previewUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f680.svg", sticker: "🚀" },
  { id: "brain", label: "Brain", previewUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f9e0.svg", sticker: "🧠" },
  { id: "fire", label: "Fire", previewUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f525.svg", sticker: "🔥" },
  { id: "clap", label: "Clap", previewUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f44f.svg", sticker: "👏" }
];

const normalize = (value = "") => value.trim().toLowerCase();

const filterStatic = ({ query = "", limit = 24, page = 1 }) => {
  const q = normalize(query);
  const safeLimit = Math.min(Math.max(Number(limit) || 24, 1), 60);
  const safePage = Math.max(Number(page) || 1, 1);
  const filtered = STATIC_STICKERS.filter((item) =>
    q ? `${item.label} ${item.sticker}`.toLowerCase().includes(q) : true
  );
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;

  return {
    source: "fallback",
    total: filtered.length,
    results: filtered.slice(start, end).map((item) => ({
      id: `fallback:${item.id}`,
      label: item.label,
      sticker: item.sticker,
      previewUrl: item.previewUrl,
      lottieUrl: ""
    }))
  };
};

const normalizeIconscoutItem = (item) => ({
  id: String(item.id || item.uuid || item.slug || Math.random()),
  label: item.name || item.title || "Sticker",
  sticker: "",
  previewUrl:
    item.preview_url ||
    item.raster_size_64_url ||
    item.thumbnail_url ||
    item.raster_url ||
    "",
  lottieUrl: item.lottie_url || item.lottie?.url || ""
});

const normalizeIconifyItem = (iconName = "") => {
  const [prefix, name] = iconName.split(":");
  if (!prefix || !name) return null;
  const label = name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return {
    id: `iconify:${iconName}`,
    label: label || iconName,
    sticker: "",
    previewUrl: `https://api.iconify.design/${prefix}/${name}.svg`,
    lottieUrl: ""
  };
};

const searchIconifyStickers = async ({ query = "", limit = 24, page = 1 }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 24, 1), 60);
  const safePage = Math.max(Number(page) || 1, 1);
  const params = new URLSearchParams({
    query: query || "sticker",
    limit: String(safeLimit),
    start: String((safePage - 1) * safeLimit)
  });

  const response = await fetchWithTimeout(
    `https://api.iconify.design/search?${params.toString()}`,
    { headers: { Accept: "application/json" } },
    12000,
    0,
    400
  );

  if (!response.ok) {
    throw new Error(`Iconify request failed: ${response.status}`);
  }

  const payload = await response.json();
  const icons = Array.isArray(payload?.icons) ? payload.icons : [];
  const normalized = icons
    .map(normalizeIconifyItem)
    .filter(Boolean);

  return {
    source: "iconify",
    total: Number(payload?.total || normalized.length),
    results: normalized
  };
};

export const searchIconscoutStickers = async ({ query = "", limit = 24, page = 1 }) => {
  const apiKey = process.env.ICONSCOUT_API_KEY || "";
  const baseUrl = process.env.ICONSCOUT_API_BASE_URL || "";

  if (!apiKey || !baseUrl) {
    try {
      return await searchIconifyStickers({ query, limit, page });
    } catch {
      return filterStatic({ query, limit, page });
    }
  }

  try {
    const params = new URLSearchParams({
      q: query || "",
      page: String(page || 1),
      per_page: String(limit || 24),
      asset: "lottie"
    });

    const response = await fetchWithTimeout(
      `${baseUrl}?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`
        }
      },
      12000,
      0,
      400
    );

    if (!response.ok) {
      throw new Error(`Iconscout request failed: ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.response?.items)
        ? payload.response.items
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

    const normalized = items.map(normalizeIconscoutItem);
    if (!normalized.length) {
      try {
        return await searchIconifyStickers({ query, limit, page });
      } catch {
        return filterStatic({ query, limit, page });
      }
    }

    return {
      source: "iconscout",
      total: Number(payload?.total || payload?.count || normalized.length),
      results: normalized
    };
  } catch {
    try {
      return await searchIconifyStickers({ query, limit, page });
    } catch {
      return filterStatic({ query, limit, page });
    }
  }
};
