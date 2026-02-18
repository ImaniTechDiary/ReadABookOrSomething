import mongoose from "mongoose";

const annotationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    libraryBookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LibraryBook",
      required: true,
      index: true
    },
    format: {
      type: String,
      enum: ["text", "html"],
      required: true,
      default: "text"
    },
    chapterId: {
      type: String,
      default: "all"
    },
    type: {
      type: String,
      enum: ["highlight", "note", "sticker"],
      required: true
    },
    startOffset: {
      type: Number,
      default: 0
    },
    endOffset: {
      type: Number,
      default: 0
    },
    selectedText: {
      type: String,
      default: ""
    },
    anchorStartPath: {
      type: String,
      default: ""
    },
    anchorStartOffset: {
      type: Number,
      default: 0
    },
    anchorEndPath: {
      type: String,
      default: ""
    },
    anchorEndOffset: {
      type: Number,
      default: 0
    },
    note: {
      type: String,
      default: ""
    },
    noteTitle: {
      type: String,
      default: ""
    },
    sticker: {
      type: String,
      default: ""
    },
    color: {
      type: String,
      default: "#fde68a"
    }
  },
  { timestamps: true }
);

annotationSchema.index({ userId: 1, libraryBookId: 1, format: 1, chapterId: 1 });

export const Annotation = mongoose.model("Annotation", annotationSchema);
