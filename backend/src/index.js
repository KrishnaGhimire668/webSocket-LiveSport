import express from "express";
import http from "http";
import dotenv from "dotenv";

import connectDB from "./db/db.js";
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";
import {commentaryRouter} from "./routes/commentary.js";
import cors from "cors";

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  "http://localhost:5173",
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());



//  Routes

app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.use("/matches", matchRouter);
app.use('/matches/:id/commentary', commentaryRouter);



// WebSocket Setup
const { broadcastMatchCreated, broadcastCommentary, broadcastScoreUpdate } =
  attachWebSocketServer(server, { allowedOrigins });

app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;
app.locals.broadcastScoreUpdate = broadcastScoreUpdate;

//   Start Server (DB FIRST)
async function startServer() {
  try {
    console.log("Connecting to MongoDB...");

    await connectDB();

    console.log("🟢 MongoDB Connected");

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`WebSocket running on ws://localhost:${PORT}/ws`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
