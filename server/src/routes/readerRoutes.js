import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const ALLOWED_HOSTS = [
  "gutendex.com",
  "www.gutenberg.org",
  "gutenberg.org",
  "standardebooks.org",
  "en.wikisource.org"
];

const isAllowedHost = (hostname) =>
  ALLOWED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));

router.get("/content", requireAuth, async (req, res, next) => {
  try {
    const rawUrl = (req.query.url || "").toString().trim();
    if (!rawUrl) {
      return res.status(400).json({ message: "url query parameter is required" });
    }

    let target;
    try {
      target = new URL(rawUrl);
    } catch {
      return res.status(400).json({ message: "invalid url" });
    }

    if (!["http:", "https:"].includes(target.protocol) || !isAllowedHost(target.hostname)) {
      return res.status(400).json({ message: "url host is not allowed" });
    }

    const upstream = await fetch(target.toString(), {
      headers: { Accept: "text/plain, text/html, application/xhtml+xml" }
    });

    if (!upstream.ok) {
      return res.status(502).json({ message: `upstream fetch failed: ${upstream.status}` });
    }

    const contentType = upstream.headers.get("content-type") || "text/plain; charset=utf-8";

    if (
      !contentType.includes("text/plain") &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      return res.status(415).json({ message: "unsupported content type for reader" });
    }

    const content = await upstream.text();

    return res.status(200).json({
      contentType,
      content
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

