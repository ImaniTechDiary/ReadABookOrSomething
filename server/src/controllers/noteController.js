import { Note } from "../models/Note.js";

export const getNotes = async (_req, res, next) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    return res.status(200).json(notes);
  } catch (error) {
    return next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "`text` is required." });
    }

    const note = await Note.create({ text: text.trim() });
    return res.status(201).json(note);
  } catch (error) {
    return next(error);
  }
};
