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

const buildTextSegments = (text, annotations) => {
  const normalized = [...annotations]
    .filter((item) => Number.isInteger(item.startOffset) && Number.isInteger(item.endOffset))
    .filter((item) => item.startOffset >= 0 && item.endOffset > item.startOffset)
    .sort((a, b) => a.startOffset - b.startOffset);

  const segments = [];
  let cursor = 0;

  for (const annotation of normalized) {
    if (annotation.startOffset < cursor) continue;

    if (annotation.startOffset > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, annotation.startOffset) });
    }

    segments.push({
      kind: "annotation",
      annotation,
      text: text.slice(annotation.startOffset, annotation.endOffset)
    });

    cursor = annotation.endOffset;
  }

  if (cursor < text.length) {
    segments.push({ kind: "text", text: text.slice(cursor) });
  }

  return segments;
};

const getSelectionRangeForText = (containerElement) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!containerElement.contains(range.startContainer) || !containerElement.contains(range.endContainer)) {
    return null;
  }

  const startRange = document.createRange();
  startRange.selectNodeContents(containerElement);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = document.createRange();
  endRange.selectNodeContents(containerElement);
  endRange.setEnd(range.endContainer, range.endOffset);

  const startOffset = startRange.toString().length;
  const endOffset = endRange.toString().length;

  if (endOffset <= startOffset) return null;

  return {
    format: "text",
    chapterId: "all",
    startOffset,
    endOffset,
    selectedText: selection.toString().trim()
  };
};

const buildNodePath = (rootNode, targetNode) => {
  const path = [];
  let current = targetNode;

  while (current && current !== rootNode) {
    const parent = current.parentNode;
    if (!parent) return "";

    const index = Array.prototype.indexOf.call(parent.childNodes, current);
    if (index < 0) return "";

    path.push(index);
    current = parent;
  }

  return path.reverse().join(".");
};

const resolveNodePath = (rootNode, path) => {
  if (!path) return null;
  const indexes = path.split(".").map((item) => Number(item));
  let current = rootNode;

  for (const index of indexes) {
    if (!current?.childNodes?.[index]) return null;
    current = current.childNodes[index];
  }

  return current;
};

const unwrapAnnotationMarks = (doc) => {
  const marks = [...doc.querySelectorAll("mark[data-annotation-id]")];
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  }
};

export default function ReaderPage() {
  const { id } = useParams();
  const iframeRef = useRef(null);
  const textReaderRef = useRef(null);

  const [book, setBook] = useState(null);
  const [content, setContent] = useState("");
  const [renderedHtml, setRenderedHtml] = useState("");
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState("all");
  const [contentType, setContentType] = useState("text/plain");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState("html");

  const [annotations, setAnnotations] = useState([]);
  const [selectionRange, setSelectionRange] = useState(null);

  const availableFormats = useMemo(() => {
    if (!book?.formats) return [];
    return ["html", "text", "epub"].filter((type) => Boolean(book.formats[type]));
  }, [book]);

  const textSegments = useMemo(() => buildTextSegments(content, annotations), [content, annotations]);

  const loadAnnotations = async () => {
    if (!book || selectedFormat === "epub") {
      setAnnotations([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        libraryBookId: book.id,
        format: selectedFormat
      });

      if (selectedFormat === "html" && selectedChapter !== "all") {
        params.set("chapterId", selectedChapter);
      }

      const data = await api(`/annotations?${params.toString()}`, { method: "GET" });
      setAnnotations(data.results || []);
    } catch (error) {
      setMessage(error.message);
      setAnnotations([]);
    }
  };

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
      setSelectionRange(null);

      if (preferred === "epub") {
        setMessage("EPUB is available. Open the file via the link below.");
        setContent("");
        setAnnotations([]);
        return;
      }

      try {
        setLoading(true);
        setMessage("");
        const params = new URLSearchParams({ url: book.formats[preferred] });
        const data = await api(`/reader/content?${params.toString()}`, { method: "GET" });
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

  useEffect(() => {
    loadAnnotations();
  }, [book, selectedFormat, selectedChapter]);

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

  const applyHtmlAnnotations = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || selectedFormat !== "html") return;

    unwrapAnnotationMarks(doc);

    const htmlAnnotations = annotations.filter((item) => item.format === "html");
    for (const annotation of htmlAnnotations) {
      const root = doc.body;
      const startNode = resolveNodePath(root, annotation.anchorStartPath);
      const endNode = resolveNodePath(root, annotation.anchorEndPath);
      if (!startNode || !endNode) continue;

      try {
        const range = doc.createRange();
        range.setStart(startNode, annotation.anchorStartOffset || 0);
        range.setEnd(endNode, annotation.anchorEndOffset || 0);

        if (range.collapsed) continue;

        const mark = doc.createElement("mark");
        mark.dataset.annotationId = annotation.id;
        mark.style.backgroundColor = annotation.color || "#fde68a";
        mark.style.borderRadius = "3px";
        mark.style.padding = "0 1px";
        mark.title = annotation.note || annotation.sticker || annotation.selectedText || "Annotation";

        const fragment = range.extractContents();
        mark.appendChild(fragment);

        if (annotation.type === "sticker") {
          const emoji = doc.createTextNode(` ${annotation.sticker || "📌"}`);
          mark.appendChild(emoji);
        }

        range.insertNode(mark);
      } catch {
        // Ignore malformed anchors for a given source document.
      }
    }
  };

  useEffect(() => {
    if (selectedFormat !== "html" || !renderedHtml) return;
    jumpToChapter();
    applyHtmlAnnotations();
  }, [selectedChapter, annotations, renderedHtml, selectedFormat]);

  const onTextSelection = () => {
    if (selectedFormat !== "text" || !textReaderRef.current) {
      setSelectionRange(null);
      return;
    }

    const selection = getSelectionRangeForText(textReaderRef.current);
    setSelectionRange(selection);
  };

  useEffect(() => {
    if (selectedFormat !== "html") return;

    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const handleIframeSelection = () => {
      const selection = iframeRef.current?.contentWindow?.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setSelectionRange(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!doc.body.contains(range.startContainer) || !doc.body.contains(range.endContainer)) {
        setSelectionRange(null);
        return;
      }

      const startPath = buildNodePath(doc.body, range.startContainer);
      const endPath = buildNodePath(doc.body, range.endContainer);
      const selectedText = selection.toString().trim();
      if (!startPath || !endPath || !selectedText) {
        setSelectionRange(null);
        return;
      }

      setSelectionRange({
        format: "html",
        chapterId: selectedChapter,
        startOffset: 0,
        endOffset: 0,
        selectedText,
        anchorStartPath: startPath,
        anchorStartOffset: range.startOffset,
        anchorEndPath: endPath,
        anchorEndOffset: range.endOffset
      });
    };

    doc.addEventListener("mouseup", handleIframeSelection);
    doc.addEventListener("keyup", handleIframeSelection);

    return () => {
      doc.removeEventListener("mouseup", handleIframeSelection);
      doc.removeEventListener("keyup", handleIframeSelection);
    };
  }, [selectedFormat, renderedHtml, selectedChapter]);

  const createAnnotation = async (type) => {
    if (!book || !selectionRange) return;

    let note = "";
    let sticker = "";
    let color = "#fde68a";

    if (type === "note") {
      note = window.prompt("Enter note text", "") || "";
      if (!note.trim()) return;
      color = "#bfdbfe";
    }

    if (type === "sticker") {
      sticker = window.prompt("Sticker (emoji)", "📌") || "";
      if (!sticker.trim()) return;
      color = "#fecaca";
    }

    try {
      const payload = {
        libraryBookId: book.id,
        format: selectionRange.format,
        chapterId: selectionRange.chapterId || "all",
        type,
        startOffset: selectionRange.startOffset || 0,
        endOffset: selectionRange.endOffset || 0,
        selectedText: selectionRange.selectedText,
        anchorStartPath: selectionRange.anchorStartPath || "",
        anchorStartOffset: selectionRange.anchorStartOffset || 0,
        anchorEndPath: selectionRange.anchorEndPath || "",
        anchorEndOffset: selectionRange.anchorEndOffset || 0,
        note,
        sticker,
        color
      };

      const data = await api("/annotations", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setAnnotations((prev) => [...prev, data.annotation]);
      setSelectionRange(null);
      window.getSelection()?.removeAllRanges();
      iframeRef.current?.contentWindow?.getSelection()?.removeAllRanges();
      setMessage(`${type} added.`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const onDeleteAnnotation = async (annotationId) => {
    try {
      await api(`/annotations/${annotationId}`, { method: "DELETE" });
      setAnnotations((prev) => prev.filter((item) => item.id !== annotationId));
      setMessage("Annotation deleted.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const onEditAnnotation = async (annotation) => {
    const payload = {};

    if (annotation.type === "note") {
      const next = window.prompt("Edit note", annotation.note || "");
      if (next === null) return;
      payload.note = next;
    }

    if (annotation.type === "sticker") {
      const next = window.prompt("Edit sticker", annotation.sticker || "📌");
      if (next === null) return;
      payload.sticker = next;
    }

    const nextColor = window.prompt("Color (hex)", annotation.color || "#fde68a");
    if (nextColor !== null && nextColor.trim()) {
      payload.color = nextColor.trim();
    }

    if (!Object.keys(payload).length) return;

    try {
      const data = await api(`/annotations/${annotation.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      setAnnotations((prev) =>
        prev.map((item) => (item.id === annotation.id ? data.annotation : item))
      );
      setMessage("Annotation updated.");
    } catch (error) {
      setMessage(error.message);
    }
  };

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
          EPUB:{" "}
          <a href={book.formats.epub} target="_blank" rel="noreferrer">
            Open/Download EPUB
          </a>
        </p>
      ) : null}

      {message ? <p className="message">{message}</p> : null}

      {(selectedFormat === "html" || selectedFormat === "text") && (
        <div className="selection-bar">
          <span>
            {selectionRange
              ? `Selected: "${selectionRange.selectedText.slice(0, 80)}${
                  selectionRange.selectedText.length > 80 ? "..." : ""
                }"`
              : "Select text to annotate."}
          </span>
          <div className="row">
            <button
              type="button"
              disabled={!selectionRange}
              onClick={() => createAnnotation("highlight")}
            >
              Highlight
            </button>
            <button type="button" disabled={!selectionRange} onClick={() => createAnnotation("note")}>
              Note
            </button>
            <button
              type="button"
              disabled={!selectionRange}
              onClick={() => createAnnotation("sticker")}
            >
              Sticker
            </button>
          </div>
        </div>
      )}

      {selectedFormat === "html" && renderedHtml ? (
        <div className="reader-annotation-layout">
          <iframe
            ref={iframeRef}
            className="reader-frame"
            title="Book Reader"
            sandbox="allow-same-origin"
            srcDoc={renderedHtml}
            onLoad={() => {
              jumpToChapter();
              applyHtmlAnnotations();
            }}
          />
          <aside className="annotation-panel">
            <h3>Annotations</h3>
            {annotations.length === 0 ? <p>No annotations yet.</p> : null}
            <ul>
              {annotations.map((annotation) => (
                <li key={annotation.id}>
                  <p>
                    <strong>{annotation.type}</strong>
                  </p>
                  <p>{annotation.selectedText?.slice(0, 120)}</p>
                  {annotation.note ? <p>Note: {annotation.note}</p> : null}
                  {annotation.sticker ? <p>Sticker: {annotation.sticker}</p> : null}
                  <div className="row">
                    <button type="button" onClick={() => onEditAnnotation(annotation)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onDeleteAnnotation(annotation.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}

      {selectedFormat === "text" && content ? (
        <div className="reader-annotation-layout">
          <div
            ref={textReaderRef}
            className="reader-text"
            onMouseUp={onTextSelection}
            onKeyUp={onTextSelection}
          >
            {textSegments.map((segment, index) => {
              if (segment.kind === "text") {
                return <span key={`txt-${index}`}>{segment.text}</span>;
              }

              const annotation = segment.annotation;
              return (
                <mark
                  key={annotation.id}
                  className={`annotation annotation-${annotation.type}`}
                  style={{ backgroundColor: annotation.color || "#fde68a" }}
                  title={annotation.note || annotation.sticker || annotation.selectedText}
                >
                  {segment.text}
                  {annotation.type === "sticker" ? ` ${annotation.sticker || "📌"}` : ""}
                </mark>
              );
            })}
          </div>

          <aside className="annotation-panel">
            <h3>Annotations</h3>
            {annotations.length === 0 ? <p>No annotations yet.</p> : null}
            <ul>
              {annotations.map((annotation) => (
                <li key={annotation.id}>
                  <p>
                    <strong>{annotation.type}</strong> ({annotation.startOffset}-{annotation.endOffset})
                  </p>
                  <p>{annotation.selectedText?.slice(0, 120)}</p>
                  {annotation.note ? <p>Note: {annotation.note}</p> : null}
                  {annotation.sticker ? <p>Sticker: {annotation.sticker}</p> : null}
                  <div className="row">
                    <button type="button" onClick={() => onEditAnnotation(annotation)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onDeleteAnnotation(annotation.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}

      {loading ? <p>Loading content...</p> : null}
      {contentType ? <p className="reader-note">Content-Type: {contentType}</p> : null}
    </section>
  );
}
