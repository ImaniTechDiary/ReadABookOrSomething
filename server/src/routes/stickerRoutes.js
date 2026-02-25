import { Router } from "express";
import { searchStickers } from "../controllers/stickerController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/search", searchStickers);

export default router;
