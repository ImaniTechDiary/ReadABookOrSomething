import { Router } from "express";
import noteRoutes from "./noteRoutes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "server" });
});

router.use("/notes", noteRoutes);

export default router;
