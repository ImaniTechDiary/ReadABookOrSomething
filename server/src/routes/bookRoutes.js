import { Router } from "express";
import { aggregateBooks, parseSourcesParam } from "../services/bookAggregator.js";
import { searchGutendexWindow } from "../services/bookSources/gutendex.js";
import { getFallbackBooksPage } from "../services/bookSources/fallbackBooks.js";

const router = Router();

router.get("/gutendex", async (req, res, next) => {
  try {
    const query = (req.query.q || "").toString().trim();
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;
    const { total, results } = await searchGutendexWindow(query, { limit, page });

    return res.status(200).json({
      query,
      page,
      limit,
      count: results.length,
      total,
      sourceStatus: {
        gutendex: {
          ok: true,
          count: results.length
        }
      },
      results
    });
  } catch (error) {
    const query = (req.query.q || "").toString().trim();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const fallback = getFallbackBooksPage({ query, page, limit });

    return res.status(200).json({
      query,
      page,
      limit,
      count: fallback.results.length,
      total: fallback.total,
      sourceStatus: {
        gutendex: {
          ok: false,
          count: 0,
          error: error.message || "Gutendex request failed"
        },
        fallback: {
          ok: true,
          count: fallback.results.length
        }
      },
      results: fallback.results
    });
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const query = (req.query.q || "").toString().trim();
    const sources = parseSourcesParam((req.query.sources || "").toString());
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;
    const timedAggregate = Promise.race([
      aggregateBooks({
        query,
        sources,
        limit,
        page
      }),
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              total: 0,
              results: [],
              sourceStatus: Object.fromEntries(
                sources.map((source) => [
                  source,
                  { ok: false, count: 0, error: "Aggregator timed out after 20000ms" }
                ])
              )
            }),
          20000
        )
      )
    ]);

    const { total, results, sourceStatus } = await timedAggregate;

    return res.status(200).json({
      query,
      page,
      limit,
      count: results.length,
      total,
      sourceStatus,
      results
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
