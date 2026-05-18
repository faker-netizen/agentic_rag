import http from "@/service/request.ts";

export type RagSource = {id: number; title: string};

export type RagQueryResult = {
    answer: string;
    sources: RagSource[];
};

/** POST /api/rag/query — 走后端 LangGraph 检索 + 生成（需登录） */
export async function queryRag(params: {query: string; knowledgeBaseId: number}): Promise<RagQueryResult> {
    const res = await http.post<
        {success: boolean; answer: string; sources: RagSource[]},
        {query: string; knowledgeBaseId: number}
    >("/api/rag/query", {
        query: params.query.trim(),
        knowledgeBaseId: params.knowledgeBaseId,
    });
    return {
        answer: res.answer ?? "",
        sources: Array.isArray(res.sources) ? res.sources : [],
    };
}
