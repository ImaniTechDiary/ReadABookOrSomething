import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import apiRoutes from "./routes/index.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 8000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(requestLogger);
app.use(
  cors({
    origin: clientOrigin,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json());

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "CLIENT_ORIGIN"
];

const start = async () => {
  try {
    const missing = requiredEnvVars.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }

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
