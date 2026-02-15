import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

export default function App() {
  const [health, setHealth] = useState("checking...");
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const isDisabled = useMemo(() => !text.trim() || loading, [text, loading]);

  const loadNotes = async () => {
    const response = await fetch(`${API_BASE_URL}/notes`);
    if (!response.ok) throw new Error("Failed to load notes.");
    const data = await response.json();
    setNotes(data);
  };

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        setHealth(data.status);
      } catch {
        setHealth("unreachable");
      }
    };

    checkHealth();
    loadNotes().catch(() => {
      setNotes([]);
    });
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (isDisabled) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error("Failed to create note.");

      setText("");
      await loadNotes();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <h1>MERN Skeleton</h1>
      <p>API health: {health}</p>

      <form onSubmit={onSubmit} className="note-form">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note"
          maxLength={500}
        />
        <button type="submit" disabled={isDisabled}>
          {loading ? "Saving..." : "Add"}
        </button>
      </form>

      <ul className="note-list">
        {notes.length === 0 ? <li>No notes yet.</li> : null}
        {notes.map((note) => (
          <li key={note._id}>{note.text}</li>
        ))}
      </ul>
    </main>
  );
}
