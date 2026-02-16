import { Router } from "express";
import { aggregateBooks, parseSourcesParam } from "../services/bookAggregator.js";

const router = Router();

router.get("/search", async (req, res, next) => {
  try {
    const query = (req.query.q || "").toString().trim();
    if (!query) {
      return res.status(400).json({ message: "q query parameter is required" });
    }

    const sources = parseSourcesParam((req.query.sources || "").toString());
    const limit = Number(req.query.limit) || 20;
    const results = await aggregateBooks({ query, sources, limit });

    return res.status(200).json({
      query,
      count: results.length,
      results
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

