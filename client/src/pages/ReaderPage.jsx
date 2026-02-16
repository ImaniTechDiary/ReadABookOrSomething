import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";

const stripRiskyHtml = (html) =>
  html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");

export default function ReaderPage() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("text/plain");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState("html");

  const availableFormats = useMemo(() => {
    if (!book?.formats) return [];
    return ["html", "text", "epub"].filter((type) => Boolean(book.formats[type]));
  }, [book]);

  useEffect(() => {
    const loadBook = async () => {
      try {
        setLoading(true);
        const data = await api(`/library/${id}`, { method: "GET" });
        setBook(data.book);
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [id]);

  useEffect(() => {
    const fetchContent = async () => {
      if (!book) return;

      const preferred = availableFormats.includes(selectedFormat)
        ? selectedFormat
        : availableFormats[0];

      if (!preferred) {
        setMessage("No readable format available for this book.");
        setContent("");
        return;
      }

      setSelectedFormat(preferred);

      if (preferred === "epub") {
        setMessage("EPUB is available. Open the file via the link below.");
        setContent("");
        return;
      }

      try {
        setLoading(true);
        setMessage("");
        const targetUrl = book.formats[preferred];
        const params = new URLSearchParams({ url: targetUrl });
        const data = await api(`/reader/content?${params.toString()}`, {
          method: "GET"
        });
        setContent(data.content || "");
        setContentType(data.contentType || "text/plain");
      } catch (error) {
        setMessage(error.message);
        setContent("");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [book, selectedFormat]);

  if (!book && loading) {
    return <section className="card">Loading reader...</section>;
  }

  if (!book) {
    return (
      <section className="card">
        <p>{message || "Book not found."}</p>
        <Link to="/library">Back to Library</Link>
      </section>
    );
  }

  return (
    <section className="card reader-card">
      <div className="reader-header">
        <div>
          <h1>{book.title}</h1>
          <p>{book.authors?.length ? book.authors.join(", ") : "Unknown author"}</p>
        </div>
        <Link to="/library">Back to Library</Link>
      </div>

      <div className="row">
        <label htmlFor="format">Format</label>
        <select
          id="format"
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
        >
          {availableFormats.map((format) => (
            <option key={format} value={format}>
              {format}
            </option>
          ))}
        </select>
      </div>

      {book.formats?.epub ? (
        <p>
          EPUB: {" "}
          <a href={book.formats.epub} target="_blank" rel="noreferrer">
            Open/Download EPUB
          </a>
        </p>
      ) : null}

      {message ? <p className="message">{message}</p> : null}

      {selectedFormat === "html" && content ? (
        <iframe
          className="reader-frame"
          title="Book Reader"
          sandbox="allow-same-origin"
          srcDoc={stripRiskyHtml(content)}
        />
      ) : null}

      {selectedFormat === "text" && content ? <pre className="reader-text">{content}</pre> : null}

      {loading ? <p>Loading content...</p> : null}
    </section>
  );
}
