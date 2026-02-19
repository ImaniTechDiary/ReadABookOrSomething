import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export default function BooksPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [genreFilter, setGenreFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sourceStatus, setSourceStatus] = useState({});
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [libraryIds, setLibraryIds] = useState(new Set());
  const [sparkleBookIds, setSparkleBookIds] = useState(new Set());

  const genreOptions = useMemo(() => {
    const genres = results.flatMap((book) => book.genres || []);
    return [...new Set(genres)].sort((a, b) => a.localeCompare(b));
  }, [results]);

  const filteredResults = useMemo(() => {
    if (genreFilter === "all") return results;
    return results.filter((book) => (book.genres || []).includes(genreFilter));
  }, [results, genreFilter]);

  const runSearch = async (searchQuery, nextPage = 1, nextLimit = limit) => {
    setLoading(true);
    setMessage("");
    const requestedSources = ["gutendex"];
    setSourceStatus(
      Object.fromEntries(
        requestedSources.map((source) => [source, { ok: null, count: 0, error: "loading..." }])
      )
    );

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: String(nextLimit),
        page: String(nextPage)
      });
      const data = await api(`/books/gutendex?${params.toString()}`, {
        method: "GET",
        timeoutMs: 45000
      });
      setResults(data.results || []);
      setPage(Number(data.page) || nextPage);
      setTotal(Number(data.total) || 0);
      setSourceStatus(data.sourceStatus || {});
      setMessage(`Gutendex mode: page ${Number(data.page) || nextPage}.`);
    } catch (error) {
      setMessage(error.message);
      setResults([]);
      setTotal(0);
      setSourceStatus(
        Object.fromEntries(
          requestedSources.map((source) => [
            source,
            { ok: false, count: 0, error: error.message || "request failed" }
          ])
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch("", 1);
  }, []);

  useEffect(() => {
    const loadLibrary = async () => {
      if (!user) {
        setLibraryIds(new Set());
        return;
      }

      try {
        const data = await api("/library", { method: "GET" });
        setLibraryIds(new Set((data.results || []).map((item) => item.sourceBookId)));
      } catch {
        setLibraryIds(new Set());
      }
    };

    loadLibrary();
  }, [user]);

  const onAddToLibrary = async (book) => {
    if (!user) {
      setMessage("Login required to add books to your library.");
      return;
    }

    try {
      await api("/library", {
        method: "POST",
        body: JSON.stringify({
          sourceBookId: book.id,
          title: book.title,
          authors: book.authors,
          coverUrl: book.coverUrl,
          source: book.source,
          formats: book.formats,
          status: "to-read"
        })
      });
      setLibraryIds((prev) => new Set(prev).add(book.id));
      setSparkleBookIds((prev) => new Set(prev).add(book.id));
      setTimeout(() => {
        setSparkleBookIds((prev) => {
          const next = new Set(prev);
          next.delete(book.id);
          return next;
        });
      }, 1150);
      setMessage(`Added "${book.title}" to your library.`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const onSearch = async (event) => {
    event.preventDefault();
    await runSearch(query, 1, limit);
  };

  const onPrev = async () => {
    if (page <= 1) return;
    await runSearch(query, page - 1, limit);
  };

  const onNext = async () => {
    if (page * limit >= total) return;
    await runSearch(query, page + 1, limit);
  };

  const onLimitChange = async (event) => {
    const nextLimit = Number(event.target.value);
    setLimit(nextLimit);
    await runSearch(query, 1, nextLimit);
  };

  return (
    <section className="card page-shell">
      <h1>Books Search</h1>
      <form onSubmit={onSearch}>
        <div className="books-search-bar">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search through all books"
            className="books-search-input"
          />
          <select
            id="genre-filter"
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="books-genre-select"
          >
            <option value="all">All genres</option>
            {genreOptions.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>
      <p className="reader-note">Source: Gutendex only.</p>

      {message ? <p className="message">{message}</p> : null}
      <p>
        Page {page} | Showing {filteredResults.length} / {results.length} loaded | API total {total}
      </p>
      <div className="books-page-controls">
        <label htmlFor="limit" className="books-limit-control">
          <span>Result limit</span>
          <select id="limit" value={limit} onChange={onLimitChange}>
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={40}>40</option>
          </select>
        </label>
        <button type="button" onClick={onPrev} disabled={loading || page <= 1}>
          Previous
        </button>
        <button type="button" onClick={onNext} disabled={loading || page * limit >= total}>
          Next
        </button>
      </div>

      <div className="row">
        {Object.entries(sourceStatus).map(([name, status]) => (
          <span key={name}>
            {name}:{" "}
            {status.ok === null
              ? "loading..."
              : status.ok
                ? `ok (${status.count})`
                : `error (${status.error})`}
          </span>
        ))}
      </div>

      <ul className="book-list">
        {filteredResults.map((book) => (
          <li key={book.id} className="book-item">
            <div className="book-cover-wrap">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={`${book.title} cover`}
                  className="book-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="book-cover book-cover-fallback">
                  <span>{book.title}</span>
                </div>
              )}
            </div>

            <div className="book-meta">
              <p>
                <strong>{book.title}</strong>
              </p>
              <p>{book.authors?.length ? book.authors.join(", ") : "Unknown author"}</p>
              {book.genres?.length ? <p>{book.genres.slice(0, 2).join(" • ")}</p> : null}
              {/* <p>
                source: {book.source} | score: {book.score}
              </p> */}
              <p className="links book-meta-links">
                {book.formats?.epub ? (
                  <a href={book.formats.epub} target="_blank" rel="noreferrer">
                    Download Book
                  </a>
                ) : null}
                {book.formats?.html ? (
                  <a href={book.formats.html} target="_blank" rel="noreferrer">
                    View in Browser
                  </a>
                ) : null}
                {/* {book.formats?.text ? (
                  <a href={book.formats.text} target="_blank" rel="noreferrer">
                    Text
                  </a>
                ) : null} */}
              </p>
            </div>

            <div className="book-actions">
              <button
                type="button"
                className={`add-library-btn ${sparkleBookIds.has(book.id) ? "star-burst" : ""}`}
                onClick={() => onAddToLibrary(book)}
                disabled={libraryIds.has(book.id)}
              >
                <span className="add-library-btn-label">
                  {libraryIds.has(book.id) ? "In Library" : "Add to Library"}
                </span>
                <span className="add-library-stars" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, idx) => (
                    <span key={`star-${book.id}-${idx}`} className="add-library-star" />
                  ))}
                </span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="books-page-controls books-page-controls-bottom">
        <button type="button" onClick={onPrev} disabled={loading || page <= 1}>
          Previous
        </button>
        <button type="button" onClick={onNext} disabled={loading || page * limit >= total}>
          Next
        </button>
      </div>
    </section>
  );
}
