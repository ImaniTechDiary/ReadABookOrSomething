import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

const normalizeHexColor = (value, fallback = "#fde68a") => {
  const candidate = (value || "").trim();
  return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(candidate) ? candidate : fallback;
};

export default function NotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editModal, setEditModal] = useState({ open: false, itemId: null, type: "note" });
  const [deleteModal, setDeleteModal] = useState({ open: false, itemId: null });
  const [editForm, setEditForm] = useState({
    title: "",
    note: "",
    sticker: "",
    color: "#fde68a"
  });

  const bookId = searchParams.get("bookId") || "";
  const type = searchParams.get("type") || "note";

  const heading = useMemo(() => {
    if (type === "highlight") return "Highlights";
    if (type === "sticker") return "Stickers";
    if (type === "all") return "All Annotations";
    return "Notes";
  }, [type]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setMessage("");
        const params = new URLSearchParams();
        if (bookId) params.set("libraryBookId", bookId);
        if (type && type !== "all") params.set("type", type);
        params.set("limit", "300");

        const data = await api(`/annotations/feed?${params.toString()}`, { method: "GET" });
        setResults(data.results || []);
      } catch (error) {
        setResults([]);
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [bookId, type]);

  const openEditModal = (item) => {
    setEditForm({
      title: item.noteTitle || "",
      note: item.note || "",
      sticker: item.sticker || "",
      color: normalizeHexColor(item.color, "#fde68a")
    });
    setEditModal({ open: true, itemId: item.id, type: item.type || "note" });
  };

  const closeEditModal = () => {
    setEditModal({ open: false, itemId: null, type: "note" });
  };

  const onSaveEdit = async (event) => {
    event.preventDefault();
    if (!editModal.itemId) return;

    try {
      const payload = {
        color: normalizeHexColor(editForm.color, "#fde68a")
      };

      if (editModal.type === "note") {
        payload.noteTitle = editForm.title;
        payload.note = editForm.note;
      }

      if (editModal.type === "sticker") {
        payload.sticker = editForm.sticker;
      }

      const data = await api(`/annotations/${editModal.itemId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      setResults((prev) =>
        prev.map((item) => (item.id === editModal.itemId ? { ...item, ...data.annotation } : item))
      );
      setMessage("Annotation updated.");
      closeEditModal();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const openDeleteModal = (itemId) => {
    setDeleteModal({ open: true, itemId });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, itemId: null });
  };

  const confirmDelete = async () => {
    if (!deleteModal.itemId) return;
    try {
      await api(`/annotations/${deleteModal.itemId}`, { method: "DELETE" });
      setResults((prev) => prev.filter((item) => item.id !== deleteModal.itemId));
      setMessage("Annotation deleted.");
      closeDeleteModal();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="card page-shell">
      <h1>{heading}</h1>
      <div className="row">
        <label htmlFor="annotations-type">Type</label>
        <select
          id="annotations-type"
          value={type}
          onChange={(e) => {
            const next = new URLSearchParams(searchParams);
            if (e.target.value === "all") next.delete("type");
            else next.set("type", e.target.value);
            setSearchParams(next);
          }}
        >
          <option value="note">Notes</option>
          <option value="highlight">Highlights</option>
          <option value="sticker">Stickers</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? <p>Loading annotations...</p> : null}
      {message ? <p className="message">{message}</p> : null}
      {!loading && results.length === 0 ? <p>No notes to review.</p> : null}

      {results.length > 0 ? (
        <table className="notes-table">
          <thead>
            <tr>
              <th>Book</th>
              <th>Title</th>
              <th>Note</th>
              <th>Excerpt</th>
              <th>Updated</th>
              <th className="notes-actions-head">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item) => (
              <tr key={item.id}>
                <td>{item.bookTitle || "Unknown book"}</td>
                <td>{item.noteTitle || "-"}</td>
                <td>{item.note || "-"}</td>
                <td>{item.selectedText?.slice(0, 100) || "-"}</td>
                <td>{new Date(item.updatedAt || item.createdAt).toLocaleString()}</td>
                <td className="notes-actions-cell">
                  <button
                    type="button"
                    className="notes-action-btn"
                    aria-label="Edit annotation"
                    title="Edit"
                    onClick={() => openEditModal(item)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M4 20h4l10-10-4-4L4 16v4Zm12-13 2 2m-2-2 1-1a1.4 1.4 0 0 1 2 2l-1 1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="notes-action-btn notes-action-btn-danger"
                    aria-label="Delete annotation"
                    title="Delete"
                    onClick={() => openDeleteModal(item.id)}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {editModal.open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal-card" onSubmit={onSaveEdit}>
            <h3>Edit Annotation</h3>

            {editModal.type === "note" ? (
              <>
                <label>
                  Title
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Note title"
                  />
                </label>
                <label>
                  Note
                  <textarea
                    value={editForm.note}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                    rows={6}
                    placeholder="Write your note..."
                  />
                </label>
              </>
            ) : null}

            {editModal.type === "sticker" ? (
              <label>
                Sticker
                <input
                  value={editForm.sticker}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, sticker: e.target.value }))}
                  placeholder="Sticker text or emoji"
                />
              </label>
            ) : null}

            <label className="annotation-color-control">
              Color
              <input
                type="color"
                value={editForm.color}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    color: normalizeHexColor(e.target.value, "#fde68a")
                  }))
                }
              />
            </label>

            <div className="row">
              <button type="submit">Save</button>
              <button type="button" onClick={closeEditModal}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteModal.open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-card-confirm">
            <h3>Delete Annotation</h3>
            <p>This action cannot be undone.</p>
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
