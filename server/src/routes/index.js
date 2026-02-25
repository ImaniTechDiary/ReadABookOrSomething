import { Router } from "express";
import authRoutes from "./authRoutes.js";
import bookRoutes from "./bookRoutes.js";
import libraryRoutes from "./libraryRoutes.js";
import readerRoutes from "./readerRoutes.js";
import annotationRoutes from "./annotationRoutes.js";
import stickerRoutes from "./stickerRoutes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

router.use("/auth", authRoutes);
router.use("/books", bookRoutes);
router.use("/library", libraryRoutes);
router.use("/reader", readerRoutes);
router.use("/annotations", annotationRoutes);
router.use("/stickers", stickerRoutes);

export default router;
