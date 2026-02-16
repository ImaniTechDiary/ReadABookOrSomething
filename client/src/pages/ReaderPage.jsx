import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";

const stripRiskyHtml = (html) =>
  html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");

const buildChapterizedHtml = (html) => {
  const safeHtml = stripRiskyHtml(html);

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(safeHtml, "text/html");
    const headings = [...doc.querySelectorAll("h1, h2, h3")].filter((heading) =>
      Boolean(heading.textContent?.trim())
    );

    const chapters = headings.map((heading, index) => {
      const id = heading.id || `chapter-${index + 1}`;
      heading.id = id;
      return {
        id,
        label: heading.textContent.trim().slice(0, 120)
      };
    });

    return {
      html: doc.documentElement.outerHTML,
      chapters
    };
  } catch {
    return {
      html: safeHtml,
      chapters: []
    };
  }
};

export default function ReaderPage() {
  const { id } = useParams();
  const iframeRef = useRef(null);
  const [book, setBook] = useState(null);
  const [content, setContent] = useState("");
  const [renderedHtml, setRenderedHtml] = useState("");
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState("all");
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

  useEffect(() => {
    if (selectedFormat !== "html" || !content) {
      setRenderedHtml("");
      setChapters([]);
      setSelectedChapter("all");
      return;
    }

    const parsed = buildChapterizedHtml(content);
    setRenderedHtml(parsed.html);
    setChapters(parsed.chapters);
    setSelectedChapter("all");
  }, [content, selectedFormat]);

  const jumpToChapter = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    if (selectedChapter === "all") {
      doc.documentElement.scrollTop = 0;
      doc.body.scrollTop = 0;
      return;
    }

    const target = doc.getElementById(selectedChapter);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    jumpToChapter();
  }, [selectedChapter, renderedHtml]);

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

      {selectedFormat === "html" && chapters.length > 0 ? (
        <div className="row">
          <label htmlFor="chapter">Chapter</label>
          <select
            id="chapter"
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
          >
            <option value="all">All Chapters</option>
            {chapters.map((chapter, index) => (
              <option key={chapter.id} value={chapter.id}>
                {index + 1}. {chapter.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {book.formats?.epub ? (
        <p>
          EPUB: {" "}
          <a href={book.formats.epub} target="_blank" rel="noreferrer">
            Open/Download EPUB
          </a>
        </p>
      ) : null}

      {message ? <p className="message">{message}</p> : null}

      {selectedFormat === "html" && renderedHtml ? (
        <iframe
          ref={iframeRef}
          className="reader-frame"
          title="Book Reader"
          sandbox="allow-same-origin"
          srcDoc={renderedHtml}
          onLoad={jumpToChapter}
        />
      ) : null}

      {selectedFormat === "text" && content ? <pre className="reader-text">{content}</pre> : null}

      {loading ? <p>Loading content...</p> : null}
    </section>
  );
}
