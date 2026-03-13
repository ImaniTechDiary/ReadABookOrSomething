import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import blackBookIcon from "../images/BlackBookIcon.png";

const STATUS_OPTIONS = ["to-read", "reading", "done"];
const STATUS_LABELS = {
  "to-read": "To Read",
  reading: "Currently Reading",
  done: "Completed"
};

const BookList = ({ books, onChangeStatus, openDeleteModal }) => (
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
          <Link className="button-link library-read-btn" to={`/reader/${book.id}`}>
            <span className="library-read-btn-text">Read</span>
            <img src={blackBookIcon} alt="" className="library-read-btn-icon" />
          </Link>
          <select value={book.status} onChange={(e) => onChangeStatus(book.id, e.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="library-remove-btn"
            onClick={() => openDeleteModal(book)}
            aria-label="Remove book"
            title="Remove"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3 6h18M8 6V4h8v2m-8 0 1 13h6l1-13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </li>
    ))}
  </ul>
);

export default function LibraryPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, title: "" });
  const [deleting, setDeleting] = useState(false);

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

  const openDeleteModal = (book) => {
    setDeleteModal({ open: true, id: book.id, title: book.title });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, id: null, title: "" });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id || deleting) return;
    try {
      setDeleting(true);
      setMessage("Deleting book...");
      await onRemove(deleteModal.id);
      closeDeleteModal();
    } finally {
      setDeleting(false);
    }
  };

  const filteredBooks = books.filter((book) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const title = (book.title || "").toLowerCase();
    const authors = (book.authors || []).join(" ").toLowerCase();
    return title.includes(q) || authors.includes(q);
  });

  const focusStatus = STATUS_OPTIONS.includes(searchParams.get("focus"))
    ? searchParams.get("focus")
    : "";
  const curatedBooks = useMemo(() => {
    if (!focusStatus) return [];
    return filteredBooks.filter((book) => book.status === focusStatus);
  }, [filteredBooks, focusStatus]);
  const focusLabel = focusStatus ? STATUS_LABELS[focusStatus] : "";

  const setFocusStatus = (status) => {
    const nextParams = new URLSearchParams(searchParams);
    if (status) {
      nextParams.set("focus", status);
    } else {
      nextParams.delete("focus");
    }
    setSearchParams(nextParams);
  };

  return (
    <section className="card page-shell">
      <div className="library-header">
        <h1>My Library</h1>
        <input
          className="library-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by book or author"
        />
      </div>
      {loading ? <p>Loading library...</p> : null}
      {message ? <p className="message">{message}</p> : null}

      {!loading && books.length === 0 ? <p>No saved books yet.</p> : null}
      {!loading && books.length > 0 && filteredBooks.length === 0 ? <p>No matches found.</p> : null}
      {!loading && focusStatus ? (
        <section className="library-focus-panel">
          <div className="library-focus-header">
            <div>
              <p className="library-focus-eyebrow">Curated Shelf</p>
              <h2>{focusLabel}</h2>
              <p>
                Showing {curatedBooks.length} {curatedBooks.length === 1 ? "book" : "books"} from
                your library in this status.
              </p>
            </div>
            <div className="library-focus-actions">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={status === focusStatus ? "library-chip active" : "library-chip"}
                  onClick={() => setFocusStatus(status)}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
              <button type="button" className="library-chip" onClick={() => setFocusStatus("")}>
                View all
              </button>
            </div>
          </div>
          {curatedBooks.length === 0 ? (
            <p>No books match this shelf right now.</p>
          ) : (
            <BookList
              books={curatedBooks}
              onChangeStatus={onChangeStatus}
              openDeleteModal={openDeleteModal}
            />
          )}
        </section>
      ) : null}

      {!loading && books.length > 0 ? (
        <section className="library-main-section">
          <div className="library-section-header">
            <h2>All Library Books</h2>
            <p>{filteredBooks.length} shown</p>
          </div>
          <BookList
            books={filteredBooks}
            onChangeStatus={onChangeStatus}
            openDeleteModal={openDeleteModal}
          />
        </section>
      ) : null}

      {deleteModal.open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-card-confirm">
            <h3>Delete Book</h3>
            <p>
              Remove <strong>{deleteModal.title}</strong> from your library?
            </p>
            <div className="row">
              <button
                type="button"
                className="confirm-delete-btn"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                className="cancel-delete-btn"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
