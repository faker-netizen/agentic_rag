import express from "express";
import {handleRagQuery} from "./ragQueryHandler.js";

const router = express.Router();

/** POST /api/rag/query  { query, knowledgeBaseId } — SSE：sources|token|error|done */
router.post("/query", (req, res) => {
    void handleRagQuery(req, res);
});

export default router;
