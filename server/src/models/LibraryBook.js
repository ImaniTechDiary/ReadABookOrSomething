import mongoose from "mongoose";

const libraryBookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    sourceBookId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    authors: {
      type: [String],
      default: []
    },
    coverUrl: {
      type: String,
      default: null
    },
    source: {
      type: String,
      enum: ["gutendex", "standardebooks", "wikisource"],
      required: true
    },
    formats: {
      epub: { type: String, default: null },
      html: { type: String, default: null },
      text: { type: String, default: null }
    },
    status: {
      type: String,
      enum: ["to-read", "reading", "done"],
      default: "to-read"
    }
  },
  { timestamps: true }
);

libraryBookSchema.index({ userId: 1, sourceBookId: 1 }, { unique: true });

export const LibraryBook = mongoose.model("LibraryBook", libraryBookSchema);

