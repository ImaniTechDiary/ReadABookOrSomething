import { Router } from "express";
import {
  addLibraryBook,
  getLibraryBookById,
  listLibraryBooks,
  removeLibraryBook,
  updateLibraryBookStatus
} from "../controllers/libraryController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listLibraryBooks);
router.get("/:id", getLibraryBookById);
router.post("/", addLibraryBook);
router.patch("/:id/status", updateLibraryBookStatus);
router.delete("/:id", removeLibraryBook);

export default router;
