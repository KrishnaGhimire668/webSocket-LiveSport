import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./db/db.js";
import { matchRouter } from "./routes/matches.js";
import { commentaryRouter } from "./routes/commentary.js";
import { attachWebSocketServer } from "./ws/server.js";
import { startLiveMatchSimulator } from "./simulator/live-match-simulator.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

/**
 * Normalize origin (VERY IMPORTANT for Render)
 */
const allowedOrigins = new Set([
  process.env.CLIENT_ORIGIN,
  "http://localhost:5173",
  "https://websocket-livesport-front.onrender.com"
].filter(Boolean));

/**
 * CORS CONFIG (production safe)
 */
const corsOptions = {
  origin: function (origin, callback) {
    // allow REST tools like Postman
    if (!origin) return callback(null, true);

    // strict match
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    console.log("❌ Blocked CORS origin:", origin);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
};

// IMPORTANT: apply CORS BEFORE routes
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

/**
 * HEALTH CHECK
 */
app.get("/", (req, res) => {
  res.status(200).send("Server is running...");
});

/**
 * ROUTES
 */
app.use("/matches", matchRouter);
app.use("/matches/:id/commentary", commentaryRouter);

/**
 * WEB SOCKET SETUP
 */
const {
  broadcastMatchCreated,
  broadcastCommentary,
  broadcastScoreUpdate
} = attachWebSocketServer(server, {
  allowedOrigins: Array.from(allowedOrigins)
});

app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;
app.locals.broadcastScoreUpdate = broadcastScoreUpdate;

/**
 * LIVE SIMULATOR
 */
let stopLiveMatchSimulator = null;

async function startServer() {
  try {
    console.log("Connecting to MongoDB...");

    await connectDB();

    console.log("🟢 MongoDB Connected");

    if (process.env.LIVE_SIMULATOR_ENABLED !== "false") {
      stopLiveMatchSimulator = await startLiveMatchSimulator({
        broadcastMatchCreated,
        broadcastCommentary,
        broadcastScoreUpdate
      });
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 WebSocket ready on ws://localhost:${PORT}/ws`);
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();

/**
 * CLEAN SHUTDOWN
 */
function shutdown() {
  console.log("Shutting down server...");

  stopLiveMatchSimulator?.();

  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);