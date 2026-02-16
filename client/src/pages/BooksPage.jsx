import { useState } from "react";
import { api } from "../lib/api";

export default function BooksPage() {
  const [query, setQuery] = useState("pride and prejudice");
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

  const onSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        q: query,
        sources: selectedSources,
        limit: "20"
      });

      const data = await api(`/books/search?${params.toString()}`, { method: "GET" });
      setResults(data.results || []);
      setMessage(`Found ${data.count} result(s).`);
    } catch (error) {
      setMessage(error.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
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

        <button type="submit" disabled={loading || !selectedSources}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {message ? <p className="message">{message}</p> : null}

      <ul className="book-list">
        {results.map((book) => (
          <li key={book.id} className="book-item">
            <p>
              <strong>{book.title}</strong>
            </p>
            <p>{book.authors?.length ? book.authors.join(", ") : "Unknown author"}</p>
            <p>
              source: {book.source} | score: {book.score}
            </p>
            <p className="links">
              {book.formats?.epub ? (
                <a href={book.formats.epub} target="_blank" rel="noreferrer">
                  EPUB
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
