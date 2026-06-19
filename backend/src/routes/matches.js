
import { Router } from "express";
import { createMatchSchema, listMatchesQuerySchema, matchIdParamSchema, updateScoreSchema } from "../validation/matches.js";
import { Match } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import { syncMatchStatus } from "../utils/match-status.js";

export const matchRouter = Router();

const MAX_LIMIT = 100;

/**
 * GET /matches
 */
matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query",
      details: parsed.error.issues,
    });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await Match.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: "Failed to list matches" });
  }
});

/**
 * POST /matches
 */
matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parsed.error.issues,
    });
  }

  const { startTime, endTime, homeScore, awayScore } = parsed.data;

  try {
    const match = await Match.create({
      ...parsed.data,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      homeScore: homeScore ?? 0,
      awayScore: awayScore ?? 0,
      status: getMatchStatus(startTime, endTime),
    });

    // WebSocket broadcast (if exists)
    if (res.app.locals.broadcastMatchCreated) {
      res.app.locals.broadcastMatchCreated(match);
    }

    res.status(201).json({ data: match });
  } catch (e) {
    res.status(500).json({ error: "Failed to create match" });
  }
});

/**
 * PATCH /matches/:id/score
 */
matchRouter.patch("/:id/score", async (req, res) => {
  const paramsParsed = matchIdParamSchema.safeParse(req.params);

  if (!paramsParsed.success) {
    return res.status(400).json({
      error: "Invalid match id",
      details: paramsParsed.error.issues,
    });
  }

  const bodyParsed = updateScoreSchema.safeParse(req.body);

  if (!bodyParsed.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: bodyParsed.error.issues,
    });
  }

  const matchId = paramsParsed.data.id;

  try {
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // Sync status (LIVE/SCHEDULED/FINISHED)
    await syncMatchStatus(match, async (nextStatus) => {
      match.status = nextStatus;
    });

    if (match.status !== "live") {
      return res.status(409).json({ error: "Match is not live" });
    }

    match.homeScore = bodyParsed.data.homeScore;
    match.awayScore = bodyParsed.data.awayScore;

    await match.save();

    if (res.app.locals.broadcastScoreUpdate) {
      res.app.locals.broadcastScoreUpdate(matchId, {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      });
    }

    res.json({ data: match });
  } catch (err) {
    res.status(500).json({ error: "Failed to update score" });
  }
});