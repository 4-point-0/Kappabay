import express, { Request } from "express";
import { prisma } from "../db";
import {
  PROMPT_ACCEPTED_PARAMS,
  formatPaginatedResponse,
  parsePaginationForQuery,
  parseWhereStatement,
  getLatestPrompts,
  getPromptsByCreator,
  getPromptByObjectId,
} from "./api-queries";

export const router = express.Router();

/**
 * Get prompts with filtering
 */
router.get("/", async (req: Request, res: any) => {
  try {
    const pagination = parsePaginationForQuery(req.query);
    const where = parseWhereStatement(req.query, PROMPT_ACCEPTED_PARAMS);

    const prompts = await prisma.prompt.findMany({
      where,
      ...pagination,
    });

    return res.json(formatPaginatedResponse(prompts));
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: (e as Error).message });
  }
});

/**
 * Get a specific prompt by objectId
 */
router.get("/:objectId", async (req: Request, res: any) => {
  try {
    const { objectId } = req.params;
    const prompt = await getPromptByObjectId(prisma, objectId);

    if (!prompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    return res.json(prompt);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: (e as Error).message });
  }
});

/**
 * Get prompts by creator address
 */
router.get("/creator/:address", async (req: Request, res: any) => {
  try {
    const { address } = req.params;
    const pagination = parsePaginationForQuery(req.query);

    const prompts = await getPromptsByCreator(prisma, address, pagination);

    return res.json(formatPaginatedResponse(prompts));
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: (e as Error).message });
  }
});

/**
 * Get latest prompts
 */
router.get("/latest", async (req: Request, res: any) => {
  try {
    const pagination = parsePaginationForQuery(req.query);

    const prompts = await getLatestPrompts(prisma, pagination);

    return res.json(formatPaginatedResponse(prompts));
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: (e as Error).message });
  }
});

export default router;
