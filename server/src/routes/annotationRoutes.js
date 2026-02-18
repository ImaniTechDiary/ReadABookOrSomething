import { Router } from "express";
import {
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  updateAnnotation
} from "../controllers/annotationController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listAnnotations);
router.post("/", createAnnotation);
router.patch("/:id", updateAnnotation);
router.delete("/:id", deleteAnnotation);

export default router;

