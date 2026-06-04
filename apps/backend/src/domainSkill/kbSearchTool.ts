import {tool} from "@langchain/core/tools";
import {z} from "zod";
import ragService, {type RagChunkItem} from "../services/ragService.js";
import {RAG_TOP_K} from "../services/serviceConstants.js";
import type {SkillScope} from "./types.js";

const schema = z.object({
    query: z.string().describe("检索用的自然语言查询"),
});

export type KbSearchState = {chunks: RagChunkItem[]; lastQuery: string};

export function createKbSearchTool(scope: SkillScope, state: KbSearchState) {
    return tool(
        async ({query}: z.infer<typeof schema>) => {
            const chunks = await ragService.retrieveRelevantChunks(query, {
                userId: scope.userId,
                knowledgeBaseId: scope.knowledgeBaseId,
                k: RAG_TOP_K,
            });
            state.chunks = chunks;
            state.lastQuery = query;
            const preview = chunks.slice(0, 3).map((c, i) => `[${i + 1}] ${c.content.slice(0, 120)}…`);
            return JSON.stringify({count: chunks.length, preview});
        },
        {
            name: "kb_search",
            description: "在用户知识库中做语义检索，返回相关文档片段数量与摘要。",
            schema,
        }
    );
}
