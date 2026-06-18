import express from "express";
import http from "http";
import dotenv from "dotenv";

import connectDB from "./db/db.js";
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(express.json());

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.use("/matches", matchRouter);

/*
|--------------------------------------------------------------------------
| WebSocket Setup
|--------------------------------------------------------------------------
*/
const { broadcastMatchCreated, broadcastCommentary } =
  attachWebSocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

/*
|--------------------------------------------------------------------------
| Start Server (DB FIRST)
|--------------------------------------------------------------------------
*/
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