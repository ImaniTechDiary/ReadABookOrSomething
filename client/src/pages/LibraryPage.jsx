import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import blackBookIcon from "../images/BlackBookIcon.png";

const STATUS_OPTIONS = ["to-read", "reading", "done"];

export default function LibraryPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, title: "" });

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
    if (!deleteModal.id) return;
    await onRemove(deleteModal.id);
    closeDeleteModal();
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
              <Link className="button-link library-read-btn" to={`/reader/${book.id}`}>
                <span className="library-read-btn-text">Read</span>
                <img src={blackBookIcon} alt="" className="library-read-btn-icon" />
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

      {deleteModal.open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-card-confirm">
            <h3>Delete Book</h3>
            <p>
              Remove <strong>{deleteModal.title}</strong> from your library?
            </p>
            <div className="row">
              <button type="button" className="confirm-delete-btn" onClick={confirmDelete}>
                Delete
              </button>
              <button type="button" className="cancel-delete-btn" onClick={closeDeleteModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
