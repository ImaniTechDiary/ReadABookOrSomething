import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const dateLabel = (value) => {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "n/a";
  return date.toLocaleString();
};

export default function HomePage() {
  const { user } = useAuth();
  const [health, setHealth] = useState("checking...");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [books, setBooks] = useState([]);
  const [annotationFeed, setAnnotationFeed] = useState([]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await api("/health", { method: "GET" });
        setHealth(data.ok ? "ok" : "unhealthy");
      } catch {
        setHealth("unreachable");
      }
    };

    checkHealth();
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) return;
      try {
        setLoading(true);
        setMessage("");
        const [libraryData, annotationData] = await Promise.all([
          api("/library", { method: "GET" }),
          api("/annotations/feed?limit=300", { method: "GET" })
        ]);

        setBooks(libraryData.results || []);
        setAnnotationFeed(annotationData.results || []);
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  const totals = useMemo(() => {
    const totalBooks = books.length;
    const toRead = books.filter((book) => book.status === "to-read").length;
    const reading = books.filter((book) => book.status === "reading").length;
    const done = books.filter((book) => book.status === "done").length;

    const sortedByOpened = [...books]
      .filter((book) => Boolean(book.lastOpenedAt))
      .sort((a, b) => new Date(b.lastOpenedAt) - new Date(a.lastOpenedAt));
    const sortedByUpdated = [...books].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const lastOpenedBook = sortedByOpened[0] || sortedByUpdated[0] || null;

    const notes = annotationFeed.filter((item) => item.type === "note");
    const highlights = annotationFeed.filter((item) => item.type === "highlight");
    const stickers = annotationFeed.filter((item) => item.type === "sticker");

    return {
      totalBooks,
      toRead,
      reading,
      done,
      notesCount: notes.length,
      highlightsCount: highlights.length,
      stickersCount: stickers.length,
      lastOpenedBook,
      recentNotes: notes.slice(0, 3)
    };
  }, [books, annotationFeed]);

  if (!user) {
    return (
      <section className="card dashboard-shell">
        <h1>Home</h1>
        <p>API health: {health}</p>
        <p>Login to view your reading dashboard.</p>
        <Link to="/auth" className="button-link">
          Login
        </Link>
      </section>
    );
  }

  return (
    <section className="card dashboard-shell">
      <h1>Dashboard</h1>
      <p>API health: {health}</p>
      {loading ? <p>Loading dashboard...</p> : null}
      {message ? <p className="message">{message}</p> : null}

      <div className="dashboard-grid">
        <article className="dashboard-stat">
          <h3>Total Books</h3>
          <p className="dashboard-value">{totals.totalBooks}</p>
        </article>
        <article className="dashboard-stat">
          <h3>Currently Reading</h3>
          <p className="dashboard-value">{totals.reading}</p>
        </article>
        <article className="dashboard-stat">
          <h3>To Read</h3>
          <p className="dashboard-value">{totals.toRead}</p>
        </article>
        <article className="dashboard-stat">
          <h3>Completed</h3>
          <p className="dashboard-value">{totals.done}</p>
        </article>
      </div>

      <div className="dashboard-grid dashboard-grid-secondary">
        <article className="dashboard-panel">
          <h3>Last Book Opened</h3>
          {totals.lastOpenedBook ? (
            <>
              <p>
                <strong>{totals.lastOpenedBook.title}</strong>
              </p>
              <p>{totals.lastOpenedBook.authors?.join(", ") || "Unknown author"}</p>
              <p>Last opened: {dateLabel(totals.lastOpenedBook.lastOpenedAt)}</p>
              <Link to={`/reader/${totals.lastOpenedBook.id}`}>Resume reading</Link>
            </>
          ) : (
            <p>No book opened yet.</p>
          )}
        </article>

        <article className="dashboard-panel">
          <h3>Annotation Activity</h3>
          <p>Notes: {totals.notesCount}</p>
          <p>Highlights: {totals.highlightsCount}</p>
          <p>Stickers: {totals.stickersCount}</p>
          <Link to="/notes?type=all">View all annotations</Link>
        </article>

        <article className="dashboard-panel">
          <h3>Recent Notes</h3>
          {totals.recentNotes.length === 0 ? <p>No notes to review.</p> : null}
          {totals.recentNotes.map((note) => (
            <div key={note.id} className="annotation-mini-item">
              <p>
                <strong>{note.bookTitle || "Unknown book"}</strong>
              </p>
              <p>{note.noteTitle || "Untitled"}</p>
              <p>{note.note?.slice(0, 120) || "-"}</p>
            </div>
          ))}
          <Link to="/notes?type=note">Go to notes</Link>
        </article>
      </div>
    </section>
  );
}
