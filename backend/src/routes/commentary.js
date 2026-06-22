import { Router } from "express";

import { matchIdParamSchema } from "../validation/matches.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";

import { Commentary } from "../db/schema.js";

const MAX_LIMIT = 100;

export const commentaryRouter = Router({ mergeParams: true });

// GET COMMENTARY
commentaryRouter.get("/", async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    return res.status(400).json({
      error: "Invalid match ID",
      details: paramsResult.error.issues,
    });
  }

  const queryResult = listCommentaryQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: queryResult.error.issues,
    });
  }

  try {
    const { id: matchId } = paramsResult.data;
    const limit = Math.min(queryResult.data.limit || 10, MAX_LIMIT);

    const results = await Commentary.find({ matchId })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      data: results,
    });
  } catch (error) {
    console.error("Failed to fetch commentary:", error);

    res.status(500).json({
      error: "Failed to fetch commentary",
    });
  }
});

// CREATE COMMENTARY

commentaryRouter.post("/", async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    return res.status(400).json({
      error: "Invalid match ID",
      details: paramsResult.error.issues,
    });
  }

  const bodyResult = createCommentarySchema.safeParse(req.body);

  if (!bodyResult.success) {
    return res.status(400).json({
      error: "Invalid commentary payload",
      details: bodyResult.error.issues,
    });
  }

  try {
    const result = await Commentary.create({
      matchId: paramsResult.data.id,
      ...bodyResult.data,
    });

    if (res.app.locals.broadcastCommentary) {
      res.app.locals.broadcastCommentary(
        result.matchId,
        result
      );
    }

    res.status(201).json({
      data: result,
    });
  } catch (error) {
    console.error("Failed to create commentary:", error);

    res.status(500).json({
      error: "Failed to create commentary",
    });
  }
});