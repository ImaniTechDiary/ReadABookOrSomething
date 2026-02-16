import { LibraryBook } from "../models/LibraryBook.js";

const sanitizeLibraryBook = (doc) => ({
  id: doc._id,
  sourceBookId: doc.sourceBookId,
  title: doc.title,
  authors: doc.authors || [],
  coverUrl: doc.coverUrl || undefined,
  source: doc.source,
  formats: doc.formats || {},
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

export const listLibraryBooks = async (req, res, next) => {
  try {
    const books = await LibraryBook.find({ userId: req.auth.userId }).sort({
      updatedAt: -1
    });

    return res.status(200).json({
      count: books.length,
      results: books.map(sanitizeLibraryBook)
    });
  } catch (error) {
    return next(error);
  }
};

export const getLibraryBookById = async (req, res, next) => {
  try {
    const book = await LibraryBook.findOne({
      _id: req.params.id,
      userId: req.auth.userId
    });

    if (!book) {
      return res.status(404).json({ message: "library book not found" });
    }

    return res.status(200).json({ book: sanitizeLibraryBook(book) });
  } catch (error) {
    return next(error);
  }
};

export const addLibraryBook = async (req, res, next) => {
  try {
    const { sourceBookId, title, authors, coverUrl, source, formats, status } = req.body;

    if (!sourceBookId || !title || !source) {
      return res
        .status(400)
        .json({ message: "sourceBookId, title, and source are required" });
    }

    const payload = {
      userId: req.auth.userId,
      sourceBookId,
      title,
      authors: Array.isArray(authors) ? authors : [],
      coverUrl: coverUrl || null,
      source,
      formats: formats || {},
      status: status || "to-read"
    };

    const book = await LibraryBook.findOneAndUpdate(
      { userId: req.auth.userId, sourceBookId },
      payload,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ book: sanitizeLibraryBook(book) });
  } catch (error) {
    return next(error);
  }
};

export const updateLibraryBookStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["to-read", "reading", "done"].includes(status)) {
      return res.status(400).json({ message: "status must be to-read, reading, or done" });
    }

    const book = await LibraryBook.findOneAndUpdate(
      { _id: req.params.id, userId: req.auth.userId },
      { status },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({ message: "library book not found" });
    }

    return res.status(200).json({ book: sanitizeLibraryBook(book) });
  } catch (error) {
    return next(error);
  }
};

export const removeLibraryBook = async (req, res, next) => {
  try {
    const book = await LibraryBook.findOneAndDelete({
      _id: req.params.id,
      userId: req.auth.userId
    });

    if (!book) {
      return res.status(404).json({ message: "library book not found" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};
