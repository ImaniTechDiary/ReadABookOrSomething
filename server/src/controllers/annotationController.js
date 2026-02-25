import mongoose from "mongoose";
import { Annotation } from "../models/Annotation.js";
import { LibraryBook } from "../models/LibraryBook.js";

const sanitizeAnnotation = (doc) => ({
  id: doc._id,
  libraryBookId: doc.libraryBookId,
  format: doc.format,
  chapterId: doc.chapterId || "all",
  type: doc.type,
  startOffset: doc.startOffset,
  endOffset: doc.endOffset,
  selectedText: doc.selectedText || "",
  anchorStartPath: doc.anchorStartPath || "",
  anchorStartOffset: doc.anchorStartOffset || 0,
  anchorEndPath: doc.anchorEndPath || "",
  anchorEndOffset: doc.anchorEndOffset || 0,
  note: doc.note || "",
  noteTitle: doc.noteTitle || "",
  sticker: doc.sticker || "",
  stickerLabel: doc.stickerLabel || "",
  stickerPreviewUrl: doc.stickerPreviewUrl || "",
  stickerLottieUrl: doc.stickerLottieUrl || "",
  color: doc.color || "#fde68a",
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const sanitizeAnnotationWithBook = (doc, book) => ({
  ...sanitizeAnnotation(doc),
  bookTitle: book?.title || "",
  bookAuthors: book?.authors || []
});

const ensureLibraryOwnership = async (libraryBookId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(libraryBookId)) {
    return false;
  }

  const book = await LibraryBook.findOne({ _id: libraryBookId, userId });
  return Boolean(book);
};

export const listAnnotations = async (req, res, next) => {
  try {
    const libraryBookId = (req.query.libraryBookId || "").toString();
    const format = (req.query.format || "text").toString();
    const chapterId = (req.query.chapterId || "").toString();

    if (!libraryBookId) {
      return res.status(400).json({ message: "libraryBookId is required" });
    }

    const ownsBook = await ensureLibraryOwnership(libraryBookId, req.auth.userId);
    if (!ownsBook) {
      return res.status(404).json({ message: "library book not found" });
    }

    const query = {
      userId: req.auth.userId,
      libraryBookId,
      format
    };
    if (chapterId) {
      query.chapterId = chapterId;
    }

    const results = await Annotation.find(query).sort({ startOffset: 1, createdAt: 1 });

    return res.status(200).json({
      count: results.length,
      results: results.map(sanitizeAnnotation)
    });
  } catch (error) {
    return next(error);
  }
};

export const listAnnotationFeed = async (req, res, next) => {
  try {
    const libraryBookId = (req.query.libraryBookId || "").toString();
    const type = (req.query.type || "").toString().trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

    if (libraryBookId) {
      const ownsBook = await ensureLibraryOwnership(libraryBookId, req.auth.userId);
      if (!ownsBook) {
        return res.status(404).json({ message: "library book not found" });
      }
    }

    if (type && !["highlight", "note", "sticker"].includes(type)) {
      return res.status(400).json({ message: "invalid annotation type" });
    }

    const query = { userId: req.auth.userId };
    if (libraryBookId) query.libraryBookId = libraryBookId;
    if (type) query.type = type;

    const annotations = await Annotation.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit);

    const bookIds = [...new Set(annotations.map((item) => String(item.libraryBookId)))];
    const books = await LibraryBook.find({
      _id: { $in: bookIds },
      userId: req.auth.userId
    }).select("_id title authors");

    const booksById = new Map(books.map((book) => [String(book._id), book]));

    return res.status(200).json({
      count: annotations.length,
      results: annotations.map((annotation) =>
        sanitizeAnnotationWithBook(annotation, booksById.get(String(annotation.libraryBookId)))
      )
    });
  } catch (error) {
    return next(error);
  }
};

export const createAnnotation = async (req, res, next) => {
  try {
    const {
      libraryBookId,
      format = "text",
      chapterId = "all",
      type,
      startOffset = 0,
      endOffset = 0,
      selectedText = "",
      anchorStartPath = "",
      anchorStartOffset = 0,
      anchorEndPath = "",
      anchorEndOffset = 0,
      note = "",
      noteTitle = "",
      sticker = "",
      stickerLabel = "",
      stickerPreviewUrl = "",
      stickerLottieUrl = "",
      color = "#fde68a"
    } = req.body;

    if (!libraryBookId || !type) {
      return res.status(400).json({ message: "libraryBookId and type are required" });
    }

    const ownsBook = await ensureLibraryOwnership(libraryBookId, req.auth.userId);
    if (!ownsBook) {
      return res.status(404).json({ message: "library book not found" });
    }

    if (!["highlight", "note", "sticker"].includes(type)) {
      return res.status(400).json({ message: "invalid annotation type" });
    }

    const annotation = await Annotation.create({
      userId: req.auth.userId,
      libraryBookId,
      format,
      chapterId,
      type,
      startOffset,
      endOffset,
      selectedText,
      anchorStartPath,
      anchorStartOffset,
      anchorEndPath,
      anchorEndOffset,
      note,
      noteTitle,
      sticker,
      stickerLabel,
      stickerPreviewUrl,
      stickerLottieUrl,
      color
    });

    return res.status(201).json({ annotation: sanitizeAnnotation(annotation) });
  } catch (error) {
    return next(error);
  }
};

export const updateAnnotation = async (req, res, next) => {
  try {
    const annotation = await Annotation.findOne({
      _id: req.params.id,
      userId: req.auth.userId
    });

    if (!annotation) {
      return res.status(404).json({ message: "annotation not found" });
    }

    const allowedFields = [
      "note",
      "sticker",
      "stickerLabel",
      "stickerPreviewUrl",
      "stickerLottieUrl",
      "color",
      "type",
      "chapterId",
      "anchorStartPath",
      "anchorStartOffset",
      "anchorEndPath",
      "anchorEndOffset",
      "noteTitle"
    ];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        annotation[field] = req.body[field];
      }
    }

    await annotation.save();

    return res.status(200).json({ annotation: sanitizeAnnotation(annotation) });
  } catch (error) {
    return next(error);
  }
};

export const deleteAnnotation = async (req, res, next) => {
  try {
    const annotation = await Annotation.findOneAndDelete({
      _id: req.params.id,
      userId: req.auth.userId
    });

    if (!annotation) {
      return res.status(404).json({ message: "annotation not found" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};
