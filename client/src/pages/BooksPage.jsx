import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function BooksPage() {
  const [query, setQuery] = useState("pride and prejudice");
  const [limit, setLimit] = useState(12);
  const [sources, setSources] = useState({
    gutendex: true,
    standardebooks: true,
    wikisource: false
  });
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedSources = Object.entries(sources)
    .filter(([, enabled]) => enabled)
    .map(([source]) => source)
    .join(",");

  const onToggleSource = (name) => {
    setSources((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const runSearch = async (searchQuery, options = {}) => {
    const { initialLoad = false } = options;
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        sources: selectedSources,
        limit: String(limit)
      });

      const data = await api(`/books/search?${params.toString()}`, { method: "GET" });
      setResults(data.results || []);
      setMessage(
        initialLoad
          ? `Loaded ${data.count} starter book(s) from APIs.`
          : `Found ${data.count} result(s).`
      );
    } catch (error) {
      setMessage(error.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedSources) return;
    runSearch("classic literature", { initialLoad: true });
  }, []);

  const onSearch = async (event) => {
    event.preventDefault();
    await runSearch(query);
  };

  return (
    <section className="card">
      <h1>Books Search</h1>
      <form onSubmit={onSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books"
          required
        />

        <div className="row checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={sources.gutendex}
              onChange={() => onToggleSource("gutendex")}
            />
            Gutendex
          </label>
          <label>
            <input
              type="checkbox"
              checked={sources.standardebooks}
              onChange={() => onToggleSource("standardebooks")}
            />
            Standard Ebooks
          </label>
          <label>
            <input
              type="checkbox"
              checked={sources.wikisource}
              onChange={() => onToggleSource("wikisource")}
            />
            Wikisource
          </label>
        </div>

        <div className="row">
          <label htmlFor="limit">Result limit</label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </div>

        <button type="submit" disabled={loading || !selectedSources}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {message ? <p className="message">{message}</p> : null}

      <ul className="book-list">
        {results.map((book) => (
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
              <p>
                source: {book.source} | score: {book.score}
              </p>
            </div>

            <p className="links">
              {book.formats?.epub ? (
                <a href={book.formats.epub} target="_blank" rel="noreferrer">
                  Download Book
                </a>
              ) : null}
              {book.formats?.html ? (
                <a href={book.formats.html} target="_blank" rel="noreferrer">
                  HTML
                </a>
              ) : null}
              {book.formats?.text ? (
                <a href={book.formats.text} target="_blank" rel="noreferrer">
                  Text
                </a>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
