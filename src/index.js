import "dotenv/config";
import express from "express";

import connectDB from "./db/db.js";
import { matchRouter } from "./routes/matches.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Routes
app.use("/matches", matchRouter);

// Health check
app.get("/", (req, res) => {
  res.send("Server is running...");
});

// Start server after DB connection
const startServer = async () => {
  try {
    console.log("Connecting to MongoDB...");

    await connectDB();

    console.log("MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Server failed to start:", err.message);
    process.exit(1);
  }
};

startServer();