import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const STATUS_OPTIONS = ["to-read", "reading", "done"];

export default function LibraryPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadLibrary = async () => {
    try {
      setLoading(true);
      const data = await api("/library", { method: "GET" });
      setBooks(data.results || []);
      setMessage("");
    } catch (error) {
      setBooks([]);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadLibrary();
  }, [user]);

  const onChangeStatus = async (id, status) => {
    try {
      const data = await api(`/library/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });

      setBooks((prev) => prev.map((book) => (book.id === id ? data.book : book)));
      setMessage("Reading status updated.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const onRemove = async (id) => {
    try {
      await api(`/library/${id}`, { method: "DELETE" });
      setBooks((prev) => prev.filter((book) => book.id !== id));
      setMessage("Book removed from library.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="card">
      <h1>My Library</h1>
      {loading ? <p>Loading library...</p> : null}
      {message ? <p className="message">{message}</p> : null}

      {!loading && books.length === 0 ? <p>No saved books yet.</p> : null}

      <ul className="library-list">
        {books.map((book) => (
          <li key={book.id} className="library-item">
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={`${book.title} cover`} className="library-cover" />
            ) : (
              <div className="library-cover library-cover-fallback">No cover</div>
            )}

            <div>
              <p>
                <strong>{book.title}</strong>
              </p>
              <p>{book.authors?.length ? book.authors.join(", ") : "Unknown author"}</p>
              <p>source: {book.source}</p>
            </div>

            <div className="library-actions">
              <Link className="button-link" to={`/reader/${book.id}`}>
                Read
              </Link>
              <select
                value={book.status}
                onChange={(e) => onChangeStatus(book.id, e.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => onRemove(book.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
