import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import apiRoutes from "./routes/index.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5001;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: clientUrl }));
app.use(express.json());

app.use("/api", apiRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

const start = async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
